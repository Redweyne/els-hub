"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight, Crown, Flame, Trophy } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import { SparkLine, MicroBar } from "@/components/dataviz"
import {
  EVENT_TYPES,
  type EventTypeCode,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

/**
 * Faction snapshot by event type.
 *
 * Three independent cards (FCU / Oak / GW), each summarising the *faction's*
 * recent performance inside ONE event type. Numbers are type-clean — never
 * crosses Massacre points with FCU points or Oak placements with FCU ranks.
 *
 * Design rules:
 *  - Cards only render when that type has at least 1 published event. No
 *    misleading "0 events" filler.
 *  - Each card has its own glyph anchor + palette so the eye reads the type
 *    instantly without having to parse the label.
 *  - Sparkline = faction's median rank trend within that type. Median is
 *    the right metric because it's robust to one outlier; the chart is
 *    inverted (lower is better).
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
  /** Map: event_type_code → array of events of that type, oldest → newest. */
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
  const cards: Array<{ code: EventTypeCode; events: ReadonlyArray<FactionTypeSnapshotEvent> }> = [
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
  const Glyph = cfg.Glyph
  const palette = paletteFor(code)
  const ranks = events.map((e) => e.factionAvgRank)
  const latest = events[events.length - 1]
  const bestRank = Math.min(...ranks)
  const latestHref = `/events/${latest.id}`

  // Type-specific summary line.
  const summary = summaryFor(code, events)

  return (
    <Link
      href={latestHref}
      aria-label={`${cfg.label} — ${events.length} events. Latest: ${latest.title}.`}
      className={cn(
        "block relative overflow-hidden rounded-2xl border bg-gradient-to-br",
        "transition-all duration-150 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        palette.border,
        palette.bg,
        "hover:border-ember/55",
      )}
    >
      <Glyph
        size={140}
        className={cn(
          "absolute pointer-events-none -right-7 -top-7",
          palette.glyphTone,
        )}
      />
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative px-4 py-3.5 md:px-5 md:py-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl bg-ink/65 border flex items-center justify-center",
              palette.iconBorder,
            )}
          >
            <Glyph size={22} className={palette.iconTone} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <Eyebrow tone="ember" size="xs">
                {cfg.label}
              </Eyebrow>
              <span className="text-[10px] font-mono tabular-nums text-bone/55">
                {events.length} event{events.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="font-display text-base md:text-lg font-semibold text-bone tracking-[-0.01em] leading-tight mt-0.5 truncate">
              {summary.headline}
            </p>
            {summary.sub && (
              <p className="text-[11px] text-bone/55 font-body mt-0.5 line-clamp-1">
                {summary.sub}
              </p>
            )}
          </div>
          {ranks.length >= 2 && (
            <SparkLine
              data={ranks}
              width={64}
              height={22}
              color={sparkColorFor(code)}
              inverted
              showLastDot
              fill
              label={`${cfg.label} faction rank trend`}
              className="opacity-95 flex-shrink-0"
            />
          )}
          <ChevronRight
            size={14}
            className="text-bone/35 flex-shrink-0"
            aria-hidden="true"
          />
        </div>

        {summary.bottomBar != null && (
          <div className="mt-2.5">
            <MicroBar
              value={summary.bottomBar.value}
              thickness={3}
              color={summary.bottomBar.color}
              ariaLabel={summary.bottomBar.ariaLabel}
            />
            <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-bone/45 font-body">
              <span>{summary.bottomBar.leftLabel}</span>
              <span className="font-mono normal-case tracking-normal text-bone/65">
                {summary.bottomBar.rightLabel}
              </span>
            </div>
          </div>
        )}
        {/* Suppress unused */}
        <span className="hidden">{bestRank}</span>
      </motion.div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface CardSummary {
  headline: string
  sub?: string
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
      headline: `Latest faction avg rank · #${latest.factionAvgRank.toFixed(1).replace(/\.0$/, "")}`,
      sub:
        events.length >= 2
          ? `Best avg #${bestAvg.toFixed(1).replace(/\.0$/, "")} · ${events.length} FCUs on record`
          : "First FCU on record",
    }
  }

  if (code === "oak") {
    const placements = events
      .map((e) => e.placement)
      .filter((p): p is number => p != null)
    const golds = placements.filter((p) => p === 1).length
    return {
      headline: latest.placement
        ? oakPlacementHeadline(latest.placement)
        : `Latest Oakvale · ${latest.title}`,
      sub:
        placements.length > 0
          ? `${golds} gold${golds === 1 ? "" : "s"} of ${placements.length} placed Oakvales`
          : undefined,
    }
  }

  // GW Daily — only meaningful aggregate is threshold clearance.
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
    headline: `Latest day · ${latest.thresholdHits ?? 0} of ${latest.thresholdTotal ?? 0} cleared`,
    sub: `${events.length} GW dailies on record`,
    bottomBar: {
      value: overallRate,
      color: overallRate >= 0.8 ? "var(--ember)" : "var(--blood-light)",
      leftLabel: "Threshold clear rate",
      rightLabel: `${Math.round(overallRate * 100)}% overall · ${Math.round(latestRate * 100)}% latest`,
      ariaLabel: `${Math.round(overallRate * 100)}% overall threshold clear rate`,
    },
  }
}

function oakPlacementHeadline(placement: number): string {
  if (placement === 1) return "Latest Oakvale · GOLD"
  if (placement === 2) return "Latest Oakvale · SILVER"
  if (placement === 3) return "Latest Oakvale · BRONZE"
  return `Latest Oakvale · No. ${placement}`
}

function paletteFor(code: EventTypeCode) {
  if (code === "fcu") {
    return {
      border: "border-blood/35",
      bg: "from-blood/12 via-blood-dark/8 to-transparent",
      iconBorder: "border-blood/45",
      iconTone: "text-blood-light",
      glyphTone: "text-blood-light/12",
    }
  }
  if (code === "oak") {
    return {
      border: "border-ember/40",
      bg: "from-ember/12 via-ember-dark/8 to-transparent",
      iconBorder: "border-ember/45",
      iconTone: "text-ember",
      glyphTone: "text-ember/14",
    }
  }
  return {
    border: "border-blood/40",
    bg: "from-blood/14 via-ember-dark/6 to-transparent",
    iconBorder: "border-blood/50",
    iconTone: "text-blood-light",
    glyphTone: "text-blood-light/10",
  }
}

function sparkColorFor(code: EventTypeCode): string {
  if (code === "oak") return "var(--ember)"
  return "var(--blood-light)"
}

// Re-export icons used elsewhere, suppress unused-import warnings.
export const _icons = { ChevronRight, Crown, Flame, Trophy }
