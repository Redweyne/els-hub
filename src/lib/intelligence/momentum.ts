/**
 * Member momentum — a single short sentence of context for a profile.
 *
 * Looks at the most recent N events (any type) and computes whether the
 * member is trending up, holding steady, or slipping. This is rank-based
 * because rank is comparable across event types in a way that points are
 * not (Massacre Day's millions vs FCU's thousands).
 *
 * Output is one human-readable sentence — short enough to sit under a
 * member name, opinionated enough to feel like commentary instead of stats.
 */

export interface MomentumScoreInput {
  rank: number
  /** Used only to break ties when sorting; oldest → newest. */
  createdAt: string
}

export type MomentumVerdict =
  | { kind: "insufficient" }
  | {
      kind: "trending_up"
      sentence: string
      /** Average rank improvement per event over the window. Positive. */
      perEvent: number
    }
  | {
      kind: "trending_down"
      sentence: string
      /** Average rank slip per event. Positive number = slipping. */
      perEvent: number
    }
  | {
      kind: "steady"
      sentence: string
      /** Median rank across the window. */
      medianRank: number
    }
  | {
      kind: "elite"
      sentence: string
      /** Best rank in the window. */
      bestRank: number
    }

const MIN_EVENTS = 3
const TRENDING_THRESHOLD_PER_EVENT = 0.8

export function deriveMomentum(
  scores: ReadonlyArray<MomentumScoreInput>,
): MomentumVerdict {
  if (scores.length < MIN_EVENTS) return { kind: "insufficient" }

  // Use up to the most recent 5 events.
  const recent = [...scores]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // The trend is computed as (oldest rank − newest rank) / span.
  // Lower ranks are better; positive perEvent means improvement.
  const oldToNew = [...recent].reverse()
  const ranks = oldToNew.map((s) => s.rank)
  const span = ranks.length - 1
  const perEvent = span === 0 ? 0 : (ranks[0] - ranks[ranks.length - 1]) / span

  // Best + median for the elite / steady descriptions.
  const sortedAsc = [...ranks].sort((a, b) => a - b)
  const bestRank = sortedAsc[0]
  const medianRank =
    sortedAsc.length % 2 === 0
      ? Math.round(
          (sortedAsc[sortedAsc.length / 2 - 1] + sortedAsc[sortedAsc.length / 2]) / 2,
        )
      : sortedAsc[Math.floor(sortedAsc.length / 2)]

  // "Elite" — every event in the window is a top-3 finish.
  if (ranks.every((r) => r <= 3)) {
    return {
      kind: "elite",
      sentence: `Elite form · best ${ranks.length} of last ${ranks.length} top-3`,
      bestRank,
    }
  }

  if (perEvent >= TRENDING_THRESHOLD_PER_EVENT) {
    const climb = ranks[0] - ranks[ranks.length - 1]
    return {
      kind: "trending_up",
      sentence: `Trending up · ${ranks[0]} → ${ranks[ranks.length - 1]} over last ${ranks.length} events`,
      perEvent: climb / span,
    }
  }
  if (perEvent <= -TRENDING_THRESHOLD_PER_EVENT) {
    const slip = ranks[ranks.length - 1] - ranks[0]
    return {
      kind: "trending_down",
      sentence: `Slipping · ${ranks[0]} → ${ranks[ranks.length - 1]} over last ${ranks.length} events`,
      perEvent: slip / span,
    }
  }

  // Steady — find a tonal sentence based on where they hold.
  if (medianRank <= 5) {
    return {
      kind: "steady",
      sentence: `Steady at the front · median rank #${medianRank}`,
      medianRank,
    }
  }
  if (medianRank <= 15) {
    return {
      kind: "steady",
      sentence: `Holding mid-pack · median rank #${medianRank}`,
      medianRank,
    }
  }
  return {
    kind: "steady",
    sentence: `Holding · median rank #${medianRank}`,
    medianRank,
  }
}
