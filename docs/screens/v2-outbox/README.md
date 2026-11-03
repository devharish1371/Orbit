# Text outbox verification — 3 November 2026

`chat-360.png`: actual 360 × 800 browser viewport, disposable two-person fixture.
One text went through the committed text-outbox path, showed Sending, then Sent to Orbit.
After reload the conversation contains exactly one copy. Settled 320/360/412 px layouts
show no horizontal overflow. This image shows the acknowledged state, not an offline queue.

No real partner was contacted, no user network was interrupted and no offline UI was faked.
Real WebCrypto plus fake-indexeddb tests cover persisted reconstruction/tamper/clear races;
physical Android offline/process-death and storage behavior remain deferred for the user's
batch. Native compile/unit/signing results are in DEVLOG.md.
