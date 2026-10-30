export function authorized(value: string | null, secret: string): boolean {
  const left = new TextEncoder().encode(value ?? "");
  const right = new TextEncoder().encode(secret);
  let difference = left.length ^ right.length;
  for (let i = 0; i < right.length; i++)
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return right.length >= 32 && difference === 0;
}
