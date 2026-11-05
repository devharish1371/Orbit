/** Synthetic-only candidate prototype. No sensor subscription, persistence or network path. */
export interface MotionSample {
  ms: number
  acceleration: number
}
export function motionCandidate(samples: readonly MotionSample[]): boolean {
  let low = -1,
    impact = -1,
    still = -1,
    previous = -1
  for (const { ms, acceleration: g } of samples) {
    if (
      !Number.isFinite(ms) ||
      !Number.isFinite(g) ||
      ms < 0 ||
      g < 0 ||
      g > 100 ||
      ms <= previous
    )
      return false
    if (previous >= 0 && ms - previous > 120) {
      low = -1
      impact = -1
      still = -1
    }
    previous = ms
    if (impact >= 0) {
      if (ms - impact > 16000) {
        low = -1
        impact = -1
        still = -1
      } else if (Math.abs(g - 9.81) < 1) {
        if (still < 0) still = ms
        if (ms - still >= 10000) return true
      } else still = -1
    } else if (g < 3) {
      if (low < 0) low = ms
    } else if (low >= 0) {
      if (ms - low >= 150 && ms - low <= 1500 && g > 25) impact = ms
      else if (ms - low > 1500) low = -1
    }
  }
  return false
}
export function syntheticMotion(
  kind: 'still' | 'impact' | 'drop',
): MotionSample[] {
  return Array.from({ length: 701 }, (_, i) => ({
    ms: i * 20,
    acceleration:
      kind === 'still' ? 9.81 : i >= 25 && i < 38 ? 1 : i === 38 ? 32 : 9.81,
  }))
}
