"use client"

import { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Crown, Flame, ShieldCheck, Trophy } from "lucide-react"
import { Eyebrow, Numeric } from "@/components/typography"
import { SparkLine, MicroBar } from "@/components/dataviz"
import {
  EVENT_TYPES,
  GW_DAY_SCHEDULE,
  type EventTypeCode,
  type GWCycle,
  type GWDayType,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

/**
 * Per-Type Performance Cards.
 *
 * Three independent cards, one per event type (FCU, Oak, GW). Every metric
 * inside a card is computed from that type's history ONLY — points, ranks,
 * sparklines never cross the type boundary.
 *
 * Why this is the only honest way to render member performance:
 *  - FCU points live in the thousands.
 *  - Oak points live in the hundreds of thousands.
 *  - GW points scale 50× across day-types (Robbing 2M, Massacre 40M).
 *  - Placements only exist for FCU/Oak (faction-vs-faction events).
 *  - Threshold-clear rate only exists for GW dailies.
 *
 * Each card has a dedicated palette + glyph anchor so the eye learns to
 * read "this card is the FCU universe" at a glance.
 */

export interface PerformanceScore {
  eventId: string
  rank: number
  points: number
  createdAt: string
  eventTypeCode: string | null
  /** GW-Daily-only metadata. */
  gw?: {
    cycle: GWCycle
    day_in_cycle: 1 | 2 | 3 | 4 | 5
    day_type: GWDayType
    min_points: number
  } | null
  /** Oak-only: faction placement when this score was recorded. */
  oakPlacement?: number | null
  /** Oak-only: which "Best of All" categories named this member. */
  oakBestOf?: ReadonlyArray<"total" | "kill" | "occupation"> | null
}

export interface PerformanceByTypeProps {
  scores: ReadonlyArray<PerformanceScore>
  className?: string
}

export function PerformanceByType({
  scores,
  className,
}: PerformanceByTypeProps) {
  const buckets = useMemo(() => bucketScores(scores), [scores])

  return (
    <div className={cn("space-y-3", className)}>
      <FCUCard scores={buckets.fcu} />
      <OakCard scores={buckets.oak} />
      <GWCard scores={buckets.gw} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FCU Card
// ─────────────────────────────────────────────────────────────────────────────

function FCUCard({ scores }: { scores: PerformanceScore[] }) {
  if (scores.length === 0) return <EmptyTypeCard code="fcu" />

  const orderedAsc = [...scores].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const ranks = orderedAsc.map((s) => s.rank)
  const bestRank = Math.min(...ranks)
  const avgRank = ranks.reduce((s, r) => s + r, 0) / ranks.length
  const top3Count = ranks.filter((r) => r <= 3).length
  const top10Count = ranks.filter((r) => r <= 10).length

  return (
    <TypeCard
      code="fcu"
      eventCount={scores.length}
      sparkRanks={ranks.slice(-6)}
      stats={[
        { label: "Best", value: `#${bestRank}` },
        { label: "Avg", value: `#${avgRank.toFixed(1).replace(/\.0$/, "")}` },
        { label: "Top-3", value: `${top3Count}/${scores.length}` },
        { label: "Top-10", value: `${top10Count}/${scores.length}` },
      ]}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Oak Card — placement + Best-of-All
// ─────────────────────────────────────────────────────────────────────────────

function OakCard({ scores }: { scores: PerformanceScore[] }) {
  if (scores.length === 0) return <EmptyTypeCard code="oak" />

  const orderedAsc = [...scores].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const ranks = orderedAsc.map((s) => s.rank)
  const bestRank = Math.min(...ranks)
  const placements = scores
    .map((s) => s.oakPlacement)
    .filter((p): p is number => p != null)
  const factionGold = placements.filter((p) => p === 1).length
  const heroAppearances = scores.reduce(
    (sum, s) => sum + (s.oakBestOf?.length ?? 0),
    0,
  )
  const stats: Array<{ label: string; value: string }> = [
    { label: "Best rank", value: `#${bestRank}` },
  ]
  if (placements.length > 0) {
    stats.push({
      label: "Faction wins",
      value: `${factionGold}/${placements.length}`,
    })
  }
  stats.push({
    label: "Hero appearances",
    value: heroAppearances.toString(),
  })

  return (
    <TypeCard
      code="oak"
      eventCount={scores.length}
      sparkRanks={ranks.slice(-6)}
      stats={stats}
      bottomSlot={
        heroAppearances > 0 ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-ember/12 border border-ember/35 px-2.5 py-1">
            <Crown size={11} className="text-ember" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.16em] font-mono font-bold text-ember">
              {heroAppearances} × Best of All
            </span>
          </div>
        ) : null
      }
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GW Card — threshold-clear rate + per-day-type breakdown
// ─────────────────────────────────────────────────────────────────────────────

function GWCard({ scores }: { scores: PerformanceScore[] }) {
  if (scores.length === 0) return <EmptyTypeCard code="gw_daily" />

  // Threshold-clear rate = how often the member crossed the day's min_points.
  const cleared = scores.filter(
    (s) => s.gw && s.points >= s.gw.min_points,
  ).length
  const clearRate = scores.length === 0 ? 0 : cleared / scores.length

  // Streak = consecutive most-recent dailies cleared.
  const orderedDesc = [...scores].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  let currentStreak = 0
  for (const s of orderedDesc) {
    if (s.gw && s.points >= s.gw.min_points) currentStreak++
    else break
  }

  // Per day-type clear ratio for the lattice grid.
  const byDayType: Record<
    GWDayType,
    { hit: number; total: number }
  > = {
    robbing: { hit: 0, total: 0 },
    kingpin: { hit: 0, total: 0 },
    influence: { hit: 0, total: 0 },
    speedups: { hit: 0, total: 0 },
    massacre: { hit: 0, total: 0 },
  }
  for (const s of scores) {
    if (!s.gw) continue
    byDayType[s.gw.day_type].total++
    if (s.points >= s.gw.min_points) byDayType[s.gw.day_type].hit++
  }

  return (
    <TypeCard
      code="gw_daily"
      eventCount={scores.length}
      stats={[
        { label: "Cleared", value: `${cleared}/${scores.length}` },
        {
          label: "Clear rate",
          value: `${Math.round(clearRate * 100)}%`,
        },
        { label: "Streak", value: currentStreak.toString() },
      ]}
      bottomSlot={
        <div className="mt-3">
          <MicroBar
            value={clearRate}
            thickness={3}
            color={clearRate >= 0.8 ? "var(--ember)" : "var(--blood-light)"}
            ariaLabel={`${Math.round(clearRate * 100)}% threshold clear rate`}
          />
          <div className="mt-3 grid grid-cols-5 gap-1">
            {GW_DAY_SCHEDULE.map((cfg) => {
              const stat = byDayType[cfg.type]
              const rate =
                stat.total === 0 ? null : stat.hit / stat.total
              return (
                <div
                  key={cfg.type}
                  className={cn(
                    "rounded-lg border bg-ink/40 px-1.5 py-1.5 text-center",
                    rate == null
                      ? "border-ash/40 opacity-55"
                      : rate >= 0.7
                        ? "border-ember/40"
                        : rate >= 0.4
                          ? "border-bone/30"
                          : "border-blood/40",
                  )}
                  title={
                    stat.total === 0
                      ? `${cfg.label} — no data yet`
                      : `${cfg.label}: ${stat.hit}/${stat.total} cleared`
                  }
                >
                  <p className="text-[8px] uppercase tracking-[0.14em] text-bone/55 font-mono font-bold">
                    {cfg.short}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] font-mono font-bold tabular-nums leading-none",
                      rate == null
                        ? "text-bone/30"
                        : rate >= 0.7
                          ? "text-ember"
                          : rate >= 0.4
                            ? "text-bone/85"
                            : "text-blood-light",
                    )}
                  >
                    {stat.total === 0
                      ? "—"
                      : `${stat.hit}/${stat.total}`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      }
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared — TypeCard + EmptyTypeCard
// ─────────────────────────────────────────────────────────────────────────────

interface TypeCardProps {
  code: EventTypeCode
  eventCount: number
  sparkRanks?: number[]
  stats: Array<{ label: string; value: string }>
  bottomSlot?: React.ReactNode
}

function TypeCard({
  code,
  eventCount,
  sparkRanks,
  stats,
  bottomSlot,
}: TypeCardProps) {
  const reducedMotion = useReducedMotion()
  const cfg = EVENT_TYPES[code]
  const Glyph = cfg.Glyph
  const palette = paletteFor(code)
  const sparkColor = sparkColorFor(code)

  return (
    <motion.section
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br",
        "px-4 py-4 md:px-5 md:py-5",
        palette.border,
        palette.bg,
      )}
      aria-label={`${cfg.label} performance`}
    >
      {/* Faded glyph anchor in the corner — reinforces type identity. */}
      <Glyph
        size={140}
        className={cn(
          "absolute pointer-events-none -right-6 -top-6",
          palette.glyphTone,
        )}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl bg-ink/65 border flex items-center justify-center",
              palette.iconBorder,
            )}
          >
            <Glyph size={22} className={palette.iconTone} />
          </div>
          <div className="min-w-0">
            <Eyebrow tone="ember" size="xs">
              {cfg.label}
            </Eyebrow>
            <p className="font-display text-base md:text-lg font-semibold text-bone tracking-[-0.01em] leading-tight mt-0.5">
              {eventCount} event{eventCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {sparkRanks && sparkRanks.length >= 2 && (
          <SparkLine
            data={sparkRanks}
            width={88}
            height={28}
            color={sparkColor}
            inverted
            showLastDot
            fill
            label={`${cfg.label} recent ranks`}
            className="opacity-95 flex-shrink-0"
          />
        )}
      </div>

      {/* Stats row */}
      <div
        className={cn(
          "relative mt-3 grid gap-2",
          stats.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg bg-ink/40 border border-ash px-2 py-2 text-center"
          >
            <p className="text-[9px] uppercase tracking-[0.18em] text-bone/55 font-body">
              {s.label}
            </p>
            <p
              className={cn(
                "mt-0.5 font-mono font-bold tabular-nums text-[15px] md:text-base",
                palette.statValueTone,
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {bottomSlot && <div className="relative">{bottomSlot}</div>}
    </motion.section>
  )
}

function EmptyTypeCard({ code }: { code: EventTypeCode }) {
  const cfg = EVENT_TYPES[code]
  const Glyph = cfg.Glyph
  const palette = paletteFor(code)
  const meta = emptyMetaFor(code)
  const Icon = meta.icon
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br",
        "px-4 py-3.5",
        palette.border,
        "opacity-65",
      )}
      aria-label={`${cfg.label} performance — empty`}
    >
      <Glyph
        size={120}
        className={cn(
          "absolute pointer-events-none -right-6 -top-6",
          palette.glyphTone,
          "opacity-50",
        )}
      />
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-lg bg-ink/60 border flex items-center justify-center",
            palette.iconBorder,
          )}
        >
          <Icon size={18} className={palette.iconTone} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <Eyebrow tone="ember" size="xs">
            {cfg.label}
          </Eyebrow>
          <p className="text-bone/60 text-[12px] font-body mt-0.5">
            {meta.tagline}
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function bucketScores(scores: ReadonlyArray<PerformanceScore>) {
  const fcu: PerformanceScore[] = []
  const oak: PerformanceScore[] = []
  const gw: PerformanceScore[] = []
  for (const s of scores) {
    const code = (s.eventTypeCode ?? "").toLowerCase()
    if (code === "fcu") fcu.push(s)
    else if (code === "oak" || code === "goa" || code === "sgoa") oak.push(s)
    else if (code === "gw_daily" || code === "gw-sl" || code === "gw-fh")
      gw.push(s)
  }
  return { fcu, oak, gw }
}

function paletteFor(code: EventTypeCode) {
  if (code === "fcu") {
    return {
      border: "border-blood/35",
      bg: "from-blood/12 via-blood-dark/8 to-transparent",
      iconBorder: "border-blood/45",
      iconTone: "text-blood-light",
      glyphTone: "text-blood-light/12",
      statValueTone: "text-bone",
    }
  }
  if (code === "oak") {
    return {
      border: "border-ember/40",
      bg: "from-ember/12 via-ember-dark/8 to-transparent",
      iconBorder: "border-ember/45",
      iconTone: "text-ember",
      glyphTone: "text-ember/14",
      statValueTone: "text-bone",
    }
  }
  // gw_daily
  return {
    border: "border-blood/40",
    bg: "from-blood/14 via-ember-dark/6 to-transparent",
    iconBorder: "border-blood/50",
    iconTone: "text-blood-light",
    glyphTone: "text-blood-light/10",
    statValueTone: "text-bone",
  }
}

function sparkColorFor(code: EventTypeCode): string {
  if (code === "oak") return "var(--ember)"
  if (code === "gw_daily") return "var(--blood-light)"
  return "var(--blood-light)" // fcu
}

function emptyMetaFor(code: EventTypeCode): {
  icon: React.ComponentType<{ size?: number; className?: string }>
  tagline: string
} {
  if (code === "fcu") {
    return {
      icon: Trophy,
      tagline: "No FCU appearances yet.",
    }
  }
  if (code === "oak") {
    return {
      icon: ShieldCheck,
      tagline: "No Oakvale matches yet.",
    }
  }
  return {
    icon: Flame,
    tagline: "No GW dailies yet.",
  }
}
