"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import {
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
} from "@/components/heraldry"
import { Eyebrow, DisplayHeading } from "@/components/typography"
import { Shimmer } from "@/components/motion/Shimmer"
import { cn } from "@/lib/cn"

export interface ActiveEventCardProps {
  eventId: string | null
  title: string | null
  eventCode?: string
  startsAt?: string
  endsAt?: string
  isLoading?: boolean
  watchingCount?: number
  className?: string
}

export function ActiveEventCard({
  eventId,
  title,
  eventCode = "fcu",
  startsAt,
  endsAt,
  isLoading,
  watchingCount,
  className,
}: ActiveEventCardProps) {
  const reducedMotion = useReducedMotion()
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!startsAt || !endsAt) return
    const start = new Date(startsAt).getTime()
    const end = new Date(endsAt).getTime()

    const tick = () => {
      const now = Date.now()
      const remaining = Math.max(0, end - now)
      const total = Math.max(1, end - start)
      const elapsed = Math.max(0, now - start)
      setRemainingMs(remaining)
      setProgress(Math.min(1, elapsed / total))
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [startsAt, endsAt])

  if (isLoading) {
    return (
      <div className={cn("px-5 md:px-8", className)}>
        <Shimmer className="h-[140px] w-full rounded-xl" />
      </div>
    )
  }

  if (!eventId || !title) {
    return null
  }

  const Glyph =
    eventCode === "goa" || eventCode === "sgoa"
      ? GloryOfOakvaleGlyph
      : eventCode?.startsWith("gw")
        ? GovernorsWarGlyph
        : FactionCallUpGlyph

  return (
    <section className={cn("px-5 md:px-8", className)}>
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Link
          href={`/events/${eventId}`}
          className={cn(
            "relative block overflow-hidden rounded-2xl",
            "surface-3 border border-blood/30",
            "transition-all duration-300 active:scale-[0.99]",
            "hover:border-blood/50 hover:shadow-[0_0_40px_-12px_color-mix(in_oklab,var(--blood)_55%,transparent)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          )}
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-blood/15 via-transparent to-transparent"
            aria-hidden="true"
          />

          <Glyph
            size={140}
            className="absolute -right-4 -top-4 md:right-4 md:top-4 opacity-10 md:opacity-15 pointer-events-none"
          />

          <div className="relative p-4 md:p-6 flex items-center gap-4 md:gap-6">
            <CountdownRing
              progress={progress}
              remainingMs={remainingMs}
              reducedMotion={!!reducedMotion}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!reducedMotion && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-blood"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                <Eyebrow tone="ember" size="xs">
                  Active Event
                </Eyebrow>
              </div>
              <p className="mt-1 text-bone font-semibold text-[15px] md:text-lg leading-tight line-clamp-2">
                {title}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-bone/50 font-body">
                {watchingCount && watchingCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-ember" />
                    {watchingCount} watching
                  </span>
                ) : (
                  <span>Live now</span>
                )}
              </div>
            </div>

            <ChevronRight
              size={18}
              className="text-bone/40 flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        </Link>
      </motion.div>
    </section>
  )
}

function CountdownRing({
  progress,
  remainingMs,
  reducedMotion,
}: {
  progress: number
  remainingMs: number | null
  reducedMotion: boolean
}) {
  const size = 68
  const strokeWidth = 3
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - progress)

  const countdownLabel = formatCountdown(remainingMs)

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Event countdown: ${countdownLabel}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-ash"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-blood"
          style={{
            strokeDasharray: circumference,
          }}
          initial={
            reducedMotion
              ? { strokeDashoffset: dashOffset }
              : { strokeDashoffset: circumference }
          }
          animate={{ strokeDashoffset: dashOffset }}
          transition={{
            duration: reducedMotion ? 0 : 1.2,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono font-bold text-bone text-[13px] tabular-nums">
          {countdownLabel}
        </span>
        <span className="text-[7px] uppercase tracking-[0.2em] text-bone/40 mt-0.5">
          remaining
        </span>
      </div>
    </div>
  )
}

function formatCountdown(ms: number | null): string {
  if (ms === null) return "—"
  if (ms <= 0) return "ended"
  const sec = ms / 1000
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
