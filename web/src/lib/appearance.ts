export const accents = [
  { key: 'rose', color: '#FF6B8A' },
  { key: 'violet', color: '#7C5CFF' },
  { key: 'lagoon', color: '#24BCA0' },
  { key: 'gold', color: '#E4AA36' },
] as const
export function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
function rgb(hex: string): number[] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
}
export function blend(hex: string, other: string, weight: number): string {
  const right = rgb(other)
  return (
    '#' +
    rgb(hex)
      .map((value, index) =>
        Math.round(value * (1 - weight) + (right[index] ?? 0) * weight)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
function luminance(hex: string): number {
  const values = rgb(hex).map((value) => {
    const n = value / 255
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  })
  return (
    (values[0] ?? 0) * 0.2126 +
    (values[1] ?? 0) * 0.7152 +
    (values[2] ?? 0) * 0.0722
  )
}
export function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export function accessibleAccent(color: string, light: boolean): string {
  let result = isHex(color) ? color : '#FF6B8A'
  // Allow for the tinted active tab/glass surface, which is darker than pure white.
  const background = light ? '#F0EAF0' : '#22202E'
  for (let step = 0; step < 30 && contrast(result, background) < 4.8; step++)
    result = blend(result, light ? '#111111' : '#FFFFFF', 0.12)
  return result
}
