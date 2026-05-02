/**
 * Tiny math helpers for the dataviz primitives.
 *
 * No external deps. No allocations beyond the result. Hot paths are kept
 * branch-light so a phone GPU isn't asked to choke on a leaderboard render.
 */

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Map a value from one numeric range to another.
 * Returns `to` if the input range is degenerate.
 */
export function scaleLinear(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin
  const t = (value - inMin) / (inMax - inMin)
  return outMin + t * (outMax - outMin)
}

/** Min of an array. Returns 0 for empty arrays. */
export function minOf(values: readonly number[]): number {
  if (values.length === 0) return 0
  let m = values[0]
  for (let i = 1; i < values.length; i++) if (values[i] < m) m = values[i]
  return m
}

/** Max of an array. Returns 0 for empty arrays. */
export function maxOf(values: readonly number[]): number {
  if (values.length === 0) return 0
  let m = values[0]
  for (let i = 1; i < values.length; i++) if (values[i] > m) m = values[i]
  return m
}

/** Round to a fixed number of decimal places, returning a number. */
export function round(n: number, places = 2): number {
  const k = Math.pow(10, places)
  return Math.round(n * k) / k
}

/**
 * Build an SVG `points` polyline string from an array of [x, y] pairs.
 * Each coord is rounded to 2 decimals to avoid hydration mismatches.
 */
export function pointsToString(points: ReadonlyArray<[number, number]>): string {
  let out = ""
  for (let i = 0; i < points.length; i++) {
    if (i > 0) out += " "
    out += `${round(points[i][0])},${round(points[i][1])}`
  }
  return out
}

/**
 * Build an SVG path `d` string from points using line segments.
 * Useful when you want stroke-dasharray draw-on animations.
 */
export function pointsToPath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return ""
  let d = `M${round(points[0][0])},${round(points[0][1])}`
  for (let i = 1; i < points.length; i++) {
    d += ` L${round(points[i][0])},${round(points[i][1])}`
  }
  return d
}

/**
 * Build a smoothed (Catmull-Rom-ish via Bezier) path from an array of points.
 * Looks softer for sparklines without the cost of a real curve fitter.
 */
export function pointsToSmoothPath(
  points: ReadonlyArray<[number, number]>,
  tension = 0.5,
): string {
  if (points.length < 2) return pointsToPath(points)
  let d = `M${round(points[0][0])},${round(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1[0] + ((p2[0] - p0[0]) * tension) / 6
    const c1y = p1[1] + ((p2[1] - p0[1]) * tension) / 6
    const c2x = p2[0] - ((p3[0] - p1[0]) * tension) / 6
    const c2y = p2[1] - ((p3[1] - p1[1]) * tension) / 6
    d += ` C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p2[0])},${round(p2[1])}`
  }
  return d
}

/** Percentile of `value` within `population` (0..100). */
export function percentileOf(value: number, population: readonly number[]): number {
  if (population.length === 0) return 0
  let below = 0
  for (const p of population) if (p < value) below++
  return Math.round((below / population.length) * 100)
}
