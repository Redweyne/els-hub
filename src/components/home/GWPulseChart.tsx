"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import {
  type GWCampaignMeta,
  type GWDailyMeta,
} from "@/lib/events/config"
import { getActiveGWDay, getDayAtOffset } from "@/lib/gw/schedule"
import { cn } from "@/lib/cn"

interface DailyRow {
  id: string
  meta_json: GWDailyMeta
  scoresHit: number
  scoresTotal: number
}

export interface GWPulseChartProps {
  campaign: {
    id: string
    title: string
    meta_json: GWCampaignMeta
  }
  dailies: DailyRow[]
  className?: string
}

/**
 * 50-cell horizontal pulse chart for the active GW campaign.
 *
 * Mobile-first behaviour:
 *   - Horizontally scrollable (overflow-x-auto, scrollbar hidden).
 *   - Cells are 14px wide on phone (5 cells per super-cycle visible at once).
 *   - Today's cell auto-scrolls into view on mount.
 *   - Each cell is a tap target (min 44×44 incl. padding wrapper) leading to the daily.
 *   - Cycle is color-coded: war = blood-light, hegemony = ember.
 *   - Future cells are skeletal (low opacity).
 */
export function GWPulseChart({ campaign, dailies, className }: GWPulseChartProps) {
  const reducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const meta = campaign.meta_json
  const activeToday = useMemo(
    () => getActiveGWDay(meta.start_date_iso, meta.expected_days),
    [meta.start_date_iso, meta.expected_days],
  )

  // Build the cell list once.
  const cells = useMemo(() => {
    return Array.from({ length: meta.expected_days }).map((_, i) => {
      const preview = getDayAtOffset(meta.start_date_iso, i, meta.expected_days)
      const matching = dailies.find(
        (d) =>
          d.meta_json.cycle === preview.cycle &&
          d.meta_json.super_cycle === preview.superCycle &&
          d.meta_json.day_in_cycle === preview.dayInCycle,
      )
      return { preview, daily: matching ?? null }
    })
  }, [meta.start_date_iso, meta.expected_days, dailies])

  // Auto-scroll today's cell into view on first render (mobile).
  useEffect(() => {
    if (!scrollRef.current) return
    const target = scrollRef.current.querySelector(
      `[data-day-offset="${activeToday.dayOffset}"]`,
    )
    if (target instanceof HTMLElement) {
      const r = target.getBoundingClientRect()
      const sr = scrollRef.current.getBoundingClientRect()
      const offset =
        target.offsetLeft - sr.width / 2 + r.width / 2
      scrollRef.current.scrollTo({
        left: Math.max(0, offset),
        behavior: reducedMotion ? "auto" : "smooth",
      })
    }
  }, [activeToday.dayOffset, reducedMotion])

  return (
    <section
      className={cn("max-w-2xl mx-auto", className)}
      aria-label="Governor's War campaign pulse"
    >
      <div className="px-5 flex items-end justify-between gap-3 mb-3">
        <div>
          <Eyebrow tone="ember" size="sm">
            GW Pulse
          </Eyebrow>
          <p className="mt-0.5 text-[11px] text-bone/55 font-body line-clamp-1">
            {campaign.title}
          </p>
        </div>
        <Link
          href={`/events/${campaign.id}`}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-bone/60 hover:text-ember transition-colors min-h-[36px] px-1"
        >
          Campaign
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {/* Cell strip — horizontal scroll on mobile. */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-3 px-5 -mx-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex items-end gap-1 min-h-[88px]">
          {cells.map(({ preview, daily }, idx) => {
            const isPast = idx < activeToday.dayOffset
            const isToday = idx === activeToday.dayOffset
            const isFuture = idx > activeToday.dayOffset
            const cycle = preview.cycle
            const completionPct =
              daily && daily.scoresTotal > 0
                ? Math.min(100, Math.round((daily.scoresHit / daily.scoresTotal) * 100))
                : 0
            // Mark super-cycle boundaries with extra spacing.
            const isFirstOfSuperCycle = preview.dayOffset % 10 === 0 && idx > 0
            const cellHeight = 56
            const fillHeight = daily
              ? Math.max(8, (completionPct / 100) * cellHeight)
              : isToday
                ? cellHeight * 0.4
                : 0

            const inner = (
              <div
                data-day-offset={preview.dayOffset}
                className={cn(
                  "relative w-3.5 sm:w-4 rounded-sm border transition-all duration-300",
                  isToday && "border-bone/80",
                  isPast && "border-ash/60",
                  isFuture && "border-ash/30",
                  cycle === "war" ? "bg-blood/8" : "bg-ember/8",
                  isFuture && "opacity-40",
                )}
                style={{ height: cellHeight }}
              >
                {/* Fill */}
                {daily && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: fillHeight }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.6,
                      delay: Math.min(idx * 0.012, 0.4),
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                    className={cn(
                      "absolute bottom-0 left-0 right-0 rounded-sm",
                      cycle === "war"
                        ? "bg-gradient-to-t from-blood-light to-blood-light/70"
                        : "bg-gradient-to-t from-ember to-ember/70",
                    )}
                  />
                )}
                {/* Today indicator */}
                {isToday && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-sm",
                      cycle === "war" ? "bg-blood-light/30" : "bg-ember/30",
                    )}
                    animate={
                      reducedMotion
                        ? undefined
                        : { opacity: [0.3, 0.6, 0.3] }
                    }
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                )}
                {!daily && isToday && (
                  <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-bone shadow-[0_0_6px_rgba(232,226,213,0.7)]"
                    aria-hidden="true"
                  />
                )}
              </div>
            )

            // Wrap each cell with an enlarged tap target so phones can hit them.
            const wrapperClass = cn(
              "flex flex-col items-center justify-end min-w-[16px] py-2 px-0.5",
              isFirstOfSuperCycle && "ml-2",
            )
            const ariaLabel = `Day ${preview.dayOffset + 1}: ${preview.config.label}, ${cycle === "war" ? "War" : "Hegemony"}${
              daily ? `, ${completionPct}% threshold cleared` : isToday ? ", today (no upload yet)" : isFuture ? ", upcoming" : ", not uploaded"
            }`

            const node = daily ? (
              <Link
                key={preview.dayOffset}
                href={`/events/${daily.id}`}
                aria-label={ariaLabel}
                className={cn(
                  wrapperClass,
                  "active:scale-95 transition-transform",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember rounded",
                )}
              >
                {inner}
                <span className="text-[8px] font-mono text-bone/35 mt-1 tabular-nums">
                  {preview.dayOffset + 1}
                </span>
              </Link>
            ) : (
              <div
                key={preview.dayOffset}
                aria-label={ariaLabel}
                className={wrapperClass}
              >
                {inner}
                <span className="text-[8px] font-mono text-bone/25 mt-1 tabular-nums">
                  {preview.dayOffset + 1}
                </span>
              </div>
            )

            return node
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 mt-1 flex items-center gap-3 text-[10px] text-bone/45 font-body">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-blood-light" aria-hidden="true" />
          War
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-ember" aria-hidden="true" />
          Hegemony
        </span>
        <span className="ml-auto font-mono tabular-nums">
          Day {activeToday.dayOffset + 1} / {meta.expected_days}
        </span>
      </div>
    </section>
  )
}
