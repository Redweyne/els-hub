"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import { SparkLine, MicroBar } from "@/components/dataviz"
import {
  EVENT_TYPES,
  type EventTypeCode,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

/**
 * Faction snapshot by event type — a tightly-designed card per type.
 *
 * Cards never compare data across types (FCU thousands ≠ Oak hundred-thousands
 * ≠ GW millions). Each card lives entirely inside one type's universe.
 *
 * Visual design notes (mobile-first):
 *  - No giant faded corner glyphs — they read as visual noise. Identity
 *    is carried by a clean leading rail (typed gradient bar) + a small
 *    refined badge with the event-type abbreviation.
 *  - Card layout is two-row: header row (badge + title + sparkline) and a
 *    detail row (key stat values, ample whitespace).
 *  - Each card has its own subtle gradient surface — different enough to
 *    read distinct at a glance, restrained enough to feel composed.
 *  - Latest result is rendered at hero scale; secondary stats sit below
 *    in a tabular row, mono font, soft contrast.
 */

export interface FactionTypeSnapshotEvent {
  id: string
  title: string
  createdAt: string
  /** Faction average rank within this event (lower = better). */
  factionAvgRank: number
  /** Faction's placement (Oak only). */
  placement?: number | null
  /** GW Daily threshold clearance — count of members at or above min_points. */
  thresholdHits?: number | null
  /** GW Daily total participants. */
  thresholdTotal?: number | null
}

export interface FactionTypeSnapshotProps {
  byType: {
    fcu: ReadonlyArray<FactionTypeSnapshotEvent>
    oak: ReadonlyArray<FactionTypeSnapshotEvent>
    gw_daily: ReadonlyArray<FactionTypeSnapshotEvent>
  }
  className?: string
}

export function FactionTypeSnapshot({
  byType,
  className,
}: FactionTypeSnapshotProps) {
  const cards: Array<{
    code: EventTypeCode
    events: ReadonlyArray<FactionTypeSnapshotEvent>
  }> = [
    { code: "fcu", events: byType.fcu },
    { code: "oak", events: byType.oak },
    { code: "gw_daily", events: byType.gw_daily },
  ]
  const visible = cards.filter((c) => c.events.length > 0)
  if (visible.length === 0) return null

  return (
    <section
      className={cn("max-w-2xl mx-auto px-5", className)}
      aria-label="Faction performance by event type"
    >
      <div className="flex items-end justify-between mb-3">
        <Eyebrow tone="ember" size="sm">
          Faction Pulse
        </Eyebrow>
        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          per event type
        </span>
      </div>
      <div className="space-y-2.5">
        {visible.map(({ code, events }) => (
          <SnapshotCard key={code} code={code} events={events} />
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function SnapshotCard({
  code,
  events,
}: {
  code: EventTypeCode
  events: ReadonlyArray<FactionTypeSnapshotEvent>
}) {
  const reducedMotion = useReducedMotion()
  const cfg = EVENT_TYPES[code]
  const palette = paletteFor(code)
  const ranks = events.map((e) => e.factionAvgRank)
  const latest = events[events.length - 1]
  const summary = summaryFor(code, events)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        href={`/pulse/${code}`}
        aria-label={`${cfg.label} pulse — ${events.length} events. Latest: ${latest.title}.`}
        className={cn(
          "relative block overflow-hidden rounded-2xl",
          "transition-all duration-200 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          // outer surface
          "bg-gradient-to-br border",
          palette.surfaceFrom,
          palette.surfaceBorder,
          palette.surfaceHover,
        )}
      >
        {/* Type-color accent rail along the left edge — replaces the old
            ugly corner glyph as the source of type identity. */}
        <div
          aria-hidden="true"
          className={cn("absolute left-0 top-0 bottom-0 w-[3px]", palette.rail)}
        />

        {/* Subtle radial gradient highlight — gives each card a hint of
            depth without the cartoonish faded glyph. */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 pointer-events-none opacity-60",
            palette.glowMask,
          )}
        />

        <div className="relative px-4 py-3.5 md:px-5 md:py-4 pl-5 md:pl-6">
          {/* Header row: badge + label + sparkline + chevron */}
          <div className="flex items-center gap-3">
            <TypeBadge code={code} />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "font-display text-[15px] md:text-base font-semibold leading-tight tracking-[-0.005em]",
                    palette.heading,
                  )}
                >
                  {cfg.label}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-bone/55 flex-shrink-0">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[12px] text-bone/65 font-body mt-0.5 line-clamp-1">
                {summary.headline}
              </p>
            </div>

            {ranks.length >= 2 ? (
              <SparkLine
                data={ranks}
                width={56}
                height={22}
                color={palette.spark}
                inverted
                showLastDot
                fill
                label={`${cfg.label} faction rank trend`}
                className="opacity-95 flex-shrink-0"
              />
            ) : null}

            <ChevronRight
              size={14}
              className="text-bone/35 flex-shrink-0"
              aria-hidden="true"
            />
          </div>

          {/* Detail row — kept tight + tabular */}
          {summary.stats.length > 0 && (
            <div
              className={cn(
                "mt-3 grid gap-2",
                summary.stats.length === 2 && "grid-cols-2",
                summary.stats.length === 3 && "grid-cols-3",
                summary.stats.length === 4 && "grid-cols-4",
              )}
            >
              {summary.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg bg-ink/45 border border-ash/55 px-2 py-1.5"
                >
                  <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body leading-tight">
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono font-bold tabular-nums leading-tight text-[14px] md:text-[15px]",
                      s.tone === "accent"
                        ? palette.accentText
                        : "text-bone",
                    )}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {summary.bottomBar != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1 text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body">
                <span>{summary.bottomBar.leftLabel}</span>
                <span className="font-mono normal-case tracking-normal text-bone/75">
                  {summary.bottomBar.rightLabel}
                </span>
              </div>
              <MicroBar
                value={summary.bottomBar.value}
                thickness={3}
                color={summary.bottomBar.color}
                ariaLabel={summary.bottomBar.ariaLabel}
              />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Type badge — replaces the giant faded corner glyph with a refined token.
// Just type-colored gradient + the abbreviation, mono caps. Reads as an
// identity chip, not a clip-art mascot.
// ─────────────────────────────────────────────────────────────────────────────

function TypeBadge({ code }: { code: EventTypeCode }) {
  const cfg = EVENT_TYPES[code]
  const palette = paletteFor(code)
  return (
    <span
      className={cn(
        "flex-shrink-0 inline-flex items-center justify-center rounded-lg",
        "w-12 h-12 md:w-[52px] md:h-[52px]",
        "border bg-gradient-to-br",
        palette.badgeBorder,
        palette.badgeBg,
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "font-display font-bold tracking-[0.16em] uppercase leading-none",
          "text-[13px] md:text-[14px]",
          palette.badgeText,
        )}
      >
        {cfg.abbrev}
      </span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type summary — same data pipeline as before, returns `stats[]` instead
// of free-form headline so layout is consistent across cards.
// ─────────────────────────────────────────────────────────────────────────────

interface CardSummary {
  headline: string
  stats: Array<{ label: string; value: string; tone?: "accent" | "default" }>
  bottomBar?: {
    value: number
    color: string
    leftLabel: string
    rightLabel: string
    ariaLabel: string
  }
}

function summaryFor(
  code: EventTypeCode,
  events: ReadonlyArray<FactionTypeSnapshotEvent>,
): CardSummary {
  const latest = events[events.length - 1]

  if (code === "fcu") {
    const ranks = events.map((e) => e.factionAvgRank)
    const bestAvg = Math.min(...ranks)
    return {
      headline: latest.title,
      stats: [
        {
          label: "Latest avg",
          value: `#${formatRank(latest.factionAvgRank)}`,
          tone: "accent",
        },
        { label: "Best avg", value: `#${formatRank(bestAvg)}` },
        {
          label: "Recorded",
          value: `${events.length}`,
        },
      ],
    }
  }

  if (code === "oak") {
    const placements = events
      .map((e) => e.placement)
      .filter((p): p is number => p != null)
    const golds = placements.filter((p) => p === 1).length
    const bestPlacement =
      placements.length > 0 ? Math.min(...placements) : null
    return {
      headline: latest.title,
      stats: [
        {
          label: "Latest",
          value: latest.placement
            ? oakPlacementShort(latest.placement)
            : "—",
          tone: "accent",
        },
        {
          label: "Best",
          value:
            bestPlacement != null ? oakPlacementShort(bestPlacement) : "—",
        },
        {
          label: "Golds",
          value: `${golds}/${placements.length || events.length}`,
        },
      ],
    }
  }

  // GW Daily — clear-rate is the only honest faction metric here.
  const totalHits = events.reduce(
    (sum, e) => sum + (e.thresholdHits ?? 0),
    0,
  )
  const totalTotals = events.reduce(
    (sum, e) => sum + (e.thresholdTotal ?? 0),
    0,
  )
  const overallRate = totalTotals === 0 ? 0 : totalHits / totalTotals
  const latestRate =
    latest.thresholdTotal && latest.thresholdTotal > 0
      ? (latest.thresholdHits ?? 0) / latest.thresholdTotal
      : 0
  return {
    headline: latest.title,
    stats: [
      {
        label: "Latest cleared",
        value: `${latest.thresholdHits ?? 0}/${latest.thresholdTotal ?? 0}`,
        tone: "accent",
      },
      {
        label: "Overall rate",
        value: `${Math.round(overallRate * 100)}%`,
      },
      {
        label: "Days logged",
        value: `${events.length}`,
      },
    ],
    bottomBar: {
      value: overallRate,
      color: overallRate >= 0.8 ? "var(--ember)" : "var(--blood-light)",
      leftLabel: "Threshold clear rate",
      rightLabel: `${Math.round(latestRate * 100)}% latest`,
      ariaLabel: `${Math.round(overallRate * 100)}% overall threshold clear rate`,
    },
  }
}

function oakPlacementShort(placement: number): string {
  if (placement === 1) return "GOLD"
  if (placement === 2) return "SILVER"
  if (placement === 3) return "BRONZE"
  return `No.${placement}`
}

function formatRank(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "")
}

// ─────────────────────────────────────────────────────────────────────────────
// Palettes — tuned per type. Surface, rail, glow, badge all coordinate.
// ─────────────────────────────────────────────────────────────────────────────

interface Palette {
  rail: string
  surfaceFrom: string
  surfaceBorder: string
  surfaceHover: string
  glowMask: string
  heading: string
  accentText: string
  spark: string
  badgeBorder: string
  badgeBg: string
  badgeText: string
}

function paletteFor(code: EventTypeCode): Palette {
  if (code === "fcu") {
    return {
      rail: "bg-gradient-to-b from-blood-light via-blood to-blood-dark",
      surfaceFrom:
        "from-blood/10 via-blood-dark/8 to-ink-100/20",
      surfaceBorder: "border-blood/30",
      surfaceHover: "hover:border-blood/55",
      glowMask:
        "[background:radial-gradient(ellipse_at_top_right,rgba(163,27,27,0.18),transparent_60%)]",
      heading: "text-bone",
      accentText: "text-blood-light",
      spark: "var(--blood-light)",
      badgeBorder: "border-blood/45",
      badgeBg: "from-blood-dark/65 to-blood/35",
      badgeText: "text-bone",
    }
  }
  if (code === "oak") {
    return {
      rail: "bg-gradient-to-b from-ember-light via-ember to-ember-dark",
      surfaceFrom: "from-ember/10 via-ember-dark/6 to-ink-100/20",
      surfaceBorder: "border-ember/35",
      surfaceHover: "hover:border-ember/60",
      glowMask:
        "[background:radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.18),transparent_60%)]",
      heading: "text-bone",
      accentText: "text-ember",
      spark: "var(--ember)",
      badgeBorder: "border-ember/50",
      badgeBg: "from-ember/40 to-ember-dark/55",
      badgeText: "text-ink",
    }
  }
  // gw_daily
  return {
    rail: "bg-gradient-to-b from-blood-light via-blood to-ember-dark",
    surfaceFrom: "from-blood/12 via-ember-dark/8 to-ink-100/20",
    surfaceBorder: "border-blood/35",
    surfaceHover: "hover:border-blood/60",
    glowMask:
      "[background:radial-gradient(ellipse_at_top_right,rgba(163,27,27,0.18),transparent_60%)]",
    heading: "text-bone",
    accentText: "text-blood-light",
    spark: "var(--blood-light)",
    badgeBorder: "border-blood/50",
    badgeBg: "from-blood/45 to-ember-dark/40",
    badgeText: "text-bone",
  }
}
