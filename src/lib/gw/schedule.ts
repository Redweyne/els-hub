/**
 * Governor's War campaign rotation.
 *
 * A campaign starts at a Paris-time anchor (Day 1 / War cycle / Robbing /
 * 2,000,000 threshold) and runs ~50 days. Days advance at the 02:00 Paris
 * boundary. The rhythm is:
 *
 *   War cycle      (5 days, big numbers): Robbing → Kingpin → Influence → Speedups → Massacre
 *   Hegemony cycle (5 days, smaller):     Robbing → Kingpin → Influence → Speedups → Massacre
 *
 * That 10-day super-cycle repeats. So `(daysSinceStart % 10)` indexes the schedule.
 */

import {
  GW_DAY_SCHEDULE,
  type GWCycle,
  type GWDayConfig,
  type GWDayType,
} from "@/lib/events/config"

const PARIS_TZ = "Europe/Paris" as const
/** Day rollover boundary, Paris time. The Massacre / Robbing etc. all flip over at 02:00. */
export const ROLLOVER_HOUR_PARIS = 2

export interface ActiveDay {
  /** ISO timestamp at which the active day started (last 02:00 Paris boundary). */
  dayStartIso: string
  /** ISO timestamp at which it rolls to the next day. */
  deadlineIso: string
  /** 0-indexed day count since campaign start. */
  dayOffset: number
  /** 1-indexed super-cycle (1, 2, 3...). Each super-cycle = 10 days = War + Hegemony. */
  superCycle: number
  cycle: GWCycle
  /** 1..5 within the cycle. */
  dayInCycle: 1 | 2 | 3 | 4 | 5
  dayType: GWDayType
  /** Threshold for this specific day, picked from the config. */
  minPoints: number
  config: GWDayConfig
  /** Total days expected for the campaign (informational, not enforced). */
  expectedDays: number
}

/**
 * Get the (year, month, day) tuple in Paris time for a UTC instant.
 * Uses Intl.DateTimeFormat to handle DST correctly.
 */
function getParisYMD(date: Date): { y: number; m: number; d: number; h: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    h: Number(map.hour === "24" ? "0" : map.hour),
  }
}

/**
 * Build a UTC Date that corresponds to a given Paris-local clock time.
 * Iterative because of DST: we adjust until the formatted Paris time matches.
 */
function parisDateToUtc(year: number, month: number, day: number, hour: number): Date {
  // Initial guess: pretend Paris is UTC, then correct.
  let utc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  for (let i = 0; i < 3; i++) {
    const ymd = getParisYMD(utc)
    const desiredMinutes = year * 525_600 + month * 43_200 + day * 1_440 + hour * 60
    const actualMinutes = ymd.y * 525_600 + ymd.m * 43_200 + ymd.d * 1_440 + ymd.h * 60
    const diffMinutes = desiredMinutes - actualMinutes
    if (diffMinutes === 0) break
    utc = new Date(utc.getTime() + diffMinutes * 60_000)
  }
  return utc
}

/**
 * Given a campaign start (the Paris-local Day-1 02:00 anchor) and "now",
 * return the active GW day descriptor.
 *
 * `now` defaults to the current instant. Pass a fixed Date for deterministic tests.
 */
export function getActiveGWDay(
  campaignStartIso: string,
  expectedDays: number,
  now: Date = new Date(),
): ActiveDay {
  const start = new Date(campaignStartIso)
  const startYmd = getParisYMD(start)
  const nowYmd = getParisYMD(now)

  // The "anchor" of the day in progress is the most recent 02:00 Paris boundary
  // at-or-before `now`. If now is 01:30 Paris, the anchor is yesterday's 02:00.
  const anchorYmd = { ...nowYmd }
  if (nowYmd.h < ROLLOVER_HOUR_PARIS) {
    // Subtract a day in Paris-local terms.
    const utcMidnight = parisDateToUtc(nowYmd.y, nowYmd.m, nowYmd.d, ROLLOVER_HOUR_PARIS)
    const earlier = new Date(utcMidnight.getTime() - 24 * 60 * 60 * 1000)
    const e = getParisYMD(earlier)
    anchorYmd.y = e.y
    anchorYmd.m = e.m
    anchorYmd.d = e.d
  }

  const anchorUtc = parisDateToUtc(anchorYmd.y, anchorYmd.m, anchorYmd.d, ROLLOVER_HOUR_PARIS)
  const startUtc = parisDateToUtc(startYmd.y, startYmd.m, startYmd.d, ROLLOVER_HOUR_PARIS)
  const dayOffset = Math.max(
    0,
    Math.round((anchorUtc.getTime() - startUtc.getTime()) / (24 * 60 * 60 * 1000)),
  )

  const superCycleIndex = Math.floor(dayOffset / 10) // 0-based
  const inSuperCycle = dayOffset % 10 // 0..9
  const cycle: GWCycle = inSuperCycle < 5 ? "war" : "hegemony"
  const dayInCycle = ((inSuperCycle % 5) + 1) as 1 | 2 | 3 | 4 | 5
  const config = GW_DAY_SCHEDULE[dayInCycle - 1]
  const minPoints = cycle === "war" ? config.warThreshold : config.hegemonyThreshold

  const deadlineUtc = new Date(anchorUtc.getTime() + 24 * 60 * 60 * 1000)

  return {
    dayStartIso: anchorUtc.toISOString(),
    deadlineIso: deadlineUtc.toISOString(),
    dayOffset,
    superCycle: superCycleIndex + 1,
    cycle,
    dayInCycle,
    dayType: config.type,
    minPoints,
    config,
    expectedDays,
  }
}

/** Predict the day descriptor for an arbitrary day offset (for previews / Pulse chart). */
export function getDayAtOffset(
  campaignStartIso: string,
  dayOffset: number,
  expectedDays: number,
): Omit<ActiveDay, "dayStartIso" | "deadlineIso"> & {
  dayStartIso: string | null
  deadlineIso: string | null
} {
  const start = new Date(campaignStartIso)
  const startYmd = getParisYMD(start)
  const startUtc = parisDateToUtc(startYmd.y, startYmd.m, startYmd.d, ROLLOVER_HOUR_PARIS)
  const dayStart = new Date(startUtc.getTime() + dayOffset * 24 * 60 * 60 * 1000)
  const deadline = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  const superCycleIndex = Math.floor(dayOffset / 10)
  const inSuperCycle = ((dayOffset % 10) + 10) % 10
  const cycle: GWCycle = inSuperCycle < 5 ? "war" : "hegemony"
  const dayInCycle = ((inSuperCycle % 5) + 1) as 1 | 2 | 3 | 4 | 5
  const config = GW_DAY_SCHEDULE[dayInCycle - 1]
  const minPoints = cycle === "war" ? config.warThreshold : config.hegemonyThreshold

  return {
    dayStartIso: dayStart.toISOString(),
    deadlineIso: deadline.toISOString(),
    dayOffset,
    superCycle: superCycleIndex + 1,
    cycle,
    dayInCycle,
    dayType: config.type,
    minPoints,
    config,
    expectedDays,
  }
}

/**
 * Format the human-readable "TODAY: DAY 2 · KINGPIN · 7h 12m" string.
 * Returns the parts so the caller can render them with their own typography.
 */
export function formatActiveDay(day: ActiveDay, now: Date = new Date()): {
  cycleLabel: string
  dayLabel: string
  threshold: string
  countdown: string
  countdownMs: number
} {
  const ms = new Date(day.deadlineIso).getTime() - now.getTime()
  const safeMs = Math.max(0, ms)
  const totalMin = Math.floor(safeMs / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const countdown =
    h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`

  return {
    cycleLabel: day.cycle === "war" ? "WAR" : "HEGEMONY",
    dayLabel: `DAY ${day.dayInCycle} · ${day.config.label.toUpperCase()}`,
    threshold: day.minPoints.toLocaleString("en-US"),
    countdown,
    countdownMs: safeMs,
  }
}
