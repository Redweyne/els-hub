"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { Calendar, ChevronRight, Trophy, TrendingUp } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import {
  OrnateDivider,
  RankStar,
} from "@/components/heraldry"
import { AchievementBadges } from "@/components/member"
import { Shimmer } from "@/components/motion/Shimmer"
import { Section, Stagger, StaggerItem } from "@/components/motion/Section"
import { NetworkError } from "@/components/ui/network-error"
import { deriveAchievements } from "@/lib/achievements"
import { cn } from "@/lib/cn"

interface Member {
  id: string
  canonical_name: string
  rank_tier: string
  family_role: string | null
  influence: number | null
  player_id: string | null
  vip_level: number | null
  is_active: boolean
  titles?: string[] | null
}

interface EventRef {
  id: string
  title: string
  created_at: string
}

interface EventScoreRow {
  id: string
  event_id: string
  rank_value: number
  points: number
  accept_current: number | null
  accept_max: number | null
  events: EventRef | EventRef[] | null
}

const TIER_META: Record<
  string,
  {
    label: string
    heroGradient: string
    auraClass: string
    accent: string
    sigil: string
  }
> = {
  mastermind: {
    label: "Mastermind",
    heroGradient:
      "from-ember/20 via-ember/5 to-ink",
    auraClass: "aurora-orb-ember",
    accent: "text-ember",
    sigil: "V",
  },
  leaders: {
    label: "Leader",
    heroGradient:
      "from-blood/25 via-blood/8 to-ink",
    auraClass: "aurora-orb-blood",
    accent: "text-blood",
    sigil: "IV",
  },
  frontliner: {
    label: "Frontliner",
    heroGradient: "from-bone/10 via-smoke/20 to-ink",
    auraClass: "aurora-orb-ember",
    accent: "text-bone",
    sigil: "III",
  },
  production: {
    label: "Production",
    heroGradient: "from-smoke/40 via-ink-100 to-ink",
    auraClass: "aurora-orb-ember",
    accent: "text-bone/70",
    sigil: "II",
  },
  stranger: {
    label: "Stranger",
    heroGradient: "from-ink-100 via-ink to-ink",
    auraClass: "aurora-orb-ember",
    accent: "text-bone/50",
    sigil: "I",
  },
}

const FAMILY_ROLE_LABELS: Record<string, string> = {
  advisor: "Advisor",
  general: "General",
  diplomat: "Diplomat",
  coordinator: "Coordinator",
}

export default function MemberProfilePage() {
  const params = useParams()
  const memberId = params.id as string

  const [member, setMember] = useState<Member | null>(null)
  const [scores, setScores] = useState<EventScoreRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMember = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single()

      if (memberError) throw memberError
      setMember(memberData as Member)

      const { data: scoresData, error: scoresError } = await supabase
        .from("event_scores")
        .select(
          `id, event_id, rank_value, points, accept_current, accept_max,
           events:event_id(id, title, created_at)`,
        )
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })

      if (scoresError) throw scoresError
      setScores((scoresData as EventScoreRow[]) || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile",
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMember()
  }, [memberId])

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error || !member) {
    return (
      <>
        <Header title="Member" />
        <main className="min-h-screen pt-24 pb-28 px-5">
          <NetworkError
            onRetry={loadMember}
            message={error || "Member not found."}
          />
        </main>
        <BottomNav />
      </>
    )
  }

  const tier = TIER_META[member.rank_tier] ?? TIER_META.frontliner
  const bestRank =
    scores.length > 0 ? Math.min(...scores.map((s) => s.rank_value)) : null
  const avgPoints =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.points, 0) / scores.length
      : 0
  const initial = member.canonical_name.trim()[0]?.toUpperCase() ?? "?"

  const achievements = deriveAchievements(
    scores.map((s) => {
      const ev = Array.isArray(s.events) ? s.events[0] : s.events
      return {
        eventId: s.event_id,
        rank: s.rank_value,
        points: s.points,
        createdAt: ev?.created_at ?? new Date().toISOString(),
      }
    }),
    {
      isSeeded: !!member.titles?.includes("seeded"),
    },
  )

  return (
    <>
      <Header title={member.canonical_name} />

      <main
        id="main"
        className="min-h-screen pb-28 surface-1"
      >
        <section
          className={cn(
            "relative overflow-hidden pt-20 pb-8 md:pb-12 film-grain-drift",
            "bg-gradient-to-b",
            tier.heroGradient,
          )}
          aria-labelledby="member-name"
        >
          <div
            className={cn(
              "pointer-events-none",
              tier.auraClass,
            )}
            style={{
              top: "-20%",
              left: "50%",
              transform: "translateX(-50%)",
              opacity: 0.7,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 px-5 md:px-8 max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 16,
                }}
                className={cn(
                  "relative w-24 h-24 md:w-28 md:h-28 rounded-full",
                  "flex items-center justify-center font-display font-bold text-4xl md:text-5xl",
                  "ring-2 ring-offset-4 ring-offset-ink",
                  member.rank_tier === "mastermind"
                    ? "bg-gradient-to-br from-ember-light via-ember to-ember-dark text-ink ring-ember shadow-[0_0_32px_-6px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
                    : member.rank_tier === "leaders"
                      ? "bg-gradient-to-br from-blood-light via-blood to-blood-dark text-bone ring-blood/60 shadow-[0_0_28px_-8px_color-mix(in_oklab,var(--blood)_60%,transparent)]"
                      : "bg-gradient-to-br from-smoke to-ink-100 text-bone ring-ash",
                )}
              >
                <span>{initial}</span>
                <span
                  className={cn(
                    "absolute -bottom-1 left-1/2 -translate-x-1/2",
                    "inline-flex items-center justify-center px-2 py-0.5 rounded-full",
                    "text-[9px] font-display font-bold tracking-[0.12em] border",
                    "bg-ink text-bone border-ash",
                  )}
                  aria-hidden="true"
                >
                  {tier.sigil}
                </span>
              </motion.div>

              <Eyebrow
                tone={
                  member.rank_tier === "mastermind"
                    ? "ember"
                    : member.rank_tier === "leaders"
                      ? "blood"
                      : "muted"
                }
                size="xs"
                className="mt-6"
              >
                {tier.label}
                {member.family_role && FAMILY_ROLE_LABELS[member.family_role]
                  ? ` · ${FAMILY_ROLE_LABELS[member.family_role]}`
                  : ""}
              </Eyebrow>

              <DisplayHeading
                level={1}
                as="h1"
                className="mt-2 text-3xl md:text-4xl"
              >
                <span id="member-name">{member.canonical_name}</span>
              </DisplayHeading>

              {member.titles && member.titles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {member.titles.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-[0.2em] bg-ember/15 text-ember border border-ember/40 rounded-full px-2.5 py-0.5 font-body"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>

        <div className="relative px-5 md:px-8 max-w-xl mx-auto mt-6 md:mt-8 space-y-10 md:space-y-12">
          <Section from="up" immediate>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <StatTile
                label="Events"
                value={
                  <Numeric
                    value={scores.length}
                    format="raw"
                    className="text-bone"
                  />
                }
              />
              <StatTile
                label="Best Rank"
                value={
                  bestRank ? (
                    <span className="text-ember">#{bestRank}</span>
                  ) : (
                    <span className="text-bone/40">—</span>
                  )
                }
                highlight={bestRank !== null && bestRank <= 3}
              />
              <StatTile
                label="Avg Points"
                value={
                  <Numeric
                    value={avgPoints}
                    format="compact"
                    className="text-bone"
                  />
                }
              />
            </div>

            {(member.influence || member.vip_level) && (
              <div className="mt-4 surface-3 rounded-xl p-4 border border-ash">
                {member.influence != null && member.influence > 0 && (
                  <div className="flex items-center justify-between">
                    <Eyebrow tone="muted" size="xs">
                      Influence
                    </Eyebrow>
                    <Numeric
                      value={member.influence}
                      format="compact"
                      precision={2}
                      className="text-ember font-bold text-lg"
                    />
                  </div>
                )}
                {member.vip_level != null && member.vip_level > 0 && (
                  <div className="mt-3 pt-3 border-t border-ash/70 flex items-center justify-between">
                    <Eyebrow tone="muted" size="xs">
                      VIP Level
                    </Eyebrow>
                    <div className="flex items-center gap-1.5">
                      <RankStar size={12} />
                      <span className="font-mono font-bold text-bone">
                        {member.vip_level}
                      </span>
                    </div>
                  </div>
                )}
                {member.player_id && (
                  <div className="mt-3 pt-3 border-t border-ash/70 flex items-center justify-between">
                    <Eyebrow tone="muted" size="xs">
                      Player ID
                    </Eyebrow>
                    <span className="font-mono text-bone/60 text-xs">
                      {member.player_id}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {achievements.length > 0 && (
            <Section from="up">
              <AchievementBadges achievements={achievements} />
            </Section>
          )}

          {scores.length >= 3 && (
            <Section from="up">
              <RankTrajectory scores={scores.slice(0, 8)} />
            </Section>
          )}

          <Section from="up">
            <OrnateDivider variant="fleur" className="mb-6" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <Eyebrow tone="ember" size="sm">
                  Event History
                </Eyebrow>
                <DisplayHeading level={3} className="mt-1">
                  {scores.length > 0
                    ? `${scores.length} Appearance${scores.length === 1 ? "" : "s"}`
                    : "No appearances yet"}
                </DisplayHeading>
              </div>
              {scores.length > 0 && (
                <Trophy
                  size={20}
                  className={cn("text-ember opacity-60")}
                  aria-hidden="true"
                />
              )}
            </div>

            {scores.length === 0 ? (
              <div className="surface-3 rounded-xl p-8 text-center border border-ash">
                <p className="text-bone/55 text-sm font-body">
                  Once this member joins an event, their history will appear
                  here.
                </p>
              </div>
            ) : (
              <Stagger className="space-y-2">
                {scores.slice(0, 20).map((score) => (
                  <StaggerItem key={score.id}>
                    <ScoreRow score={score} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </Section>
        </div>
      </main>

      <BottomNav />
    </>
  )
}

function StatTile({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 md:p-4 text-center border",
        highlight
          ? "surface-3 border-ember/40 shadow-[0_0_18px_-10px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
          : "surface-3 border-ash",
      )}
    >
      <Eyebrow tone="muted" size="xs">
        {label}
      </Eyebrow>
      <div className="mt-1.5 font-mono tabular-nums font-bold text-lg md:text-xl">
        {value}
      </div>
    </div>
  )
}

function ScoreRow({ score }: { score: EventScoreRow }) {
  const event = Array.isArray(score.events) ? score.events[0] : score.events
  if (!event) return null

  const isTop3 = score.rank_value <= 3
  const rankBadgeClass = isTop3
    ? score.rank_value === 1
      ? "bg-ember/20 text-ember border-ember/40"
      : score.rank_value === 2
        ? "bg-bone/15 text-bone border-bone/40"
        : "bg-[#8c5a2c]/20 text-[#d89a6c] border-[#8c5a2c]/40"
    : "bg-smoke text-bone/70 border-ash"

  return (
    <Link
      href={`/events/${score.event_id}`}
      className={cn(
        "block surface-3 rounded-xl p-3 md:p-4 border border-ash",
        "transition-all duration-200 active:scale-[0.99]",
        "hover:border-ember/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center",
            "font-mono font-bold text-sm tabular-nums",
            rankBadgeClass,
          )}
          aria-label={`Rank ${score.rank_value}`}
        >
          #{score.rank_value}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-bone text-sm md:text-base line-clamp-1">
            {event.title}
          </p>
          <p className="text-[11px] text-bone/50 mt-0.5 flex items-center gap-1.5 font-body">
            <Calendar size={11} aria-hidden="true" />
            {new Date(event.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <Numeric
            value={score.points}
            format="compact"
            className="text-ember text-sm font-bold"
          />
          <p className="text-[10px] text-bone/40 mt-0.5 font-body">points</p>
        </div>
        <ChevronRight
          size={16}
          className="text-bone/30 flex-shrink-0"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}

function RankTrajectory({ scores }: { scores: EventScoreRow[] }) {
  const reducedMotion = useReducedMotion()
  const orderedScores = [...scores].reverse()
  const maxRank = Math.max(...orderedScores.map((s) => s.rank_value), 20)
  const minRank = Math.min(...orderedScores.map((s) => s.rank_value), 1)
  const width = 320
  const height = 72
  const padX = 12
  const padY = 10

  const points = orderedScores.map((s, i) => {
    const x =
      padX +
      (i / Math.max(1, orderedScores.length - 1)) * (width - padX * 2)
    const y =
      padY +
      ((s.rank_value - minRank) / Math.max(1, maxRank - minRank)) *
        (height - padY * 2)
    return { x, y, rank: s.rank_value }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  return (
    <div className="surface-3 rounded-xl p-4 border border-ash">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-ember" aria-hidden="true" />
        <Eyebrow tone="muted" size="xs">
          Rank Trajectory · latest {orderedScores.length}
        </Eyebrow>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-20"
        role="img"
        aria-label="Member rank trajectory over recent events"
      >
        <defs>
          <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--ember)"
              stopOpacity="0.35"
            />
            <stop offset="100%" stopColor="var(--ember)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`${pathD} L ${points[points.length - 1]?.x ?? padX} ${height - padY} L ${points[0]?.x ?? padX} ${height - padY} Z`}
          fill="url(#traj-fill)"
          opacity="0.8"
        />

        <motion.path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ember"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
        />

        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.rank <= 3 ? 3 : 2}
            fill="currentColor"
            className={p.rank <= 3 ? "text-ember" : "text-ember/60"}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
          />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-[0.18em] text-bone/40 font-body">
        <span>Older</span>
        <span className="font-mono text-bone/60">
          best #{Math.min(...orderedScores.map((s) => s.rank_value))}
        </span>
        <span>Newer</span>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <Header title="Member" />
      <main className="min-h-screen pt-20 pb-28 px-5 md:px-8 max-w-xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center mt-8">
          <Shimmer className="w-24 h-24 md:w-28 md:h-28 rounded-full" />
          <Shimmer className="h-3 w-28 mt-6 rounded" />
          <Shimmer className="h-8 w-48 mt-3 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          <Shimmer className="h-20 rounded-xl" delay={0} />
          <Shimmer className="h-20 rounded-xl" delay={100} />
          <Shimmer className="h-20 rounded-xl" delay={200} />
        </div>
        <Shimmer className="h-28 rounded-xl" delay={150} />
        <div className="space-y-2 mt-8">
          <Shimmer className="h-16 rounded-xl" delay={0} />
          <Shimmer className="h-16 rounded-xl" delay={80} />
          <Shimmer className="h-16 rounded-xl" delay={160} />
        </div>
      </main>
      <BottomNav />
    </>
  )
}
