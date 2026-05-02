/**
 * Single source of truth for event type metadata.
 *
 * Every UI surface reads from here — Home, Events archive, Honor Wall,
 * Member profile, upload form. To add a new event type, add a row here.
 *
 * NAMING RULES (locked):
 *   Faction Call-Up    → FCU   → code "fcu"
 *   Glory of Oakvale   → Oak   → code "oak"   (NEVER "GoO" or "goa")
 *   Governor's War     → GW    → codes "gw_campaign" + "gw_daily"
 */

import type { ComponentType } from "react"
import {
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
} from "@/components/heraldry"
import type { GlyphProps } from "@/components/heraldry/glyphs/FactionCallUpGlyph"

export type EventTypeCode = "fcu" | "oak" | "gw_daily" | "gw_campaign"

/** Legacy codes that may still appear in older rows. Map them to new codes. */
const LEGACY_CODE_MAP: Record<string, EventTypeCode> = {
  goa: "oak",
  sgoa: "oak",
  "gw-sl": "gw_daily",
  "gw-fh": "gw_daily",
}

export interface EventTypeConfig {
  code: EventTypeCode
  /** Full display label, e.g. "Glory of Oakvale". */
  label: string
  /** Short abbreviation shown in chips, badges, the URL — "FCU" / "Oak" / "GW". */
  abbrev: string
  /** Eyebrow text used above hero headings — usually uppercase. */
  eyebrow: string
  /** Glyph SVG component for cards/heroes. */
  Glyph: ComponentType<GlyphProps>
  /**
   * CSS variable name (no `var()`) of the signature accent.
   * Used to tint cards: blood for FCU intensity, ember for Oak gold,
   * blood-light for GW war days.
   */
  accent: "ember" | "blood" | "blood-light"
  /** Where the officer is sent to upload screenshots for this event type. */
  uploadRoute: string
  /** Public-facing one-liner for empty states / tooltips. */
  tagline: string
  /** Whether this type creates a leaderboard with rank/points (true for all but gw_campaign). */
  hasLeaderboard: boolean
}

export const EVENT_TYPES: Record<EventTypeCode, EventTypeConfig> = {
  fcu: {
    code: "fcu",
    label: "Faction Call-Up",
    abbrev: "FCU",
    eyebrow: "Faction Call-Up",
    Glyph: FactionCallUpGlyph,
    accent: "blood",
    uploadRoute: "/tracking/new?type=fcu",
    tagline: "Weekly faction recruitment ranking.",
    hasLeaderboard: true,
  },
  oak: {
    code: "oak",
    label: "Glory of Oakvale",
    abbrev: "Oak",
    eyebrow: "Glory of Oakvale",
    Glyph: GloryOfOakvaleGlyph,
    accent: "ember",
    uploadRoute: "/tracking/new?type=oak",
    tagline: "Saturday five-faction war for Oakvale.",
    hasLeaderboard: true,
  },
  gw_daily: {
    code: "gw_daily",
    label: "Governor's War — Daily",
    abbrev: "GW",
    eyebrow: "Governor's War",
    Glyph: GovernorsWarGlyph,
    accent: "blood-light",
    uploadRoute: "/tracking/new?type=gw_daily",
    tagline: "A single day of the GW campaign.",
    hasLeaderboard: true,
  },
  gw_campaign: {
    code: "gw_campaign",
    label: "Governor's War Campaign",
    abbrev: "GW Campaign",
    eyebrow: "Governor's War",
    Glyph: GovernorsWarGlyph,
    accent: "blood-light",
    uploadRoute: "/tracking/campaigns/new",
    tagline: "The 40–50 day GW arc.",
    hasLeaderboard: false,
  },
}

/**
 * Resolve a code (including legacy codes) to a config entry.
 * Returns null when the code is unknown so callers can fall back.
 */
export function getEventConfig(
  code: string | null | undefined,
): EventTypeConfig | null {
  if (!code) return null
  const canonical = (LEGACY_CODE_MAP[code] ?? code) as EventTypeCode
  return EVENT_TYPES[canonical] ?? null
}

/** Type guard. */
export function isEventTypeCode(code: string): code is EventTypeCode {
  return code in EVENT_TYPES
}

/** All trackable types in display order. `gw_campaign` excluded — campaigns are created via a different flow. */
export const UPLOADABLE_TYPES: EventTypeCode[] = ["fcu", "oak", "gw_daily"]

// ─────────────────────────────────────────────────────────────────────────────
// GW Day-Type Registry
// ─────────────────────────────────────────────────────────────────────────────

export type GWCycle = "war" | "hegemony"
export type GWDayType =
  | "robbing"
  | "kingpin"
  | "influence"
  | "speedups"
  | "massacre"

export interface GWDayConfig {
  type: GWDayType
  label: string
  /** Short caps abbreviation for chip displays. */
  short: string
  /** Minimum points threshold for War cycle. */
  warThreshold: number
  /** Minimum points threshold for Hegemony cycle. */
  hegemonyThreshold: number
  /** Day position within the 5-day cycle (1-5). */
  dayInCycle: 1 | 2 | 3 | 4 | 5
  /** Plain-English description used in tooltips. */
  description: string
}

/** The repeating 5-day day-type sequence. */
export const GW_DAY_SCHEDULE: GWDayConfig[] = [
  {
    type: "robbing",
    label: "Robbing",
    short: "Rob",
    warThreshold: 2_000_000,
    hegemonyThreshold: 1_600_000,
    dayInCycle: 1,
    description: "Rob caravans for points.",
  },
  {
    type: "kingpin",
    label: "Kingpin",
    short: "King",
    warThreshold: 1_200_000,
    hegemonyThreshold: 960_000,
    dayInCycle: 2,
    description: "Kingpin Attack scoring.",
  },
  {
    type: "influence",
    label: "Influence",
    short: "Inf",
    warThreshold: 1_500_000,
    hegemonyThreshold: 750_000,
    dayInCycle: 3,
    description: "Build influence across the map.",
  },
  {
    type: "speedups",
    label: "Speedups",
    short: "Spd",
    warThreshold: 3_000_000,
    hegemonyThreshold: 1_500_000,
    dayInCycle: 4,
    description: "Burn speedups for faction credit.",
  },
  {
    type: "massacre",
    label: "Massacre",
    short: "Mass",
    warThreshold: 40_000_000,
    hegemonyThreshold: 20_000_000,
    dayInCycle: 5,
    description: "Massacre rivals — peak intensity.",
  },
]

export function getGWDayConfig(dayType: GWDayType): GWDayConfig {
  const found = GW_DAY_SCHEDULE.find((d) => d.type === dayType)
  if (!found) throw new Error(`Unknown GW day type: ${dayType}`)
  return found
}

export function getGWThreshold(dayType: GWDayType, cycle: GWCycle): number {
  const cfg = getGWDayConfig(dayType)
  return cycle === "war" ? cfg.warThreshold : cfg.hegemonyThreshold
}

/** GW Daily metadata stored in events.meta_json. */
export interface GWDailyMeta {
  campaign_id: string
  cycle: GWCycle
  super_cycle: number
  day_in_cycle: 1 | 2 | 3 | 4 | 5
  day_type: GWDayType
  min_points: number
  /** ISO timestamp of the rollover boundary (2AM Paris of the day after). */
  deadline_iso: string
}

/** GW Campaign metadata stored in events.meta_json. */
export interface GWCampaignMeta {
  start_date_iso: string
  expected_days: number
  /** Officer-set timezone for day boundaries. Always "Europe/Paris" for now. */
  tz: "Europe/Paris"
}

/** Oak metadata stored in events.faction_result_json. */
export interface OakReportCard {
  placement: number
  class_points: number
  class_points_delta: number
  battle_stats: {
    total: number
    kill: number
    occupation: number
  }
  best_of_all: {
    total: { name: string; value: number }
    kill: { name: string; value: number }
    occupation: { name: string; value: number }
  }
}
