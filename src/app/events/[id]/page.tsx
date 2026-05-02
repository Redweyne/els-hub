"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { Calendar, ChevronRight, Sword } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Eyebrow, Numeric } from "@/components/typography"
import { OrnateDivider } from "@/components/heraldry"
import {
  FactionPlacementMedal,
  BattleStatsTrio,
  CategoryHeroes,
  type CategoryHero,
} from "@/components/event/oak"
import { GWDailyHero, DayTypeBadge } from "@/components/event/gw"
import { MemberAvatar } from "@/components/member"
import { DeltaArrow, MicroBar, Histogram } from "@/components/dataviz"
import {
  getEventConfig,
  getGWDayConfig,
  type EventTypeCode,
  type GWDailyMeta,
  type OakReportCard,
} from "@/lib/events/config"
import { getDayAtOffset } from "@/lib/gw/schedule"
import { cn } from "@/lib/cn"

interface EventScore {
  id: string
  member_id: string
  rank_value: number
  points: number
  accept_current: number | null
  accept_max: number | null
}

interface Member {
  id: string
  canonical_name: string
  rank_tier: string
  avatar_url: string | null
}

interface EventRow {
  id: string
  title: string
  event_type_code: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
  status: string
  meta_json: Record<string, unknown> | null
  faction_result_json: Record<string, unknown> | null
}

interface CampaignDay {
  id: string
  meta_json: GWDailyMeta
  status: string
  created_at: string
  scoresHit: number
  scoresTotal: number
}

const DEFAULT_THRESHOLD: Record<EventTypeCode, number> = {
  fcu: 1700,
  oak: 120_000,
  gw_daily: 0, // overridden by meta.min_points
  gw_campaign: 0,
}

export default function EventPage() {
  const params = useParams<{ id: string }>()
  const eventId = params.id

  const [event, setEvent] = useState<EventRow | null>(null)
  const [scores, setScores] = useState<EventScore[]>([])
  const [members, setMembers] = useState<Record<string, Member>>({})
  const [campaignDays, setCampaignDays] = useState<CampaignDay[]>([])
  const [priorRanks, setPriorRanks] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        const { data: ev, error: evErr } = await supabase
          .from("events")
          .select(
            "id, title, event_type_code, starts_at, ends_at, created_at, status, meta_json, faction_result_json",
          )
          .eq("id", eventId)
          .single()
        if (evErr) throw evErr
        setEvent(ev as EventRow)

        // For gw_campaign: fetch its child dailies and their hit-counts.
        if (ev.event_type_code === "gw_campaign") {
          const { data: dailies } = await supabase
            .from("events")
            .select("id, meta_json, status, created_at")
            .eq("event_type_code", "gw_daily")
            .contains("meta_json", { campaign_id: eventId })
            .order("meta_json->>day_in_cycle", { ascending: true })
          const dailyRows = (dailies ?? []) as Array<{
            id: string
            meta_json: GWDailyMeta
            status: string
            created_at: string
          }>
          // For each daily, count hits (member-scores >= threshold).
          const enriched: CampaignDay[] = await Promise.all(
            dailyRows.map(async (d) => {
              const { data: ds } = await supabase
                .from("event_scores")
                .select("points")
                .eq("event_id", d.id)
              const total = ds?.length ?? 0
              const hit = (ds ?? []).filter(
                (s) => (s.points ?? 0) >= (d.meta_json?.min_points ?? 0),
              ).length
              return { ...d, scoresHit: hit, scoresTotal: total }
            }),
          )
          setCampaignDays(enriched)
        } else {
          const { data: ss, error: ssErr } = await supabase
            .from("event_scores")
            .select("*")
            .eq("event_id", eventId)
            .order("points", { ascending: false })
          if (ssErr) throw ssErr
          setScores((ss ?? []) as EventScore[])

          if (ss && ss.length > 0) {
            const memberIds = [...new Set(ss.map((s) => s.member_id))]
            const { data: ms } = await supabase
              .from("members")
              .select("id, canonical_name, rank_tier, family_role, avatar_url")
              .in("id", memberIds)
            const map: Record<string, Member> = {}
            ;(ms ?? []).forEach((m) => {
              map[m.id] = m as Member
            })
            setMembers(map)

            // Fetch prior event of same type to compute per-row rank deltas.
            const { data: priorEvent } = await supabase
              .from("events")
              .select("id, created_at")
              .eq("event_type_code", ev.event_type_code)
              .eq("status", "published")
              .lt("created_at", ev.created_at)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (priorEvent) {
              const { data: priorScores } = await supabase
                .from("event_scores")
                .select("member_id, rank_value")
                .eq("event_id", priorEvent.id)
                .in("member_id", memberIds)
              const priors: Record<string, number> = {}
              for (const p of priorScores ?? []) {
                priors[p.member_id] = p.rank_value
              }
              setPriorRanks(priors)
            }
          }
        }
      } catch (err) {
        console.error("Load event error:", err)
        setError("Failed to load event")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [eventId])

  if (isLoading) {
    return (
      <>
        <Header title="Event" />
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

  if (error || !event) {
    return (
      <>
        <Header title="Event" />
        <main className="min-h-screen bg-ink pt-32 pb-bottom-nav px-5">
          <div className="max-w-2xl mx-auto py-8">
            <p className="text-bone/60 text-sm">{error || "Event not found."}</p>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  const cfg = getEventConfig(event.event_type_code) ?? getEventConfig("fcu")!
  const eventCode = cfg.code

  return (
    <>
      <Header title={event.title || cfg.label} />
      <main id="main" className="min-h-screen bg-ink pt-20 pb-bottom-nav surface-1">
        <div className="px-5 max-w-2xl mx-auto space-y-6 md:space-y-8">
          {/* Type-specific hero */}
          {eventCode === "oak" ? (
            <OakHero event={event} />
          ) : eventCode === "gw_daily" ? (
            <GWDailyHeroBlock event={event} scores={scores} />
          ) : eventCode === "gw_campaign" ? (
            <GWCampaignHero event={event} dailies={campaignDays} />
          ) : (
            <FCUHero event={event} scores={scores} />
          )}

          {/* Leaderboard (everything except gw_campaign) */}
          {eventCode !== "gw_campaign" && scores.length > 0 && (
            <Leaderboard
              scores={scores}
              members={members}
              event={event}
              eventCode={eventCode}
              priorRanks={priorRanks}
            />
          )}

          {/* GW Campaign — list of daily children */}
          {eventCode === "gw_campaign" && (
            <CampaignDailiesList event={event} dailies={campaignDays} />
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero variants
// ─────────────────────────────────────────────────────────────────────────────

function FCUHero({ event, scores }: { event: EventRow; scores: EventScore[] }) {
  const total = scores.reduce((s, x) => s + x.points, 0)
  const avg = scores.length > 0 ? Math.round(total / scores.length) : 0
  const qualified = scores.filter((s) => s.points >= 1700).length
  const completion =
    scores.length > 0 ? Math.round((qualified / scores.length) * 100) : 0
  const dateStr = new Date(event.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section className="space-y-4 pt-2">
      <div>
        <Eyebrow tone="ember" size="sm">
          Faction Call-Up
        </Eyebrow>
        <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-bone tracking-[-0.01em]">
          {event.title}
        </h1>
        <p className="mt-1 text-bone/55 text-[12px] font-body inline-flex items-center gap-1.5">
          <Calendar size={11} aria-hidden="true" />
          {dateStr}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FactStat label="Total" value={total} format="compact" />
        <FactStat label="Avg" value={avg} format="compact" />
        <FactStat
          label="Qualified"
          value={completion}
          format="percentage"
          tone={completion >= 80 ? "ember" : "blood"}
        />
      </div>
    </section>
  )
}

function OakHero({ event }: { event: EventRow }) {
  const card = (event.faction_result_json as OakReportCard | null) ?? null
  if (!card || !card.placement) {
    return (
      <section className="space-y-4 pt-2">
        <div>
          <Eyebrow tone="ember" size="sm">
            Glory of Oakvale
          </Eyebrow>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-bone tracking-[-0.01em]">
            {event.title}
          </h1>
          <p className="mt-1.5 text-bone/55 text-[12px] font-body">
            Faction report card not yet captured.
          </p>
        </div>
      </section>
    )
  }
  const heroes: CategoryHero[] = (
    [
      { category: "total", ...card.best_of_all.total },
      { category: "kill", ...card.best_of_all.kill },
      { category: "occupation", ...card.best_of_all.occupation },
    ] as CategoryHero[]
  ).filter((h) => h.name)

  return (
    <section className="space-y-4 pt-2">
      <div>
        <Eyebrow tone="ember" size="sm">
          Glory of Oakvale
        </Eyebrow>
        <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-bone tracking-[-0.01em]">
          {event.title}
        </h1>
        <p className="mt-1 text-bone/55 text-[12px] font-body inline-flex items-center gap-1.5">
          <Calendar size={11} aria-hidden="true" />
          {new Date(event.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <FactionPlacementMedal
        placement={card.placement}
        classPoints={card.class_points}
        classPointsDelta={card.class_points_delta}
        idScope={`oak-${event.id}`}
      />
      <div>
        <Eyebrow tone="ember" size="xs">
          Battle Stats
        </Eyebrow>
        <div className="mt-2">
          <BattleStatsTrio
            total={card.battle_stats.total}
            kill={card.battle_stats.kill}
            occupation={card.battle_stats.occupation}
          />
        </div>
      </div>
      {heroes.length > 0 && (
        <div>
          <Eyebrow tone="ember" size="xs">
            Best of All
          </Eyebrow>
          <div className="mt-2">
            <CategoryHeroes heroes={heroes} />
          </div>
        </div>
      )}
    </section>
  )
}

function GWDailyHeroBlock({
  event,
  scores,
}: {
  event: EventRow
  scores: EventScore[]
}) {
  // Recompute "isActive" against a state-tracked clock so renders stay pure.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const meta = (event.meta_json as GWDailyMeta | null) ?? null
  if (!meta?.day_type) {
    return (
      <section>
        <Eyebrow tone="ember" size="sm">
          Governor&apos;s War
        </Eyebrow>
        <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-bone tracking-[-0.01em]">
          {event.title}
        </h1>
      </section>
    )
  }
  const totalPoints = scores.reduce((s, x) => s + x.points, 0)
  const hitCount = scores.filter((s) => s.points >= meta.min_points).length
  const isActive =
    !!meta.deadline_iso &&
    !!now &&
    new Date(meta.deadline_iso).getTime() > now.getTime()

  return (
    <section className="space-y-3 pt-2">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-bone tracking-[-0.01em]">
        {event.title}
      </h1>
      <GWDailyHero
        meta={meta}
        totalPoints={totalPoints}
        hitCount={hitCount}
        participantCount={scores.length}
        isActive={isActive}
      />
    </section>
  )
}

function GWCampaignHero({
  event,
  dailies,
}: {
  event: EventRow
  dailies: CampaignDay[]
}) {
  const meta = event.meta_json as
    | { start_date_iso: string; expected_days: number }
    | null
  const completed = dailies.length
  const expected = meta?.expected_days ?? 50
  const totalPoints = dailies.reduce(
    (s, d) => s + (d.scoresTotal > 0 ? 1 : 0),
    0,
  )
  return (
    <section className="space-y-4 pt-2">
      <div>
        <Eyebrow tone="ember" size="sm">
          Governor&apos;s War — Campaign
        </Eyebrow>
        <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-bone tracking-[-0.01em]">
          {event.title}
        </h1>
        <p className="mt-1.5 text-bone/55 text-[12px] font-body">
          {completed} day{completed === 1 ? "" : "s"} recorded · {expected}-day arc
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FactStat label="Logged" value={completed} format="raw" />
        <FactStat label="Expected" value={expected} format="raw" tone="muted" />
        <FactStat
          label="Coverage"
          value={expected > 0 ? Math.round((completed / expected) * 100) : 0}
          format="percentage"
          tone="ember"
        />
      </div>
      {/* Suppress unused-var hint */}
      <span className="hidden">{totalPoints}</span>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────────────────────────────────────

function Leaderboard({
  scores,
  members,
  event,
  eventCode,
  priorRanks,
}: {
  scores: EventScore[]
  members: Record<string, Member>
  event: EventRow
  eventCode: EventTypeCode
  priorRanks: Record<string, number>
}) {
  const reducedMotion = useReducedMotion()
  const sorted = useMemo(
    () => [...scores].sort((a, b) => b.points - a.points),
    [scores],
  )

  // Pick threshold per event type.
  const meta = event.meta_json as GWDailyMeta | null
  const threshold =
    eventCode === "gw_daily" && meta
      ? meta.min_points
      : DEFAULT_THRESHOLD[eventCode]

  // Distribution histogram data — points per member.
  const distribution = useMemo(() => sorted.map((s) => s.points), [sorted])

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <Eyebrow tone="ember" size="xs">
          Full Leaderboard
        </Eyebrow>
        <span className="flex-1 h-px bg-ash/40" />
        <span className="text-[10px] text-bone/45 font-mono tabular-nums">
          {sorted.length} member{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Distribution histogram with cutoff marker — only when threshold meaningful. */}
      {threshold > 0 && distribution.length >= 6 && (
        <div className="surface-3 rounded-xl border border-ash/60 px-3 py-3 mb-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <Eyebrow tone="muted" size="xs">
              Distribution
            </Eyebrow>
            <span className="text-[10px] text-bone/45 font-mono tabular-nums">
              cutoff {threshold.toLocaleString()}
            </span>
          </div>
          <Histogram
            data={distribution}
            cutoff={threshold}
            color="var(--bone-dim)"
            colorAboveCutoff="var(--ember)"
            width={320}
            height={48}
            className="w-full text-bone-dim"
            ariaLabel={`Distribution of ${distribution.length} scores around the ${threshold.toLocaleString()} cutoff`}
          />
        </div>
      )}

      <ul className="space-y-1.5">
        {sorted.map((score, idx) => {
          const member = members[score.member_id]
          const isQualified = threshold > 0 ? score.points >= threshold : true
          const ratio = threshold > 0 ? Math.min(1, score.points / threshold) : 1
          const isTop3 = idx < 3
          // Lower rank value is better, so prior - current = improvement.
          const priorRank = priorRanks[score.member_id]
          const rankDelta =
            priorRank != null ? priorRank - score.rank_value : null
          return (
            <motion.li
              key={score.id}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.02, 0.4),
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className={cn(
                "rounded-xl border overflow-hidden",
                isTop3
                  ? "border-ember/30 bg-ember/5"
                  : isQualified
                    ? "border-ash/40 bg-smoke/40"
                    : "border-ash/20 bg-smoke/20",
              )}
            >
              <Link
                href={`/members/${score.member_id}`}
                className="flex items-center gap-3 px-3 py-2.5 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                style={{ viewTransitionName: `member-${score.member_id}-row` }}
              >
                <span
                  className={cn(
                    "w-6 font-mono text-sm font-bold flex-shrink-0 tabular-nums text-center",
                    idx === 0
                      ? "text-ember"
                      : idx === 1
                        ? "text-bone/70"
                        : idx === 2
                          ? "text-[#d89a6c]"
                          : "text-bone/35",
                  )}
                >
                  {idx + 1}
                </span>
                <MemberAvatar
                  name={member?.canonical_name ?? "?"}
                  tier={member?.rank_tier ?? "frontliner"}
                  size={32}
                  static
                  idScope={`lb-${score.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        isTop3 ? "text-bone" : "text-bone/85",
                      )}
                    >
                      {member?.canonical_name ?? "Unknown"}
                    </p>
                    {rankDelta != null && rankDelta !== 0 && (
                      <DeltaArrow
                        delta={rankDelta}
                        size={10}
                        className="flex-shrink-0"
                      />
                    )}
                  </div>
                  {threshold > 0 && (
                    <div className="mt-1.5">
                      <MicroBar
                        value={ratio}
                        thickness={3}
                        color={isQualified ? "var(--ember)" : "var(--blood)"}
                        delay={Math.min(idx * 0.02, 0.3)}
                        ariaLabel={`${Math.round(ratio * 100)}% of threshold`}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      isTop3 ? "text-bone" : "text-bone/75",
                    )}
                  >
                    <Numeric
                      value={score.points}
                      format="comma"
                      animateOnView={false}
                    />
                  </p>
                  {eventCode === "fcu" && score.accept_max != null && (
                    <p className="text-[10px] text-bone/35 font-mono">
                      {score.accept_current}/{score.accept_max}
                    </p>
                  )}
                </div>
              </Link>
            </motion.li>
          )
        })}
      </ul>
      {threshold > 0 && (
        <div className="flex items-center gap-3 mt-4 px-1 text-[10px] text-bone/45">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
            Met ({threshold.toLocaleString()})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blood/60" aria-hidden="true" />
            Below
          </span>
        </div>
      )}
    </section>
  )
}

function CampaignDailiesList({
  event,
  dailies,
}: {
  event: EventRow
  dailies: CampaignDay[]
}) {
  const meta = event.meta_json as
    | { start_date_iso: string; expected_days: number }
    | null
  if (!meta) return null

  // Build a 50-cell preview, marking which are completed.
  const cells = Array.from({ length: meta.expected_days }).map((_, i) => {
    const preview = getDayAtOffset(meta.start_date_iso, i, meta.expected_days)
    const matching = dailies.find(
      (d) =>
        d.meta_json.day_in_cycle === preview.dayInCycle &&
        d.meta_json.super_cycle === preview.superCycle &&
        d.meta_json.cycle === preview.cycle,
    )
    return { preview, daily: matching ?? null }
  })

  return (
    <section className="space-y-4">
      <div>
        <Eyebrow tone="ember" size="xs">
          Campaign Days
        </Eyebrow>
        <p className="text-[11px] text-bone/45 mt-1 font-body">
          Tap a logged day to see results.
        </p>
      </div>
      <ul className="space-y-1.5">
        {cells.map(({ preview, daily }) => {
          const dateStr = new Date(preview.dayStartIso!).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          )
          const cycle = preview.cycle
          const dayCfg = getGWDayConfig(preview.dayType)
          const completionPct =
            daily && daily.scoresTotal > 0
              ? Math.round((daily.scoresHit / daily.scoresTotal) * 100)
              : 0
          const wrapperClass = cn(
            "block surface-3 rounded-xl border px-3 py-2.5 transition-all",
            daily
              ? "border-ash hover:border-ember/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              : "border-ash/30 opacity-55",
          )
          const inner = (
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-bone/45 w-7 tabular-nums flex-shrink-0">
                    {preview.dayOffset + 1}
                  </span>
                  <Sword
                    size={12}
                    className={cn(
                      "flex-shrink-0",
                      cycle === "war" ? "text-blood-light" : "text-ember",
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-bone">
                        {dayCfg.label}
                      </span>
                      <DayTypeBadge
                        dayType={preview.dayType}
                        cycle={cycle}
                        size="xs"
                      />
                    </div>
                    <p className="text-[10px] text-bone/45 mt-0.5">
                      {dateStr}
                    </p>
                  </div>
                  {daily ? (
                    <>
                      <span className="font-mono text-[11px] text-bone/65 tabular-nums flex-shrink-0">
                        {daily.scoresHit}/{daily.scoresTotal}
                      </span>
                      <div className="w-10 h-1 bg-ash/40 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={cn(
                            "h-full",
                            cycle === "war" ? "bg-blood-light" : "bg-ember",
                          )}
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-bone/30 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-bone/30 font-body flex-shrink-0">
                      Not yet
                    </span>
                  )}
                </div>
          )
          return (
            <li key={`${preview.superCycle}-${preview.dayOffset}`}>
              {daily ? (
                <Link href={`/events/${daily.id}`} className={wrapperClass}>
                  {inner}
                </Link>
              ) : (
                <div className={wrapperClass}>{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="pt-4">
        <OrnateDivider variant="fleur" label={meta.expected_days + "-day arc"} />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function FactStat({
  label,
  value,
  format,
  tone = "default",
}: {
  label: string
  value: number
  format: "raw" | "compact" | "comma" | "percentage"
  tone?: "default" | "ember" | "blood" | "muted"
}) {
  const valueClass =
    tone === "ember"
      ? "text-ember"
      : tone === "blood"
        ? "text-blood-light"
        : tone === "muted"
          ? "text-bone/65"
          : "text-bone"
  return (
    <div className="surface-3 rounded-xl border border-ash p-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
        {label}
      </p>
      <Numeric
        value={value}
        format={format}
        precision={1}
        className={cn("mt-1 text-lg md:text-xl font-bold", valueClass)}
      />
    </div>
  )
}
