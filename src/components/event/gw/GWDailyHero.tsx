"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Flame } from "lucide-react"
import { Eyebrow, Numeric } from "@/components/typography"
import { getDayTypeGlyph } from "@/components/heraldry"
import {
  type GWDailyMeta,
  getGWDayConfig,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

export interface GWDailyHeroProps {
  meta: GWDailyMeta
  /** Sum of points across all faction members for this day. */
  totalPoints: number
  /** Number of members who hit (or exceeded) the day's minimum threshold. */
  hitCount: number
  /** Total faction members participating. */
  participantCount: number
  /** Show countdown if the daily is still active (deadline in future). */
  isActive: boolean
  className?: string
}

/**
 * Daily hero card. Mobile-first: glyph + day-type label stacks above stats.
 * Large readable typography. Tablet+: side-by-side.
 */
export function GWDailyHero({
  meta,
  totalPoints,
  hitCount,
  participantCount,
  isActive,
  className,
}: GWDailyHeroProps) {
  const reducedMotion = useReducedMotion()
  const cfg = getGWDayConfig(meta.day_type)
  const Glyph = getDayTypeGlyph(meta.day_type)
  const cycleAccent =
    meta.cycle === "war" ? "border-blood/40 from-blood/14" : "border-ember/40 from-ember/14"

  const completionPct =
    participantCount > 0 ? Math.round((hitCount / participantCount) * 100) : 0

  const [countdown, setCountdown] = useState(() =>
    formatCountdown(new Date(meta.deadline_iso).getTime() - Date.now()),
  )

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => {
      setCountdown(
        formatCountdown(new Date(meta.deadline_iso).getTime() - Date.now()),
      )
    }, 1000)
    return () => clearInterval(id)
  }, [meta.deadline_iso, isActive])

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border surface-3 bg-gradient-to-b to-transparent",
        cycleAccent,
        className,
      )}
    >
      {/* Mobile-optimized layout: stack on small, side-by-side on md+ */}
      <div className="relative px-5 py-6 md:px-7 md:py-8 flex flex-col md:flex-row items-center md:items-stretch gap-5 md:gap-7">
        {/* Glyph */}
        <div className="flex-shrink-0">
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "relative w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-ink/70 border flex items-center justify-center",
              meta.cycle === "war"
                ? "border-blood/50 shadow-[0_0_28px_-10px_color-mix(in_oklab,var(--blood-light)_70%,transparent)]"
                : "border-ember/50 shadow-[0_0_28px_-10px_color-mix(in_oklab,var(--ember)_70%,transparent)]",
            )}
          >
            <Glyph
              size={64}
              className={cn(
                meta.cycle === "war" ? "text-blood-light" : "text-ember",
              )}
            />
          </motion.div>
        </div>

        {/* Right block */}
        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <Eyebrow tone="ember" size="xs">
              {meta.cycle === "war" ? "Governor's War" : "Faction Hegemony"}
            </Eyebrow>
            <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
              · Super-Cycle {meta.super_cycle}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-semibold text-bone tracking-[-0.01em]">
            Day {meta.day_in_cycle} · {cfg.label}
          </h1>

          <p className="mt-2 text-[12px] text-bone/55 font-body max-w-md">
            {cfg.description}
          </p>

          {/* Threshold strip */}
          <div className="mt-4 grid grid-cols-2 gap-2 w-full md:max-w-md">
            <div className="rounded-lg border border-ash bg-ink/40 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
                Minimum
              </p>
              <Numeric
                value={meta.min_points}
                format="comma"
                className="text-sm md:text-base font-bold text-bone mt-0.5"
                animateOnView={false}
              />
            </div>
            <div
              className={cn(
                "rounded-lg border p-2.5",
                isActive
                  ? meta.cycle === "war"
                    ? "border-blood/40 bg-blood/10"
                    : "border-ember/40 bg-ember/10"
                  : "border-ash bg-ink/40",
              )}
            >
              <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
                {isActive ? "Closes in" : "Closed"}
              </p>
              <p
                className={cn(
                  "text-sm md:text-base font-mono font-bold tabular-nums mt-0.5",
                  isActive
                    ? meta.cycle === "war"
                      ? "text-blood-light"
                      : "text-ember"
                    : "text-bone/60",
                )}
              >
                {isActive ? countdown : "—"}
              </p>
            </div>
          </div>

          {/* Threshold-hit ribbon */}
          <div className="mt-3 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body inline-flex items-center gap-1.5">
                <Flame size={10} aria-hidden="true" />
                Threshold cleared
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-bone">
                {hitCount} / {participantCount}
              </span>
            </div>
            <div className="w-full h-1.5 bg-ash/40 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  meta.cycle === "war" ? "bg-blood-light" : "bg-ember",
                  "h-full",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
              <span>Faction Total</span>
              <Numeric
                value={totalPoints}
                format="compact"
                precision={1}
                className="text-bone font-bold normal-case tracking-normal text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m"
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor((ms / 1000) % 60)
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}
