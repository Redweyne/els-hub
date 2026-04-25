"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import Link from "next/link"

interface EventScore {
  id: string
  member_id: string
  rank_value: number
  points: number
  accept_current: number
  accept_max: number
}

interface Member {
  id: string
  canonical_name: string
  rank_tier: string
  avatar_url: string | null
}

const MINIMUM_THRESHOLD = 1700

function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration, ease: "easeOut" })
    }
  }, [isInView, value, duration, motionValue])

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toLocaleString()
      }
    })
  }, [spring])

  return <span ref={ref}>0</span>
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="url(#gold)" stroke="#C9A227" strokeWidth="1.5"/>
      <text x="20" y="26" textAnchor="middle" fontSize="18" fill="#0A0908" fontWeight="bold">1</text>
      <defs>
        <radialGradient id="gold" cx="35%" cy="30%">
          <stop stopColor="#F5D97A"/>
          <stop offset="100%" stopColor="#B8870B"/>
        </radialGradient>
      </defs>
    </svg>
  )
  if (rank === 2) return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="16" fill="url(#silver)" stroke="#9CA3AF" strokeWidth="1.5"/>
      <text x="18" y="23" textAnchor="middle" fontSize="16" fill="#0A0908" fontWeight="bold">2</text>
      <defs>
        <radialGradient id="silver" cx="35%" cy="30%">
          <stop stopColor="#E5E7EB"/>
          <stop offset="100%" stopColor="#6B7280"/>
        </radialGradient>
      </defs>
    </svg>
  )
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="url(#bronze)" stroke="#92400E" strokeWidth="1.5"/>
      <text x="16" y="21" textAnchor="middle" fontSize="14" fill="#0A0908" fontWeight="bold">3</text>
      <defs>
        <radialGradient id="bronze" cx="35%" cy="30%">
          <stop stopColor="#F59E0B"/>
          <stop offset="100%" stopColor="#78350F"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

export default function EventPage() {
  const params = useParams()
  const eventId = params.id as string

  const [eventTitle, setEventTitle] = useState("")
  const [scores, setScores] = useState<EventScore[]>([])
  const [members, setMembers] = useState<Record<string, Member>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (eventError) throw eventError
        setEventTitle(event.title)

        const { data: scoresData, error: scoresError } = await supabase
          .from("event_scores")
          .select("*")
          .eq("event_id", eventId)
          .order("points", { ascending: false })

        if (scoresError) throw scoresError
        setScores(scoresData || [])

        if (scoresData && scoresData.length > 0) {
          const memberIds = [...new Set(scoresData.map(s => s.member_id))]
          const { data: membersData, error: membersError } = await supabase
            .from("members")
            .select("id, canonical_name, rank_tier, avatar_url")
            .in("id", memberIds)

          if (membersError) throw membersError

          const memberMap: Record<string, Member> = {}
          membersData?.forEach(m => { memberMap[m.id] = m })
          setMembers(memberMap)
        }
      } catch (err) {
        console.error("Load event error:", err)
        setError("Failed to load event")
      } finally {
        setIsLoading(false)
      }
    }

    loadEvent()
  }, [eventId])

  if (isLoading) {
    return (
      <>
        <Header title="Event" />
        <main className="min-h-screen bg-ink flex items-center justify-center pt-16 pb-28">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-ember border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-bone/60 text-sm tracking-widest uppercase">Loading</p>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  if (error || scores.length === 0) {
    return (
      <>
        <Header title="Event" />
        <main className="min-h-screen bg-ink pt-32 pb-28 px-4">
          <div className="max-w-2xl mx-auto py-8">
            <p className="text-bone/60 text-sm">{error || "No scores found for this event."}</p>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  const sortedScores = [...scores].sort((a, b) => b.points - a.points)
  const totalPoints = sortedScores.reduce((sum, s) => sum + s.points, 0)
  const qualifiedCount = sortedScores.filter(s => s.points >= MINIMUM_THRESHOLD).length
  const avgPoints = Math.round(totalPoints / sortedScores.length)
  const completionPercent = Math.round((qualifiedCount / sortedScores.length) * 100)
  const top3 = sortedScores.slice(0, 3)

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.5 },
    }),
  }

  const slideIn = {
    hidden: { opacity: 0, x: -16 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.3 + i * 0.04, duration: 0.4 },
    }),
  }

  return (
    <>
      <Header title={eventTitle || "Event"} />
      <main className="min-h-screen bg-ink pt-16 pb-28">

        {/* ── HERO ─────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-blood/20 via-smoke/10 to-ink pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-ember/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-4 pt-20 pb-10 max-w-2xl mx-auto">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            animate={{ opacity: 1, letterSpacing: "0.25em" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-ember text-xs font-semibold uppercase tracking-[0.25em] mb-3"
          >
            Faction Call-Up
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-display text-4xl font-bold text-bone leading-tight mb-6"
            style={{ letterSpacing: "0.05em" }}
          >
            {eventTitle}
          </motion.h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-px bg-gradient-to-r from-ember/60 via-ember/20 to-transparent origin-left mb-8"
          />

          {/* Battle stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Points", value: totalPoints, color: "text-ember" },
              { label: "Avg / Member", value: avgPoints, color: "text-bone" },
              { label: "Qualified", suffix: "%", value: completionPercent, color: completionPercent >= 80 ? "text-ember" : "text-blood" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="bg-smoke/60 border border-ash/50 rounded-xl p-3 text-center backdrop-blur-sm"
              >
                <p className="text-[10px] text-bone/50 uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                <p className={`font-mono text-lg font-bold ${stat.color}`}>
                  <AnimatedNumber value={stat.value} duration={1.2} />
                  {stat.suffix}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP 3 PODIUM ─────────────────────────── */}
      <div className="px-4 max-w-2xl mx-auto mt-4 mb-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-bone/40 uppercase tracking-[0.2em] mb-5"
        >
          Top Performers
        </motion.p>

        <div className="space-y-3">
          {top3.map((score, idx) => {
            const member = members[score.member_id]
            const isQualified = score.points >= MINIMUM_THRESHOLD
            const pct = Math.min(100, (score.points / MINIMUM_THRESHOLD) * 100)

            const cardStyles = [
              "border-ember/60 bg-gradient-to-br from-ember/10 via-smoke/80 to-ink shadow-[0_0_30px_rgba(201,162,39,0.15)]",
              "border-white/20 bg-smoke/70",
              "border-orange-900/40 bg-smoke/60",
            ]

            return (
              <motion.div
                key={score.id}
                custom={idx}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className={`rounded-2xl border-2 ${cardStyles[idx]} overflow-hidden`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.4 + idx * 0.15,
                        type: "spring",
                        stiffness: 200,
                        damping: 12,
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      <MedalIcon rank={idx + 1} />
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/members/${score.member_id}`}
                        className="block hover:opacity-80 transition-opacity"
                      >
                          <p className={`font-display text-xl font-bold truncate ${idx === 0 ? "text-ember" : "text-bone"}`}>
                          {member?.canonical_name || "Unknown"}
                        </p>
                      </Link>
                      <p className="text-xs text-bone/50 mb-4">
                        Rank #{score.rank_value} · {score.accept_current}/{score.accept_max} accepted
                      </p>

                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-bone/40 uppercase tracking-widest">
                            Points
                          </span>
                          <span className={`font-mono text-base font-bold ${idx === 0 ? "text-ember" : "text-bone"}`}>
                            {score.points.toLocaleString()}
                            <span className="text-bone/30 text-xs font-normal"> / {MINIMUM_THRESHOLD.toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-ink rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.6 + idx * 0.1, duration: 0.9, ease: "easeOut" }}
                            className={`h-full rounded-full ${isQualified ? "bg-gradient-to-r from-ember to-amber-400" : "bg-blood"}`}
                          />
                        </div>

                        {isQualified && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 + idx * 0.1 }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-ember uppercase tracking-widest"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-ember inline-block" />
                            Qualified
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── FULL LEADERBOARD ─────────────────────── */}
      <div className="px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs text-bone/40 uppercase tracking-[0.2em]">Full Leaderboard</p>
          <div className="flex-1 h-px bg-ash/30" />
          <p className="text-xs text-bone/40">{sortedScores.length} members</p>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-2 px-4 mb-2">
          <span className="w-7 text-[10px] text-bone/30 uppercase tracking-widest">#</span>
          <span className="flex-1 text-[10px] text-bone/30 uppercase tracking-widest">Member</span>
          <span className="text-[10px] text-bone/30 uppercase tracking-widest w-20 text-right">Points</span>
        </div>

        <div className="space-y-1.5">
          {sortedScores.map((score, idx) => {
            const member = members[score.member_id]
            const isQualified = score.points >= MINIMUM_THRESHOLD
            const pct = Math.min(100, (score.points / MINIMUM_THRESHOLD) * 100)
            const isTop3 = idx < 3

            return (
              <motion.div
                key={score.id}
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={slideIn}
                className={`rounded-xl border overflow-hidden ${
                  isTop3
                    ? "border-ember/30 bg-ember/5"
                    : isQualified
                    ? "border-ash/40 bg-smoke/40"
                    : "border-ash/20 bg-smoke/20"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Rank */}
                  <span className={`w-7 font-mono text-sm font-bold flex-shrink-0 ${
                    idx === 0 ? "text-ember" : idx === 1 ? "text-white/60" : idx === 2 ? "text-orange-700" : "text-bone/30"
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Name + accept */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/members/${score.member_id}`}
                      className="block hover:text-ember transition-colors"
                    >
                      <p className={`text-sm font-semibold truncate ${isTop3 ? "text-bone" : "text-bone/80"}`}>
                        {member?.canonical_name || "Unknown"}
                      </p>
                    </Link>

                    {/* Progress bar */}
                    <div className="w-full bg-ink/50 rounded-full h-1 mt-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.05 * Math.min(idx, 10), duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full ${isQualified ? "bg-ember/70" : "bg-blood/50"}`}
                      />
                    </div>
                  </div>

                  {/* Points + status */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-mono text-sm font-bold ${isTop3 ? "text-bone" : "text-bone/70"}`}>
                      {score.points.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-bone/30">
                      {score.accept_current}/{score.accept_max}
                    </p>
                  </div>

                  {/* Qualified dot */}
                  {isQualified && (
                    <div className="w-1.5 h-1.5 rounded-full bg-ember flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-ember" />
            <span className="text-[10px] text-bone/40">Qualified (≥{MINIMUM_THRESHOLD.toLocaleString()})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blood/60" />
            <span className="text-[10px] text-bone/40">Below threshold</span>
          </div>
        </div>
      </div>
      </main>
      <BottomNav />
    </>
  )
}
