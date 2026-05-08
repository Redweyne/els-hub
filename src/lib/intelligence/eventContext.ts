/**
 * Event-context one-liner — the short sentence under an event's title that
 * places it inside the larger story.
 *
 * Examples:
 *   - "Best Oak in 3 months"
 *   - "Worst FCU since Apr 8"
 *   - "Above-average Robbing day · 18 of 60 cleared (vs 13 typical)"
 *   - "Faction's first published Massacre — no baseline yet"
 *
 * Lives next to the event title so anyone reading can immediately understand
 * "is this a big result or a normal one?" without digging into stats.
 */

import type { EventTypeCode } from "@/lib/events/config"

export interface EventContextEvent {
  id: string
  /** Faction placement (Oak only). */
  placement?: number | null
  /** Total faction points across the leaderboard. */
  totalPoints: number
  /** Number of members who hit the day's threshold (GW Daily only). */
  thresholdHits?: number | null
  /** Min-points threshold (GW Daily only). */
  threshold?: number | null
  createdAt: string
  eventTypeCode: EventTypeCode | string | null
  /** GW Daily metadata, when applicable. */
  gw?: {
    cycle: "war" | "hegemony"
    day_type: string
  } | null
  title?: string
}

export interface EventContextLine {
  /** Short headline-style sentence. */
  text: string
  /** Tonality for styling — drives chip color downstream. */
  tone: "celebratory" | "warning" | "neutral"
}

/**
 * Compute a single one-liner for `current` given a list of prior events of
 * the same type (and same GW day-type / cycle if applicable). `prior`
 * should NOT include `current`.
 */
export function deriveEventContext(
  current: EventContextEvent,
  prior: ReadonlyArray<EventContextEvent>,
): EventContextLine | null {
  // Filter prior to the relevant cohort.
  const cohort = prior.filter((p) => {
    if (p.id === current.id) return false
    if (p.eventTypeCode !== current.eventTypeCode) return false
    if (current.eventTypeCode === "gw_daily") {
      if (current.gw?.day_type && p.gw?.day_type && current.gw.day_type !== p.gw.day_type) {
        return false
      }
      if (current.gw?.cycle && p.gw?.cycle && current.gw.cycle !== p.gw.cycle) {
        return false
      }
    }
    return true
  })

  // Need at least one prior to compare against — for the very first event
  // of its type we just give a neutral "Faction's first ___" line.
  if (cohort.length === 0) {
    if (current.eventTypeCode === "oak") {
      return {
        text: "Faction's first published Oak — no baseline yet",
        tone: "neutral",
      }
    }
    if (current.eventTypeCode === "gw_daily" && current.gw) {
      const dayLabel = capitalise(current.gw.day_type)
      return {
        text: `Faction's first ${dayLabel} day — no baseline yet`,
        tone: "neutral",
      }
    }
    if (current.eventTypeCode === "fcu") {
      return { text: "Faction's first published FCU", tone: "neutral" }
    }
    return null
  }

  // ── Oak: placement-driven story.
  if (current.eventTypeCode === "oak" && current.placement) {
    if (current.placement === 1) {
      const lastWin = cohort
        .filter((p) => p.placement === 1)
        .sort(byCreatedDesc)[0]
      if (!lastWin) {
        return {
          text: "First Oakvale victory we have on record",
          tone: "celebratory",
        }
      }
      const monthsSince = monthsBetween(lastWin.createdAt, current.createdAt)
      if (monthsSince >= 1) {
        return {
          text: `First Oakvale gold in ${formatMonths(monthsSince)}`,
          tone: "celebratory",
        }
      }
      // Recent gold — count consecutive Oak wins
      const sorted = [...cohort].sort(byCreatedDesc)
      let streak = 1
      for (const p of sorted) {
        if (p.placement === 1) streak++
        else break
      }
      if (streak >= 2) {
        return {
          text: `${streak} Oakvale victories in a row`,
          tone: "celebratory",
        }
      }
    }
    // Below podium for Oak is unusual (5-faction match) — flag it.
    if (current.placement >= 4) {
      return {
        text: `Off the podium — placed No. ${current.placement} of 5`,
        tone: "warning",
      }
    }
  }

  // ── GW Daily: threshold completion vs cohort average.
  if (
    current.eventTypeCode === "gw_daily" &&
    current.gw &&
    current.thresholdHits != null
  ) {
    const cohortHits = cohort
      .map((p) => p.thresholdHits)
      .filter((h): h is number => h != null)
    if (cohortHits.length > 0) {
      const avg =
        cohortHits.reduce((s, n) => s + n, 0) / cohortHits.length
      const dayLabel = capitalise(current.gw.day_type)
      const diff = current.thresholdHits - avg
      if (diff >= 5) {
        return {
          text: `Above-average ${dayLabel} day · ${current.thresholdHits} cleared (vs ~${Math.round(avg)} typical)`,
          tone: "celebratory",
        }
      }
      if (diff <= -5) {
        return {
          text: `Soft ${dayLabel} day · ${current.thresholdHits} cleared (vs ~${Math.round(avg)} typical)`,
          tone: "warning",
        }
      }
      // Otherwise, compare to highest-ever for this day-type.
      const best = Math.max(...cohortHits)
      if (current.thresholdHits > best) {
        return {
          text: `Best ${dayLabel} day on record · ${current.thresholdHits} cleared`,
          tone: "celebratory",
        }
      }
    }
  }

  // ── FCU + fallback: total-points vs cohort.
  if (cohort.length >= 2 && current.totalPoints > 0) {
    const cohortTotals = cohort
      .map((p) => p.totalPoints)
      .filter((t) => t > 0)
    if (cohortTotals.length >= 2) {
      const max = Math.max(...cohortTotals)
      const min = Math.min(...cohortTotals)
      const sortedDesc = [...cohort].sort(byCreatedDesc)
      if (current.totalPoints > max) {
        const lastTopped = sortedDesc[0]
        const months = monthsBetween(lastTopped.createdAt, current.createdAt)
        return months >= 1
          ? {
              text: `Best ${eventLabel(current.eventTypeCode)} in ${formatMonths(months)}`,
              tone: "celebratory",
            }
          : {
              text: `Best ${eventLabel(current.eventTypeCode)} on record`,
              tone: "celebratory",
            }
      }
      if (current.totalPoints < min) {
        const lastBottom = sortedDesc[0]
        return {
          text: `Soft ${eventLabel(current.eventTypeCode)} — lowest since ${shortDate(lastBottom.createdAt)}`,
          tone: "warning",
        }
      }
    }
  }

  return null
}

// ─── helpers ────────────────────────────────────────────────────────────

function byCreatedDesc(a: { createdAt: string }, b: { createdAt: string }): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function monthsBetween(olderIso: string, newerIso: string): number {
  const ms =
    new Date(newerIso).getTime() - new Date(olderIso).getTime()
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.44))
}

function formatMonths(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12)
    return years === 1 ? "a year" : `${years} years`
  }
  const rounded = Math.max(1, Math.round(months))
  return rounded === 1 ? "a month" : `${rounded} months`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function eventLabel(code: string | null | undefined): string {
  switch (code) {
    case "fcu":
      return "FCU"
    case "oak":
      return "Oak"
    case "gw_daily":
      return "GW Daily"
    default:
      return "event"
  }
}
