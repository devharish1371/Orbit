import { validPending, type OutboxStore, type PendingText } from './model'
type RecordEnvelope = {
  key: string
  owner: string
  id: string
  stamp: string
  iv: Uint8Array<ArrayBuffer>
  encrypted: ArrayBuffer
}
type Epoch = { stamp: string; clearedAt: number }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('orbit-outbox-v1', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keys')
      request.result
        .createObjectStore('messages', { keyPath: 'key' })
        .createIndex('owner', 'owner')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('OUTBOX_STORAGE_UNAVAILABLE'))
    request.onblocked = () => reject(new Error('OUTBOX_STORAGE_BLOCKED'))
  })
}
function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction, done: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode, { durability: 'strict' })
    let value: T
    tx.oncomplete = () => resolve(value)
    tx.onabort = () => reject(new Error('OUTBOX_STORAGE_FAILED'))
    tx.onerror = () => reject(new Error('OUTBOX_STORAGE_FAILED'))
    try {
      run(tx, (next) => {
        value = next
      })
    } catch {
      tx.abort()
    }
  })
}
export class WebOutboxStore implements OutboxStore {
  private epoch = 0
  private metadata(db: IDBDatabase): Promise<Epoch> {
    return transact<Epoch>(db, ['keys'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('keys'),
        get = store.get('@epoch')
      get.onsuccess = () => {
        const value: Epoch = get.result ?? {
          stamp: crypto.randomUUID(),
          clearedAt: 0,
        }
        if (!get.result) store.put(value, '@epoch')
        done(value)
      }
    })
  }
  private async key(
    db: IDBDatabase,
    owner: string,
    expected: Epoch,
  ): Promise<CryptoKey> {
    const existing = await transact<CryptoKey | undefined>(
      db,
      ['keys'],
      'readonly',
      (tx, done) => {
        const get = tx.objectStore('keys').get(owner)
        get.onsuccess = () => done(get.result)
      },
    )
    if (existing) return existing
    const candidate = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    // Recheck inside the write transaction so concurrent tabs use the same stored key.
    return transact<CryptoKey>(db, ['keys'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('keys'),
        get = store.get(owner)
      get.onsuccess = () => {
        const epoch = store.get('@epoch')
        epoch.onsuccess = () => {
          if (epoch.result?.stamp !== expected.stamp) {
            tx.abort()
            return
          }
          if (get.result) done(get.result)
          else {
            store.add(candidate, owner)
            done(candidate)
          }
        }
      }
    })
  }
  async put(item: PendingText) {
    const epoch = this.epoch
    if (!validPending(item, item.owner))
      throw new Error('INVALID_PENDING_MESSAGE')
    const db = await database()
    try {
      const metadata = await this.metadata(db)
      if (item.queuedAt <= metadata.clearedAt) throw new Error('OUTBOX_CLEARED')
      const key = await this.key(db, item.owner, metadata),
        iv = crypto.getRandomValues(new Uint8Array(12))
      const aad = new TextEncoder().encode(
        item.owner + ':' + item.id + ':' + metadata.stamp,
      )
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: aad },
        key,
        new TextEncoder().encode(JSON.stringify(item)),
      )
      if (epoch !== this.epoch) throw new Error('OUTBOX_CLEARED')
      await transact<void>(db, ['messages', 'keys'], 'readwrite', (tx) => {
        const store = tx.objectStore('messages'),
          current = tx.objectStore('keys').get('@epoch')
        current.onsuccess = () => {
          if (current.result?.stamp !== metadata.stamp) {
            tx.abort()
            return
          }
          const get = store.get(item.owner + ':' + item.id)
          get.onsuccess = () => {
            const count = store.index('owner').count(item.owner)
            count.onsuccess = () => {
              if (!get.result && count.result >= 50) tx.abort()
              else
                store.put({
                  key: item.owner + ':' + item.id,
                  owner: item.owner,
                  id: item.id,
                  stamp: metadata.stamp,
                  iv,
                  encrypted,
                } satisfies RecordEnvelope)
            }
          }
        }
      })
    } finally {
      db.close()
    }
  }
  async list(owner: string) {
    const epoch = this.epoch,
      db = await database()
    try {
      const records = await transact<RecordEnvelope[]>(
        db,
        ['messages'],
        'readonly',
        (tx, done) => {
          const get = tx.objectStore('messages').index('owner').getAll(owner)
          get.onsuccess = () => done(get.result)
        },
      )
      if (!records.length) return []
      const metadata = await this.metadata(db),
        key = await this.key(db, owner, metadata),
        result: PendingText[] = []
      for (const record of records) {
        if (epoch !== this.epoch) return []
        try {
          if (record.stamp !== metadata.stamp) throw new Error('OUTBOX_CLEARED')
          const bytes = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: record.iv,
              additionalData: new TextEncoder().encode(
                owner + ':' + record.id + ':' + record.stamp,
              ),
            },
            key,
            record.encrypted,
          )
          if (epoch !== this.epoch) return []
          const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
          if (
            !validPending(value, owner) ||
            value.id !== record.id ||
            value.expiresAt <= Date.now()
          )
            throw new Error('INVALID_PENDING_MESSAGE')
          result.push(value)
        } catch {
          await this.remove(owner, record.id)
        }
      }
      if ((await this.metadata(db)).stamp !== metadata.stamp) return []
      return result.sort((a, b) => a.queuedAt - b.queuedAt)
    } finally {
      db.close()
    }
  }
  async remove(owner: string, id: string) {
    const db = await database()
    try {
      await transact<void>(db, ['messages'], 'readwrite', (tx) => {
        tx.objectStore('messages').delete(owner + ':' + id)
      })
    } finally {
      db.close()
    }
  }
  async clearAll() {
    this.epoch++
    const db = await database()
    try {
      await transact<void>(db, ['messages', 'keys'], 'readwrite', (tx) => {
        tx.objectStore('messages').clear()
        const keys = tx.objectStore('keys')
        keys.clear()
        keys.put(
          { stamp: crypto.randomUUID(), clearedAt: Date.now() } satisfies Epoch,
          '@epoch',
        )
      })
    } finally {
      db.close()
    }
  }
}
