"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Minus, Calendar } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Eyebrow } from "@/components/typography"
import { SparkLine, MicroBar, Histogram } from "@/components/dataviz"
import {
  EVENT_TYPES,
  type EventTypeCode,
  type OakReportCard,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

/**
 * Faction Pulse — per-event-type insight page.
 *
 * The home-screen card is the entry point; this page is the actual answer
 * to "how is our faction doing in FCU / Oak / GW Daily over time?". Reads
 * the same data the home page collects, but renders much richer detail:
 *
 *  - Hero: latest event highlighted with delta vs prior of the same type.
 *  - Trendline: faction-average rank across the last N events of this type.
 *  - Top movers: members whose rank improved or fell hardest between the
 *    latest event and the prior one.
 *  - Personal-bests rate: how often the latest event saw members beat their
 *    historical average — gives officers a "is this faction climbing?" read.
 *  - Event timeline: every event of this type, oldest → newest, tappable.
 *
 * Mobile-first. Per-type accent colors mirror the home card palette so the
 * visual identity stays consistent across the journey.
 */

type Bucket = "fcu" | "oak" | "gw_daily"

interface EventLite {
  id: string
  title: string
  created_at: string
  event_type_code: string | null
  meta_json: Record<string, unknown> | null
  faction_result_json: Record<string, unknown> | null
}

interface Score {
  event_id: string
  member_id: string
  rank_value: number
  points: number
}

interface MemberLite {
  id: string
  canonical_name: string
}

interface EventRollup {
  id: string
  title: string
  createdAt: string
  factionAvgRank: number
  totalPoints: number
  topPoints: number
  participantCount: number
  placement: number | null
  thresholdHits: number | null
  thresholdTotal: number | null
  threshold: number | null
  classPointsDelta: number | null
}

interface Mover {
  memberId: string
  name: string
  latestRank: number
  priorRank: number
  delta: number // positive = improved (rank went down)
}

export default function PulseDetailPage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()

  const code = normalizeBucket(params.type)
  const cfg = code ? EVENT_TYPES[code] : null

  const [events, setEvents] = useState<EventLite[]>([])
  const [scoresByEvent, setScoresByEvent] = useState<Map<string, Score[]>>(
    new Map(),
  )
  const [memberMap, setMemberMap] = useState<Map<string, MemberLite>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code) {
      setError("Unknown event type.")
      setIsLoading(false)
      return
    }
    const load = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const codes = legacyCodesFor(code)
        const { data: evs, error: evErr } = await supabase
          .from("events")
          .select(
            "id, title, created_at, event_type_code, meta_json, faction_result_json",
          )
          .in("event_type_code", codes)
          .eq("status", "published")
          .order("created_at", { ascending: true })
          .limit(40)
        if (evErr) throw evErr
        const list = (evs ?? []) as EventLite[]
        setEvents(list)

        if (list.length === 0) {
          setIsLoading(false)
          return
        }

        const ids = list.map((e) => e.id)
        const { data: ss } = await supabase
          .from("event_scores")
          .select("event_id, member_id, rank_value, points")
          .in("event_id", ids)
        const byEvent = new Map<string, Score[]>()
        for (const s of (ss ?? []) as Score[]) {
          const arr = byEvent.get(s.event_id) ?? []
          arr.push(s)
          byEvent.set(s.event_id, arr)
        }
        setScoresByEvent(byEvent)

        const memberIds = Array.from(new Set((ss ?? []).map((s) => s.member_id)))
        if (memberIds.length > 0) {
          const { data: ms } = await supabase
            .from("members")
            .select("id, canonical_name")
            .in("id", memberIds)
          const map = new Map<string, MemberLite>()
          for (const m of (ms ?? []) as MemberLite[]) map.set(m.id, m)
          setMemberMap(map)
        }
      } catch (err) {
        console.error("[pulse] load error:", err)
        setError("Failed to load pulse data.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [code])

  const rollups = useMemo<EventRollup[]>(
    () =>
      events.map((e) => {
        const list = scoresByEvent.get(e.id) ?? []
        const totalPoints = list.reduce((s, x) => s + (x.points ?? 0), 0)
        const factionAvgRank =
          list.length > 0
            ? list.reduce((s, x) => s + x.rank_value, 0) / list.length
            : 0
        const topPoints = list.reduce(
          (max, x) => (x.points > max ? x.points : max),
          0,
        )
        const meta = e.meta_json as { min_points?: number } | null
        const fr = e.faction_result_json as {
          placement?: number
          class_points_delta?: number
        } | null
        const threshold = meta?.min_points ?? null
        return {
          id: e.id,
          title: e.title,
          createdAt: e.created_at,
          factionAvgRank,
          totalPoints,
          topPoints,
          participantCount: list.length,
          placement: fr?.placement ?? null,
          thresholdHits:
            threshold != null
              ? list.filter((x) => x.points >= threshold).length
              : null,
          thresholdTotal: threshold != null ? list.length : null,
          threshold,
          classPointsDelta: fr?.class_points_delta ?? null,
        }
      }),
    [events, scoresByEvent],
  )

  // Top movers — change in member rank from prior → latest.
  const movers = useMemo<Mover[]>(() => {
    if (rollups.length < 2) return []
    const latest = events[events.length - 1]
    const prior = events[events.length - 2]
    const latestScores = scoresByEvent.get(latest.id) ?? []
    const priorScores = scoresByEvent.get(prior.id) ?? []
    const priorByMember = new Map<string, number>()
    for (const s of priorScores) priorByMember.set(s.member_id, s.rank_value)
    const result: Mover[] = []
    for (const s of latestScores) {
      const p = priorByMember.get(s.member_id)
      if (p == null) continue
      const m = memberMap.get(s.member_id)
      if (!m) continue
      result.push({
        memberId: s.member_id,
        name: m.canonical_name,
        latestRank: s.rank_value,
        priorRank: p,
        delta: p - s.rank_value, // positive = improved
      })
    }
    return result
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6)
  }, [rollups, events, scoresByEvent, memberMap])

  const ranks = useMemo(
    () => rollups.map((r) => r.factionAvgRank).filter((v) => v > 0),
    [rollups],
  )

  if (!code || !cfg) {
    return (
      <>
        <Header title="Pulse" />
        <main className="min-h-screen bg-ink pt-24 pb-bottom-nav px-5">
          <p className="text-bone/60 text-sm">Unknown event type.</p>
        </main>
        <BottomNav />
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header title={`${cfg.label} Pulse`} />
        <main className="min-h-screen bg-ink flex items-center justify-center pt-16 pb-bottom-nav">
          <motion.div
            className="w-10 h-10 rounded-full border-2 border-ember border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            aria-label="Loading"
          />
        </main>
        <BottomNav />
      </>
    )
  }

  if (error || rollups.length === 0) {
    return (
      <>
        <Header title={`${cfg.label} Pulse`} />
        <main className="min-h-screen bg-ink pt-24 pb-bottom-nav px-5">
          <div className="max-w-2xl mx-auto">
            <Eyebrow tone="ember" size="sm">
              Faction Pulse
            </Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-semibold text-bone">
              {cfg.label}
            </h1>
            <p className="mt-4 text-bone/55 text-sm">
              {error || "No events recorded for this type yet."}
            </p>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  const palette = paletteFor(code)
  const latest = rollups[rollups.length - 1]
  const prior = rollups.length >= 2 ? rollups[rollups.length - 2] : null

  return (
    <>
      <Header title={`${cfg.label} Pulse`} />
      <main
        id="main"
        className="min-h-screen bg-ink pt-20 pb-bottom-nav surface-1"
      >
        <div className="px-5 max-w-2xl mx-auto space-y-6">
          <HeroSection code={code} latest={latest} prior={prior} palette={palette} />
          <TrendSection rollups={rollups} palette={palette} code={code} />
          {code !== "gw_daily" && (
            <DistributionSection
              rollups={rollups}
              palette={palette}
              latestPoints={
                (scoresByEvent.get(rollups[rollups.length - 1].id) ?? []).map(
                  (s) => s.points,
                )
              }
            />
          )}
          {code === "gw_daily" && (
            <ClearRateSection rollups={rollups} palette={palette} />
          )}
          {movers.length > 0 && (
            <MoversSection movers={movers} palette={palette} />
          )}
          <TimelineSection
            rollups={rollups}
            palette={palette}
            onClick={(id) => router.push(`/events/${id}`)}
            code={code}
          />
        </div>
      </main>
      <BottomNav />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection({
  code,
  latest,
  prior,
  palette,
}: {
  code: Bucket
  latest: EventRollup
  prior: EventRollup | null
  palette: Palette
}) {
  const reducedMotion = useReducedMotion()
  const date = new Date(latest.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  // Compare against prior — interpretation differs by type.
  let primaryLabel = ""
  let primaryValue = ""
  let comparison: { delta: number; suffix: string; tone: Tone } | null = null

  if (code === "fcu") {
    primaryLabel = "Faction avg rank"
    primaryValue = `#${latest.factionAvgRank.toFixed(1)}`
    if (prior && prior.factionAvgRank > 0) {
      const delta = prior.factionAvgRank - latest.factionAvgRank
      comparison = {
        delta,
        suffix: "rank vs prior",
        // lower rank = better
        tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      }
    }
  } else if (code === "oak") {
    primaryLabel = "Placement"
    primaryValue = latest.placement ? `No.${latest.placement}` : "—"
    if (prior?.placement != null && latest.placement != null) {
      const delta = prior.placement - latest.placement
      comparison = {
        delta,
        suffix: "vs prior Oak",
        tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      }
    }
  } else {
    // gw_daily
    primaryLabel = "Cleared threshold"
    primaryValue =
      latest.thresholdTotal != null
        ? `${latest.thresholdHits ?? 0}/${latest.thresholdTotal}`
        : "—"
    if (prior?.thresholdTotal && latest.thresholdTotal) {
      const latestRate = (latest.thresholdHits ?? 0) / latest.thresholdTotal
      const priorRate = (prior.thresholdHits ?? 0) / prior.thresholdTotal
      const delta = latestRate - priorRate
      comparison = {
        delta: Math.round(delta * 100),
        suffix: "% vs prior day",
        tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      }
    }
  }

  return (
    <motion.section
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br",
        palette.surfaceFrom,
        palette.surfaceBorder,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          palette.rail,
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 pointer-events-none opacity-60",
          palette.glowMask,
        )}
      />
      <div className="relative p-5 md:p-6">
        <Eyebrow tone="ember" size="xs">
          Latest
        </Eyebrow>
        <p className="mt-1 text-[12px] text-bone/55 font-body inline-flex items-center gap-1.5">
          <Calendar size={11} aria-hidden="true" />
          {date}
        </p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl font-semibold text-bone tracking-[-0.01em] leading-tight">
          {latest.title}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body">
              {primaryLabel}
            </p>
            <p
              className={cn(
                "mt-1 font-mono font-bold tabular-nums text-[28px] md:text-[32px] leading-none",
                palette.accentText,
              )}
            >
              {primaryValue}
            </p>
            {comparison && (
              <DeltaPill comparison={comparison} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 content-start">
            <MiniCell label="Participants" value={String(latest.participantCount)} />
            <MiniCell
              label={code === "oak" ? "Top score" : code === "fcu" ? "Top points" : "Top points"}
              value={formatCompact(latest.topPoints)}
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function TrendSection({
  rollups,
  palette,
  code,
}: {
  rollups: EventRollup[]
  palette: Palette
  code: Bucket
}) {
  // For Oak, the trendline is placement (lower=better, drop missing).
  // For FCU & GW Daily, it's faction-average rank.
  const data =
    code === "oak"
      ? rollups
          .map((r) => r.placement)
          .filter((p): p is number => p != null)
      : rollups.map((r) => r.factionAvgRank).filter((v) => v > 0)
  if (data.length < 2) return null

  const best = Math.min(...data)
  const worst = Math.max(...data)
  const latest = data[data.length - 1]
  const overallAvg =
    data.reduce((s, x) => s + x, 0) / data.length

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <Eyebrow tone="ember" size="sm">
          Trend
        </Eyebrow>
        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          {code === "oak" ? "Placement" : "Faction avg rank"} · last {data.length}
        </span>
      </div>
      <div className="surface-3 rounded-2xl border border-ash p-4 md:p-5">
        <SparkLine
          data={data}
          width={520}
          height={70}
          color={palette.spark}
          inverted
          showLastDot
          fill
          label="Trend"
          className="w-full"
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TrendStat label="Latest" value={formatRankish(latest, code)} tone="accent" palette={palette} />
          <TrendStat label="Best" value={formatRankish(best, code)} palette={palette} />
          <TrendStat label="Avg" value={formatRankish(overallAvg, code)} palette={palette} />
        </div>
      </div>
    </section>
  )
}

function DistributionSection({
  rollups,
  palette,
  latestPoints,
}: {
  rollups: EventRollup[]
  palette: Palette
  latestPoints: number[]
}) {
  const latest = rollups[rollups.length - 1]
  if (!latest || latestPoints.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <Eyebrow tone="ember" size="sm">
          Latest distribution
        </Eyebrow>
        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          {latestPoints.length} members
        </span>
      </div>
      <div className="surface-3 rounded-2xl border border-ash p-4 md:p-5">
        <p className="text-[12px] text-bone/65 leading-snug">
          The leaderboard shape — how concentrated points are at the top
          versus spread across the roster.
        </p>
        <div className="mt-3">
          <Histogram
            data={latestPoints}
            height={64}
            color={palette.spark}
            cutoff={latest.threshold ?? null}
          />
        </div>
      </div>
    </section>
  )
}

function ClearRateSection({
  rollups,
  palette,
}: {
  rollups: EventRollup[]
  palette: Palette
}) {
  const days = rollups.filter((r) => r.thresholdTotal != null)
  if (days.length === 0) return null
  const totalHits = days.reduce((s, x) => s + (x.thresholdHits ?? 0), 0)
  const totalParticipants = days.reduce((s, x) => s + (x.thresholdTotal ?? 0), 0)
  const overall = totalParticipants > 0 ? totalHits / totalParticipants : 0
  const latest = days[days.length - 1]
  const latestRate =
    latest.thresholdTotal && latest.thresholdTotal > 0
      ? (latest.thresholdHits ?? 0) / latest.thresholdTotal
      : 0

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <Eyebrow tone="ember" size="sm">
          Threshold clear rate
        </Eyebrow>
        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          {days.length} days logged
        </span>
      </div>
      <div className="surface-3 rounded-2xl border border-ash p-4 md:p-5 space-y-3">
        <MicroBar
          value={overall}
          thickness={6}
          color={overall >= 0.8 ? "var(--ember)" : "var(--blood-light)"}
          ariaLabel={`${Math.round(overall * 100)}% overall clear rate`}
        />
        <div className="grid grid-cols-2 gap-3">
          <MiniCell
            label="Overall rate"
            value={`${Math.round(overall * 100)}%`}
            tone="accent"
            palette={palette}
          />
          <MiniCell
            label="Latest"
            value={`${Math.round(latestRate * 100)}%`}
            palette={palette}
          />
        </div>
      </div>
    </section>
  )
}

function MoversSection({
  movers,
  palette,
}: {
  movers: Mover[]
  palette: Palette
}) {
  const climbers = movers.filter((m) => m.delta > 0).slice(0, 4)
  const fallers = movers.filter((m) => m.delta < 0).slice(0, 4)
  return (
    <section className="space-y-3">
      <Eyebrow tone="ember" size="sm">
        Movers · latest vs prior
      </Eyebrow>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {climbers.length > 0 && (
          <div className="surface-3 rounded-2xl border border-ember/30 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2 inline-flex items-center gap-1">
              <ArrowUpRight size={11} className="text-ember" aria-hidden="true" />
              Climbers
            </p>
            <ul className="space-y-2">
              {climbers.map((m) => (
                <MoverRow key={m.memberId} mover={m} positive palette={palette} />
              ))}
            </ul>
          </div>
        )}
        {fallers.length > 0 && (
          <div className="surface-3 rounded-2xl border border-blood/30 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2 inline-flex items-center gap-1">
              <ArrowDownRight size={11} className="text-blood-light" aria-hidden="true" />
              Slipped
            </p>
            <ul className="space-y-2">
              {fallers.map((m) => (
                <MoverRow key={m.memberId} mover={m} positive={false} palette={palette} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function TimelineSection({
  rollups,
  palette,
  onClick,
  code,
}: {
  rollups: EventRollup[]
  palette: Palette
  onClick: (id: string) => void
  code: Bucket
}) {
  const reversed = [...rollups].reverse()
  return (
    <section className="space-y-3">
      <Eyebrow tone="ember" size="sm">
        Every {EVENT_TYPES[code].abbrev}
      </Eyebrow>
      <ol className="space-y-1.5">
        {reversed.map((r, idx) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onClick(r.id)}
              className={cn(
                "w-full text-left rounded-xl border bg-ink/40 hover:bg-ink/55 transition-colors px-3 py-2.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                idx === 0 ? "border-ember/45" : "border-ash/55",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-bone truncate">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-bone/50 mt-0.5">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {r.participantCount} member
                    {r.participantCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-[13px] font-mono tabular-nums font-bold", palette.accentText)}>
                    {code === "oak"
                      ? r.placement
                        ? `No.${r.placement}`
                        : "—"
                      : code === "gw_daily"
                        ? `${r.thresholdHits ?? 0}/${r.thresholdTotal ?? 0}`
                        : `avg #${r.factionAvgRank.toFixed(1)}`}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small components
// ─────────────────────────────────────────────────────────────────────────────

type Tone = "up" | "down" | "flat"

function DeltaPill({
  comparison,
}: {
  comparison: { delta: number; suffix: string; tone: Tone }
}) {
  const Icon =
    comparison.tone === "up"
      ? ArrowUpRight
      : comparison.tone === "down"
        ? ArrowDownRight
        : Minus
  const color =
    comparison.tone === "up"
      ? "text-ember"
      : comparison.tone === "down"
        ? "text-blood-light"
        : "text-bone/55"
  const bg =
    comparison.tone === "up"
      ? "bg-ember/10 border-ember/30"
      : comparison.tone === "down"
        ? "bg-blood/10 border-blood/30"
        : "bg-bone/5 border-ash"
  return (
    <span
      className={cn(
        "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        bg,
      )}
    >
      <Icon size={11} className={color} aria-hidden="true" />
      <span className={cn("text-[11px] font-mono tabular-nums", color)}>
        {Math.abs(comparison.delta).toFixed(1)} {comparison.suffix}
      </span>
    </span>
  )
}

function MiniCell({
  label,
  value,
  tone,
  palette,
}: {
  label: string
  value: string
  tone?: "accent" | "default"
  palette?: Palette
}) {
  return (
    <div className="rounded-lg bg-ink/55 border border-ash/55 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body leading-tight">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono font-bold tabular-nums leading-tight text-[15px]",
          tone === "accent" && palette ? palette.accentText : "text-bone",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function TrendStat({
  label,
  value,
  tone,
  palette,
}: {
  label: string
  value: string
  tone?: "accent" | "default"
  palette: Palette
}) {
  return (
    <div className="rounded-lg bg-ink/50 border border-ash/55 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body leading-tight">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono font-bold tabular-nums leading-tight text-[14px]",
          tone === "accent" ? palette.accentText : "text-bone",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function MoverRow({
  mover,
  positive,
  palette,
}: {
  mover: Mover
  positive: boolean
  palette: Palette
}) {
  return (
    <li className="flex items-center gap-3 text-[12px]">
      <Link
        href={`/members/${mover.memberId}`}
        className="flex-1 truncate text-bone hover:text-ember"
      >
        {mover.name}
      </Link>
      <span className="text-bone/45 font-mono tabular-nums text-[11px]">
        #{mover.priorRank}→#{mover.latestRank}
      </span>
      <span
        className={cn(
          "font-mono font-bold tabular-nums",
          positive ? palette.accentText : "text-blood-light",
        )}
      >
        {positive ? "+" : ""}
        {mover.delta}
      </span>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeBucket(v: string | undefined): Bucket | null {
  if (v === "fcu") return "fcu"
  if (v === "oak" || v === "goa" || v === "sgoa") return "oak"
  if (v === "gw_daily" || v === "gw-sl" || v === "gw-fh") return "gw_daily"
  return null
}

function legacyCodesFor(code: Bucket): string[] {
  if (code === "oak") return ["oak", "goa", "sgoa"]
  if (code === "gw_daily") return ["gw_daily", "gw-sl", "gw-fh"]
  return [code]
}

function formatRankish(value: number, code: Bucket): string {
  if (code === "oak") return `No.${value.toFixed(0)}`
  return `#${value.toFixed(1).replace(/\.0$/, "")}`
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette — must mirror FactionTypeSnapshot.tsx so the visual journey holds.
// ─────────────────────────────────────────────────────────────────────────────

interface Palette {
  rail: string
  surfaceFrom: string
  surfaceBorder: string
  glowMask: string
  spark: string
  accentText: string
}

function paletteFor(code: Bucket): Palette {
  if (code === "fcu") {
    return {
      rail: "bg-gradient-to-b from-blood-light via-blood to-blood-dark",
      surfaceFrom: "from-blood/10 via-blood-dark/8 to-ink-100/20",
      surfaceBorder: "border-blood/30",
      glowMask:
        "[background:radial-gradient(ellipse_at_top_right,rgba(163,27,27,0.16),transparent_60%)]",
      spark: "var(--blood-light)",
      accentText: "text-blood-light",
    }
  }
  if (code === "oak") {
    return {
      rail: "bg-gradient-to-b from-ember-light via-ember to-ember-dark",
      surfaceFrom: "from-ember/10 via-ember-dark/6 to-ink-100/20",
      surfaceBorder: "border-ember/35",
      glowMask:
        "[background:radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.16),transparent_60%)]",
      spark: "var(--ember)",
      accentText: "text-ember",
    }
  }
  return {
    rail: "bg-gradient-to-b from-blood-light via-blood to-ember-dark",
    surfaceFrom: "from-blood/12 via-ember-dark/8 to-ink-100/20",
    surfaceBorder: "border-blood/35",
    glowMask:
      "[background:radial-gradient(ellipse_at_top_right,rgba(163,27,27,0.16),transparent_60%)]",
    spark: "var(--blood-light)",
    accentText: "text-blood-light",
  }
}
