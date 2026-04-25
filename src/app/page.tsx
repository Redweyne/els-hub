"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"
import { Calendar, ChevronRight, TrendingUp } from "lucide-react"

import { BottomNav } from "@/components/layout/BottomNav"
import { AuthPill } from "@/components/layout/AuthPill"
import { IntroSequence } from "@/components/intro/IntroSequence"
import {
  CommandCenterHero,
  ActiveEventCard,
  PodiumTopThree,
  HonorWallPreview,
} from "@/components/home"
import type { PodiumPerformer, HonorEntry } from "@/components/home"
import { Section } from "@/components/motion/Section"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { OrnateDivider } from "@/components/heraldry"
import { NetworkError } from "@/components/ui/network-error"
import { cn } from "@/lib/cn"

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
  const [recentEvents, setRecentEvents] = useState<EventRow[]>([])
  const [honors, setHonors] = useState<HonorEntry[]>([])
  const [eventTotals, setEventTotals] = useState<Record<string, number>>({})
  const [user, setUser] = useState<UserProfile | null>(null)
  const [lastEventParticipation, setLastEventParticipation] =
    useState<LastEventParticipation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const { data: published } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(8)

      const publishedEvents = (published || []) as EventRow[]
      setRecentEvents(publishedEvents)

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

      const totals: Record<string, number> = {}
      for (const evt of publishedEvents.slice(0, 4)) {
        const { data: scores } = await supabase
          .from("event_scores")
          .select("points")
          .eq("event_id", evt.id)
        totals[evt.id] =
          scores?.reduce((sum, s) => sum + s.points, 0) || 0
      }
      setEventTotals(totals)
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
            />

            <div className="space-y-10 md:space-y-16 mt-4 md:mt-8">
              {(activeEvent || isLoading) && (
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

              {recentEvents.length > 0 && (
                <Section from="up" className="px-5 md:px-8">
                  <OrnateDivider variant="fleur" className="mb-8" />
                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <Eyebrow tone="ember" size="sm">
                        Archive
                      </Eyebrow>
                      <DisplayHeading level={3} className="mt-1">
                        Event History
                      </DisplayHeading>
                    </div>
                    <Link
                      href="/events"
                      className="text-[11px] md:text-xs text-bone/60 hover:text-ember inline-flex items-center gap-1 uppercase tracking-[0.2em] font-body transition-colors"
                    >
                      All
                      <ChevronRight size={14} />
                    </Link>
                  </div>

                  {recentEvents.length > 1 && (
                    <div className="surface-2 rounded-xl p-4 mb-4 border border-ash/60">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp
                          size={11}
                          className="text-ember"
                        />
                        <Eyebrow tone="muted" size="xs">
                          Points Trendline
                        </Eyebrow>
                      </div>
                      <div className="flex items-end justify-between gap-1.5 h-16">
                        {recentEvents
                          .slice(0, 4)
                          .slice()
                          .reverse()
                          .map((evt, idx) => {
                            const points = eventTotals[evt.id] || 0
                            const maxPoints = Math.max(
                              ...recentEvents
                                .slice(0, 4)
                                .map((e) => eventTotals[e.id] || 0),
                              1,
                            )
                            const pct = (points / maxPoints) * 100
                            return (
                              <motion.div
                                key={evt.id}
                                initial={{ scaleY: 0 }}
                                whileInView={{ scaleY: 1 }}
                                viewport={{ once: true }}
                                transition={{
                                  duration: 0.7,
                                  delay: idx * 0.08,
                                  ease: [0.2, 0.8, 0.2, 1],
                                }}
                                className="flex-1 bg-gradient-to-t from-ember/80 via-ember to-ember/50 rounded-t-md origin-bottom shadow-[0_0_8px_-2px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
                                style={{
                                  height: `${pct}%`,
                                  minHeight: 4,
                                }}
                                aria-label={`${evt.title}: ${points.toLocaleString()} points`}
                              />
                            )
                          })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {recentEvents.slice(0, 4).map((evt) => (
                      <Link
                        key={evt.id}
                        href={`/events/${evt.id}`}
                        className="block surface-3 rounded-xl p-3 md:p-4 border border-ash transition-all duration-200 active:scale-[0.99] hover:border-ember/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-bone text-sm md:text-base line-clamp-1">
                              {evt.title}
                            </p>
                            <p className="text-[11px] text-bone/50 mt-0.5 flex items-center gap-1.5 font-body">
                              <Calendar size={11} />
                              {new Date(
                                evt.created_at,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          {evt.faction_result_json?.placement && (
                            <span
                              className={cn(
                                "text-[10px] font-mono font-bold px-2 py-1 rounded uppercase tracking-[0.1em] flex-shrink-0",
                                evt.faction_result_json.placement === 1
                                  ? "bg-ember/20 text-ember"
                                  : evt.faction_result_json.placement === 2
                                    ? "bg-bone/15 text-bone"
                                    : evt.faction_result_json.placement === 3
                                      ? "bg-[#8c5a2c]/20 text-[#d89a6c]"
                                      : "bg-ash text-bone/60",
                              )}
                            >
                              {placementLabel(
                                evt.faction_result_json.placement,
                              )}
                            </span>
                          )}
                          <ChevronRight
                            size={18}
                            className="text-bone/40 flex-shrink-0"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
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

function placementLabel(n: number): string {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  return `${n}th`
}
