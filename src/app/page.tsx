"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"

import { BottomNav } from "@/components/layout/BottomNav"
import { AuthPill } from "@/components/layout/AuthPill"
import { IntroSequence } from "@/components/intro/IntroSequence"
import {
  CommandCenterHero,
  ActiveEventCard,
  PodiumTopThree,
  HonorWallPreview,
  RightNowStrip,
  GWPulseChart,
  ActivityFeed,
  MixedEventTimeline,
  FactionHeartbeat,
  TopMovers,
} from "@/components/home"
import type { PodiumPerformer, HonorEntry } from "@/components/home"
import type {
  EventTypeCode,
  GWCampaignMeta,
  GWDailyMeta,
} from "@/lib/events/config"
import { getActiveGWDay } from "@/lib/gw/schedule"
import { Section } from "@/components/motion/Section"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { OrnateDivider } from "@/components/heraldry"
import { NetworkError } from "@/components/ui/network-error"

interface EventRow {
  id: string
  title: string
  event_type_code?: string | null
  starts_at?: string | null
  ends_at?: string | null
  created_at: string
  status: string
  faction_result_json?: { placement?: number } | null
}

interface UserProfile {
  id: string
  username: string
  linked_member_id: string | null
}

interface ProcessingEventRow {
  id: string
  title: string
  event_type_code: EventTypeCode
  meta_json: GWDailyMeta | GWCampaignMeta | null
}

interface CampaignDaily {
  id: string
  meta_json: GWDailyMeta
  scoresHit: number
  scoresTotal: number
}

interface LastEventParticipation {
  eventId: string
  eventTitle: string
  rank: number
  points: number
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [totalInfluence, setTotalInfluence] = useState(0)
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null)
  const [latestEvent, setLatestEvent] = useState<EventRow | null>(null)
  const [topPerformers, setTopPerformers] = useState<PodiumPerformer[]>([])
  const [honors, setHonors] = useState<HonorEntry[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [lastEventParticipation, setLastEventParticipation] =
    useState<LastEventParticipation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // War-room state
  const [activeCampaign, setActiveCampaign] = useState<ProcessingEventRow | null>(null)
  const [otherProcessing, setOtherProcessing] = useState<ProcessingEventRow[]>([])
  const [todayGWDaily, setTodayGWDaily] = useState<ProcessingEventRow | null>(null)
  const [todayProgress, setTodayProgress] = useState<{
    hits: number
    total: number
    totalPoints: number
    topThree?: Array<{ id: string; name: string; tier: string | null }>
  } | null>(null)
  const [campaignDailies, setCampaignDailies] = useState<CampaignDaily[]>([])

  // Hero series + heartbeat + movers state
  const [influenceSeries, setInfluenceSeries] = useState<number[]>([])
  const [placementSeries, setPlacementSeries] = useState<number[]>([])
  const [pulseSeries, setPulseSeries] = useState<number[]>([])
  const [heartbeatRecent, setHeartbeatRecent] = useState<
    Array<{ at: string; avgRank: number; totalPoints?: number; title: string }>
  >([])
  const [heartbeatPlacements, setHeartbeatPlacements] = useState<
    Array<{ placement: number; count: number }>
  >([])
  const [risers, setRisers] = useState<
    Array<{
      memberId: string
      name: string
      tier: string | null
      delta: number
      recentRanks: number[]
    }>
  >([])
  const [fallers, setFallers] = useState<
    Array<{
      memberId: string
      name: string
      tier: string | null
      delta: number
      recentRanks: number[]
    }>
  >([])

  useEffect(() => {
    const introShown = sessionStorage.getItem("introShownThisSession")
    if (!introShown) {
      setShowIntro(true)
      sessionStorage.setItem("introShownThisSession", "true")
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, linked_member_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle()

        if (profile) {
          setUser(profile as UserProfile)
          if (profile.linked_member_id) {
            const { data: lastScore } = await supabase
              .from("event_scores")
              .select(
                "id, rank_value, points, events:event_id(id, title)",
              )
              .eq("member_id", profile.linked_member_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (lastScore) {
              const ev = Array.isArray(lastScore.events)
                ? lastScore.events[0]
                : lastScore.events
              if (ev) {
                setLastEventParticipation({
                  eventId: ev.id,
                  eventTitle: ev.title,
                  rank: lastScore.rank_value,
                  points: lastScore.points,
                })
              }
            }
          }
        }
      }

      const { data: members } = await supabase
        .from("members")
        .select("id, influence")
        .eq("is_active", true)
      setMemberCount(members?.length || 0)
      const totalInf =
        members?.reduce((sum, m) => sum + (m.influence || 0), 0) || 0
      setTotalInfluence(totalInf)

      const { data: active } = await supabase
        .from("events")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveEvent(active as EventRow | null)

      // ── War room: load active GW campaign + dailies + other processing events.
      const { data: allProcessing } = await supabase
        .from("events")
        .select("id, title, event_type_code, meta_json")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
      const procRows = (allProcessing ?? []) as ProcessingEventRow[]
      const campaign = procRows.find((e) => e.event_type_code === "gw_campaign") ?? null
      setActiveCampaign(campaign)
      setOtherProcessing(
        procRows.filter((e) => e.event_type_code !== "gw_campaign"),
      )

      if (campaign && campaign.meta_json && "start_date_iso" in campaign.meta_json) {
        const meta = campaign.meta_json as GWCampaignMeta
        // Pull all dailies under this campaign and enrich with hit-counts.
        const { data: dailies } = await supabase
          .from("events")
          .select("id, meta_json")
          .eq("event_type_code", "gw_daily")
          .contains("meta_json", { campaign_id: campaign.id })
        const dailyRows = (dailies ?? []) as Array<{
          id: string
          meta_json: GWDailyMeta
        }>
        const enriched: CampaignDaily[] = await Promise.all(
          dailyRows.map(async (d) => {
            const { data: ds } = await supabase
              .from("event_scores")
              .select("points")
              .eq("event_id", d.id)
            const total = ds?.length ?? 0
            const hit = (ds ?? []).filter(
              (s) => (s.points ?? 0) >= (d.meta_json?.min_points ?? 0),
            ).length
            return { id: d.id, meta_json: d.meta_json, scoresHit: hit, scoresTotal: total }
          }),
        )
        setCampaignDailies(enriched)

        // Find today's daily (matches active super-cycle / cycle / day).
        const activeDay = getActiveGWDay(meta.start_date_iso, meta.expected_days)
        const today = enriched.find(
          (d) =>
            d.meta_json.cycle === activeDay.cycle &&
            d.meta_json.super_cycle === activeDay.superCycle &&
            d.meta_json.day_in_cycle === activeDay.dayInCycle,
        )
        if (today) {
          // Re-fetch as a ProcessingEventRow shape for the strip.
          setTodayGWDaily({
            id: today.id,
            title: `Day ${today.meta_json.day_in_cycle} · ${today.meta_json.day_type}`,
            event_type_code: "gw_daily",
            meta_json: today.meta_json,
          })
          // Also pull total points for the strip's progress bar.
          const { data: ts } = await supabase
            .from("event_scores")
            .select("points")
            .eq("event_id", today.id)
          const pts = (ts ?? []).reduce((s, x) => s + (x.points ?? 0), 0)
          setTodayProgress({
            hits: today.scoresHit,
            total: today.scoresTotal,
            totalPoints: pts,
          })
        } else {
          setTodayGWDaily(null)
          setTodayProgress(null)
        }
      } else {
        setCampaignDailies([])
        setTodayGWDaily(null)
        setTodayProgress(null)
      }

      // ── Heartbeat / hero series / top movers (parallel single fetch).
      const { data: recentEvents12 } = await supabase
        .from("events")
        .select(
          "id, title, created_at, event_type_code, faction_result_json",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12)
      const evs = (recentEvents12 ?? []) as Array<{
        id: string
        title: string
        created_at: string
        event_type_code: string | null
        faction_result_json: { placement?: number } | null
      }>

      // Hero placement series — oldest → newest, last up to 8 events.
      const placementsOldFirst = [...evs]
        .reverse()
        .map((e) => e.faction_result_json?.placement ?? null)
        .filter((p): p is number => p != null)
      setPlacementSeries(placementsOldFirst.slice(-8))

      // Heartbeat placement bucket counts (gold/silver/bronze/other).
      const buckets = new Map<number, number>()
      for (const e of evs) {
        const p = e.faction_result_json?.placement
        if (p == null) continue
        const slot = p <= 3 ? p : 4
        buckets.set(slot, (buckets.get(slot) ?? 0) + 1)
      }
      setHeartbeatPlacements(
        Array.from(buckets.entries())
          .map(([placement, count]) => ({ placement, count }))
          .sort((a, b) => a.placement - b.placement),
      )

      if (evs.length > 0) {
        const eventIds = evs.map((e) => e.id)
        const { data: allScores } = await supabase
          .from("event_scores")
          .select(
            "event_id, member_id, rank_value, points, members:member_id(canonical_name, rank_tier)",
          )
          .in("event_id", eventIds)
        const scores = (allScores ?? []) as Array<{
          event_id: string
          member_id: string
          rank_value: number
          points: number
          members:
            | { canonical_name: string; rank_tier: string | null }
            | Array<{ canonical_name: string; rank_tier: string | null }>
            | null
        }>
        const scoresByEvent = new Map<string, typeof scores>()
        for (const s of scores) {
          const list = scoresByEvent.get(s.event_id) ?? ([] as typeof scores)
          list.push(s)
          scoresByEvent.set(s.event_id, list)
        }

        // Heartbeat trajectory: avg rank per event, oldest → newest.
        const trajectory: Array<{
          at: string
          avgRank: number
          totalPoints?: number
          title: string
        }> = []
        const influenceTrend: number[] = []
        for (const e of [...evs].reverse()) {
          const list = scoresByEvent.get(e.id) ?? []
          if (list.length === 0) continue
          const avgRank =
            list.reduce((s, x) => s + x.rank_value, 0) / list.length
          const totalPoints = list.reduce((s, x) => s + x.points, 0)
          trajectory.push({
            at: e.created_at,
            avgRank,
            totalPoints,
            title: e.title,
          })
          influenceTrend.push(totalPoints)
        }
        setHeartbeatRecent(trajectory)
        setInfluenceSeries(influenceTrend.slice(-8))

        // Pulse series — events per day in the last 14 days.
        const dayBucket = new Map<string, number>()
        const today = new Date()
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
          dayBucket.set(d.toISOString().slice(0, 10), 0)
        }
        for (const e of evs) {
          const k = new Date(e.created_at).toISOString().slice(0, 10)
          if (dayBucket.has(k)) dayBucket.set(k, (dayBucket.get(k) ?? 0) + 1)
        }
        setPulseSeries(Array.from(dayBucket.values()))

        // Top movers: most recent event vs prior of same type.
        if (evs.length >= 2) {
          const latest = evs[0]
          const prior = evs.find(
            (e, i) => i > 0 && e.event_type_code === latest.event_type_code,
          )
          if (prior) {
            const latestList = scoresByEvent.get(latest.id) ?? []
            const priorMap = new Map<string, number>()
            for (const s of scoresByEvent.get(prior.id) ?? []) {
              priorMap.set(s.member_id, s.rank_value)
            }
            // Build per-member rank history (last 6 of any type) for sparklines.
            const recentByMember = new Map<string, number[]>()
            for (const e of [...evs].reverse()) {
              for (const s of scoresByEvent.get(e.id) ?? []) {
                const arr = recentByMember.get(s.member_id) ?? []
                arr.push(s.rank_value)
                recentByMember.set(s.member_id, arr)
              }
            }
            const movers: Array<{
              memberId: string
              name: string
              tier: string | null
              delta: number
              recentRanks: number[]
            }> = []
            for (const s of latestList) {
              const prev = priorMap.get(s.member_id)
              if (prev == null) continue
              const delta = prev - s.rank_value // + improved
              if (delta === 0) continue
              const m = Array.isArray(s.members) ? s.members[0] : s.members
              movers.push({
                memberId: s.member_id,
                name: m?.canonical_name ?? "?",
                tier: m?.rank_tier ?? null,
                delta,
                recentRanks: (recentByMember.get(s.member_id) ?? []).slice(-6),
              })
            }
            const risersList = movers
              .filter((m) => m.delta > 0)
              .sort((a, b) => b.delta - a.delta)
              .slice(0, 3)
            const fallersList = movers
              .filter((m) => m.delta < 0)
              .sort((a, b) => a.delta - b.delta)
              .slice(0, 3)
            setRisers(risersList)
            setFallers(fallersList)
          }
        }

        // Top three of today's GW Daily for the Right Now strip.
        if (todayGWDaily) {
          const todayId = todayGWDaily.id
          const todayList = scoresByEvent.get(todayId)
          if (todayList && todayList.length > 0) {
            const ranked = [...todayList].sort((a, b) => b.points - a.points).slice(0, 3)
            setTodayProgress((prev) =>
              prev
                ? {
                    ...prev,
                    topThree: ranked.map((s) => {
                      const m = Array.isArray(s.members) ? s.members[0] : s.members
                      return {
                        id: s.member_id,
                        name: m?.canonical_name ?? "?",
                        tier: m?.rank_tier ?? null,
                      }
                    }),
                  }
                : prev,
            )
          }
        }
      }

      const { data: published } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(8)

      const publishedEvents = (published || []) as EventRow[]

      if (publishedEvents.length > 0) {
        setLatestEvent(publishedEvents[0])

        const { data: topScores } = await supabase
          .from("event_scores")
          .select(
            "id, points, rank_value, members:member_id(id, canonical_name, rank_tier)",
          )
          .eq("event_id", publishedEvents[0].id)
          .order("points", { ascending: false })
          .limit(3)

        if (topScores) {
          const perf: PodiumPerformer[] = topScores.map((s: any) => {
            const m = Array.isArray(s.members) ? s.members[0] : s.members
            return {
              memberId: m.id,
              name: m.canonical_name,
              tier: m.rank_tier,
              points: s.points,
            }
          })
          setTopPerformers(perf)
        }

        const hs: HonorEntry[] = publishedEvents
          .filter((e) => e.faction_result_json?.placement)
          .slice(0, 6)
          .map((e) => ({
            eventId: e.id,
            eventCode: e.event_type_code || "fcu",
            title: e.title,
            placement: e.faction_result_json?.placement ?? null,
            date: new Date(e.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          }))
        setHonors(hs)
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard"
      console.error("Dashboard load error:", err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const factionPlacement = latestEvent?.faction_result_json?.placement
    ? `No. ${latestEvent.faction_result_json.placement}`
    : undefined

  return (
    <>
      {showIntro && <IntroSequence onComplete={() => setShowIntro(false)} />}

      <header className="fixed top-0 left-0 right-0 z-50 bg-ink/85 backdrop-blur-md border-b border-ash">
        <div className="flex items-center justify-between px-5 md:px-8 py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-ember"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="font-display text-base font-bold text-bone tracking-[0.25em]">
              ELS
            </span>
          </Link>
          <AuthPill />
        </div>
      </header>

      <main id="main" className="min-h-screen pb-bottom-nav">
        {error ? (
          <div className="pt-24">
            <NetworkError
              onRetry={loadDashboard}
              message="Failed to load dashboard. Please check your connection and try again."
            />
          </div>
        ) : (
          <>
            <CommandCenterHero
              memberCount={memberCount}
              totalInfluence={totalInfluence}
              factionPlacement={factionPlacement}
              server={78}
              factionClass="S"
              isLoading={isLoading}
              influenceSeries={influenceSeries}
              placementSeries={placementSeries}
              pulseSeries={pulseSeries}
              pulseColor={
                activeCampaign ? "var(--blood-light)" : "var(--ember)"
              }
            />

            <div className="space-y-10 md:space-y-14 mt-6 md:mt-10">
              {/* ── WAR ROOM ───────────────────────────────────────────── */}
              {!isLoading && (
                <Section from="up">
                  <RightNowStrip
                    activeCampaign={activeCampaign}
                    otherProcessing={otherProcessing}
                    todayGWDaily={todayGWDaily}
                    todayProgress={todayProgress}
                  />
                </Section>
              )}

              {!isLoading && activeCampaign && campaignDailies.length >= 0 && (
                <Section from="up">
                  <GWPulseChart
                    campaign={{
                      id: activeCampaign.id,
                      title: activeCampaign.title,
                      meta_json: activeCampaign.meta_json as GWCampaignMeta,
                    }}
                    dailies={campaignDailies.map((d) => ({
                      id: d.id,
                      meta_json: d.meta_json,
                      scoresHit: d.scoresHit,
                      scoresTotal: d.scoresTotal,
                    }))}
                  />
                </Section>
              )}

              {!isLoading && (risers.length > 0 || fallers.length > 0) && (
                <Section from="up">
                  <TopMovers risers={risers} fallers={fallers} />
                </Section>
              )}

              {!isLoading && heartbeatRecent.length >= 2 && (
                <Section from="up">
                  <FactionHeartbeat
                    recentEvents={heartbeatRecent}
                    influenceWeeks={heartbeatRecent.map((e) => ({
                      at: e.at,
                      influence: e.totalPoints ?? 0,
                    }))}
                    placementBuckets={heartbeatPlacements}
                  />
                </Section>
              )}

              {!isLoading && (
                <Section from="up">
                  <ActivityFeed />
                </Section>
              )}

              {/* ── EXISTING SECTIONS ──────────────────────────────────── */}
              {(activeEvent || isLoading) && !activeCampaign && (
                <ActiveEventCard
                  eventId={activeEvent?.id ?? null}
                  title={activeEvent?.title ?? null}
                  eventCode={activeEvent?.event_type_code ?? undefined}
                  startsAt={activeEvent?.starts_at ?? undefined}
                  endsAt={activeEvent?.ends_at ?? undefined}
                  isLoading={isLoading}
                />
              )}

              {user && lastEventParticipation && (
                <Section from="up" className="px-5 md:px-8">
                  <Eyebrow tone="ember" size="sm">
                    Your Performance
                  </Eyebrow>
                  <DisplayHeading level={3} className="mt-1 mb-4">
                    Latest Appearance
                  </DisplayHeading>
                  <Link
                    href={`/events/${lastEventParticipation.eventId}`}
                    className="block surface-3 rounded-xl p-4 md:p-5 border border-ember/30 transition-all duration-300 active:scale-[0.99] hover:border-ember/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                  >
                    <p className="font-semibold text-bone text-sm md:text-base line-clamp-1">
                      {lastEventParticipation.eventTitle}
                    </p>
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-ember/15">
                      <div>
                        <Eyebrow tone="muted" size="xs">
                          Rank
                        </Eyebrow>
                        <p className="font-mono text-xl md:text-2xl text-ember font-bold mt-0.5 tabular-nums">
                          #{lastEventParticipation.rank}
                        </p>
                      </div>
                      <div className="text-right">
                        <Eyebrow tone="muted" size="xs">
                          Points
                        </Eyebrow>
                        <Numeric
                          value={lastEventParticipation.points}
                          format="compact"
                          className="text-xl md:text-2xl text-bone font-bold mt-0.5"
                        />
                      </div>
                    </div>
                  </Link>
                </Section>
              )}

              {(topPerformers.length > 0 || isLoading) && (
                <Section from="up" className="px-5 md:px-8">
                  <div className="flex items-end justify-between mb-10 md:mb-14">
                    <div>
                      <Eyebrow tone="ember" size="sm">
                        Top Performers
                      </Eyebrow>
                      <DisplayHeading level={3} className="mt-1">
                        The Podium
                      </DisplayHeading>
                    </div>
                    {latestEvent && !isLoading && (
                      <Link
                        href={`/events/${latestEvent.id}`}
                        className="text-[11px] md:text-xs text-bone/60 hover:text-ember inline-flex items-center gap-1 uppercase tracking-[0.2em] font-body transition-colors"
                      >
                        Full results
                        <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                  <PodiumTopThree
                    performers={topPerformers}
                    isLoading={isLoading}
                    eventTitle={latestEvent?.title}
                  />
                </Section>
              )}

              {(honors.length > 0 || isLoading) && (
                <Section from="up">
                  <HonorWallPreview
                    honors={honors}
                    isLoading={isLoading}
                  />
                </Section>
              )}

              {!isLoading && (
                <Section from="up">
                  <div className="px-5 mb-1">
                    <OrnateDivider variant="fleur" />
                  </div>
                  <MixedEventTimeline limit={6} />
                </Section>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </>
  )
}

