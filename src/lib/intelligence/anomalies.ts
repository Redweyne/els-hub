/**
 * Anomaly detection — purely client-side derivation, no schema change.
 *
 * Compares a single score against the member's own history of the same
 * event type. We use a z-score against the recent baseline so that big
 * categorical differences (a Massacre day's millions vs a Robbing day's
 * tens-of-thousands) don't poison the comparison.
 *
 * Designed to be cheap to call per-member-per-event and to gracefully say
 * "not enough data" rather than fabricate an anomaly from one or two points.
 */

import type { EventTypeCode } from "@/lib/events/config"

export interface AnomalyInput {
  /** The single score being judged. */
  current: {
    points: number
    eventTypeCode: EventTypeCode | string | null
    /** For GW Daily, the cycle (war/hegemony) — use as a sub-cohort. */
    gwCycle?: "war" | "hegemony" | null
    /** For GW Daily, the day_type — use as a sub-cohort. */
    gwDayType?: string | null
  }
  /**
   * History of the same member's prior scores. Pass at least 3 to get a
   * meaningful signal; we'll match by event type (and GW cycle/day_type
   * when applicable).
   */
  history: ReadonlyArray<{
    points: number
    eventTypeCode: EventTypeCode | string | null
    createdAt: string
    gwCycle?: "war" | "hegemony" | null
    gwDayType?: string | null
  }>
}

export type AnomalyVerdict =
  /** Insufficient history to call anything an anomaly. */
  | { kind: "insufficient" }
  /** Score is well within the member's typical range. */
  | { kind: "normal"; baseline: number; deltaPct: number }
  /** Score is meaningfully above the member's recent baseline. */
  | {
      kind: "above"
      baseline: number
      /** Signed delta in raw points. */
      delta: number
      /** Signed delta as a fraction of the baseline (0.35 → +35%). */
      deltaPct: number
      /** Magnitude — "warm" (1.5 ≤ |z| < 2.5) vs "hot" (|z| ≥ 2.5). */
      heat: "warm" | "hot"
    }
  | {
      kind: "below"
      baseline: number
      delta: number
      deltaPct: number
      heat: "warm" | "hot"
    }

const MIN_HISTORY_POINTS = 3
const WARM_THRESHOLD = 1.5
const HOT_THRESHOLD = 2.5

export function classifyAnomaly(input: AnomalyInput): AnomalyVerdict {
  const cur = input.current
  const cohort = input.history.filter((h) => {
    if (h.eventTypeCode !== cur.eventTypeCode) return false
    // For GW Daily, narrow the cohort to the same day-type AND cycle so we
    // don't compare a Massacre score against a Robbing score.
    if (cur.eventTypeCode === "gw_daily") {
      if (cur.gwDayType && h.gwDayType && cur.gwDayType !== h.gwDayType) return false
      if (cur.gwCycle && h.gwCycle && cur.gwCycle !== h.gwCycle) return false
    }
    return true
  })

  if (cohort.length < MIN_HISTORY_POINTS) {
    return { kind: "insufficient" }
  }

  // Use the most recent N entries (not all of history) so the baseline
  // tracks current form rather than season-long average.
  const recent = [...cohort]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const mean = recent.reduce((s, x) => s + x.points, 0) / recent.length
  const variance =
    recent.reduce((s, x) => s + (x.points - mean) ** 2, 0) /
    Math.max(1, recent.length - 1)
  const std = Math.sqrt(variance)

  if (std === 0 || mean === 0) {
    // All-equal history — only flag if the new score is meaningfully off.
    const deltaPct = mean === 0 ? 0 : (cur.points - mean) / mean
    if (Math.abs(deltaPct) < 0.15) {
      return { kind: "normal", baseline: mean, deltaPct }
    }
    return deltaPct > 0
      ? {
          kind: "above",
          baseline: mean,
          delta: cur.points - mean,
          deltaPct,
          heat: "warm",
        }
      : {
          kind: "below",
          baseline: mean,
          delta: cur.points - mean,
          deltaPct,
          heat: "warm",
        }
  }

  const z = (cur.points - mean) / std
  const absZ = Math.abs(z)
  const deltaPct = mean === 0 ? 0 : (cur.points - mean) / mean

  if (absZ < WARM_THRESHOLD) {
    return { kind: "normal", baseline: mean, deltaPct }
  }
  const heat: "warm" | "hot" = absZ >= HOT_THRESHOLD ? "hot" : "warm"
  return z > 0
    ? {
        kind: "above",
        baseline: mean,
        delta: cur.points - mean,
        deltaPct,
        heat,
      }
    : {
        kind: "below",
        baseline: mean,
        delta: cur.points - mean,
        deltaPct,
        heat,
      }
}

/** Format a verdict for compact UI display ("+35% above pace"). */
export function formatAnomaly(verdict: AnomalyVerdict): {
  emoji: string
  label: string
  tone: "ember" | "blood" | "muted"
} | null {
  if (verdict.kind === "insufficient" || verdict.kind === "normal") return null
  const sign = verdict.kind === "above" ? "+" : "−"
  const pct = Math.round(Math.abs(verdict.deltaPct) * 100)
  const direction = verdict.kind === "above" ? "above pace" : "below pace"
  const emoji =
    verdict.kind === "above"
      ? verdict.heat === "hot"
        ? "🔥"
        : "↑"
      : verdict.heat === "hot"
        ? "🚨"
        : "↓"
  return {
    emoji,
    label: `${sign}${pct}% ${direction}`,
    tone: verdict.kind === "above" ? "ember" : "blood",
  }
}
