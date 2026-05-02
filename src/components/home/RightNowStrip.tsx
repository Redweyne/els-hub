"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight, Flame, Radio } from "lucide-react"
import { Eyebrow, Numeric } from "@/components/typography"
import { getDayTypeGlyph } from "@/components/heraldry"
import { MemberAvatar } from "@/components/member"
import { GW_DAY_SCHEDULE } from "@/lib/events/config"
import {
  getEventConfig,
  getGWDayConfig,
  type EventTypeCode,
  type GWCampaignMeta,
  type GWDailyMeta,
} from "@/lib/events/config"
import { getActiveGWDay, formatActiveDay } from "@/lib/gw/schedule"
import { cn } from "@/lib/cn"

interface ProcessingEvent {
  id: string
  title: string
  event_type_code: EventTypeCode
  meta_json: GWDailyMeta | GWCampaignMeta | null
}

interface DailyProgress {
  hits: number
  total: number
  totalPoints: number
  /** Top 3 members who hit threshold (for the avatar trio). */
  topThree?: Array<{ id: string; name: string; tier: string | null }>
}

export interface RightNowStripProps {
  /** Active campaign (status='processing', event_type_code='gw_campaign'). Null if none. */
  activeCampaign: ProcessingEvent | null
  /** Other "processing" events besides the campaign (FCU/Oak in flight). */
  otherProcessing: ProcessingEvent[]
  /** Latest GW Daily that matches today's auto-detected day. Null if none uploaded yet today. */
  todayGWDaily: ProcessingEvent | null
  /** Live progress numbers for today's GW Daily. */
  todayProgress: DailyProgress | null
  className?: string
}

/**
 * "Right Now" strip — the tile-bar at the top of the Home dashboard.
 *
 * Mobile: vertical stack (most important: today's GW Daily, then Oak/FCU).
 * Tablet+: horizontal flex grid.
 *
 * The GW Daily tile auto-rotates: it reads from the active campaign and
 * derives the active day-type via getActiveGWDay(). Even if no daily has
 * been uploaded yet for today, the tile still surfaces "Today: Kingpin · 2AM"
 * so officers know what's expected.
 */
export function RightNowStrip({
  activeCampaign,
  otherProcessing,
  todayGWDaily,
  todayProgress,
  className,
}: RightNowStripProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Compute the active GW day from the campaign (live, regardless of uploads).
  const activeDay = useMemo(() => {
    if (!activeCampaign?.meta_json) return null
    const meta = activeCampaign.meta_json as GWCampaignMeta
    if (!meta.start_date_iso) return null
    return getActiveGWDay(meta.start_date_iso, meta.expected_days, now)
  }, [activeCampaign, now])

  const tiles: React.ReactNode[] = []

  if (activeCampaign && activeDay) {
    tiles.push(
      <GWLiveTile
        key="gw-live"
        campaignId={activeCampaign.id}
        campaignTitle={activeCampaign.title}
        day={activeDay}
        format={formatActiveDay(activeDay, now)}
        progress={todayProgress}
        todayDailyId={todayGWDaily?.id ?? null}
      />,
    )
  }

  for (const ev of otherProcessing) {
    if (ev.event_type_code === "gw_campaign") continue
    tiles.push(<OtherProcessingTile key={ev.id} ev={ev} />)
  }

  if (tiles.length === 0) {
    return (
      <section className={cn("px-5 max-w-2xl mx-auto", className)} aria-label="Right now">
        <Eyebrow tone="ember" size="sm">
          Right Now
        </Eyebrow>
        <div className="mt-3 surface-3 rounded-xl border border-ash p-5 text-center">
          <Radio
            size={20}
            className="text-bone/40 mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-bone/55 text-sm font-body">
            No event is currently active.
          </p>
          <p className="text-[11px] text-bone/40 mt-1.5 font-body">
            When a campaign or upload is in flight, it will glow here.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn("px-5 max-w-2xl mx-auto", className)}
      aria-label="Active events right now"
    >
      <div className="flex items-center justify-between mb-3">
        <Eyebrow tone="ember" size="sm">
          Right Now
        </Eyebrow>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body"
          aria-live="polite"
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-blood-light"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            aria-hidden="true"
          />
          Live
        </span>
      </div>
      <div className="space-y-3">{tiles}</div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function GWLiveTile({
  campaignId,
  campaignTitle,
  day,
  format,
  progress,
  todayDailyId,
}: {
  campaignId: string
  campaignTitle: string
  day: ReturnType<typeof getActiveGWDay>
  format: ReturnType<typeof formatActiveDay>
  progress: DailyProgress | null
  todayDailyId: string | null
}) {
  const reducedMotion = useReducedMotion()
  const Glyph = getDayTypeGlyph(day.dayType)
  const cfg = getGWDayConfig(day.dayType)
  const cycle = day.cycle
  const cyclePalette =
    cycle === "war"
      ? {
          border: "border-blood/45",
          bg: "from-blood/12 via-blood-dark/12 to-transparent",
          accent: "text-blood-light",
          ring: "shadow-[0_0_28px_-12px_color-mix(in_oklab,var(--blood-light)_70%,transparent)]",
          fillBar: "bg-blood-light",
        }
      : {
          border: "border-ember/45",
          bg: "from-ember/12 via-ember-dark/10 to-transparent",
          accent: "text-ember",
          ring: "shadow-[0_0_28px_-12px_color-mix(in_oklab,var(--ember)_70%,transparent)]",
          fillBar: "bg-ember",
        }

  const hits = progress?.hits ?? 0
  const total = progress?.total ?? 0
  const completionPct = total > 0 ? Math.round((hits / total) * 100) : 0

  // Where to navigate: directly to today's daily if uploaded, otherwise to the campaign.
  const href = todayDailyId
    ? `/events/${todayDailyId}`
    : `/events/${campaignId}`

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        href={href}
        className={cn(
          "block relative overflow-hidden rounded-2xl border surface-3 bg-gradient-to-b to-transparent",
          "min-h-[140px] active:scale-[0.99] transition-transform duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          cyclePalette.border,
          cyclePalette.bg,
          cyclePalette.ring,
        )}
      >
        {/* Subtle pulse on the cycle accent */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={
            reducedMotion
              ? undefined
              : {
                  background: [
                    `radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--${cycle === "war" ? "blood" : "ember"}) 18%, transparent), transparent 60%)`,
                    `radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--${cycle === "war" ? "blood" : "ember"}) 26%, transparent), transparent 70%)`,
                    `radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--${cycle === "war" ? "blood" : "ember"}) 18%, transparent), transparent 60%)`,
                  ],
                }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />

        <div className="relative px-4 py-4 md:px-5 md:py-5 flex items-stretch gap-4">
          {/* Glyph */}
          <div className="flex-shrink-0">
            <div
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-xl border bg-ink/70 flex items-center justify-center",
                cycle === "war" ? "border-blood/55" : "border-ember/55",
              )}
            >
              <Glyph
                size={48}
                className={cyclePalette.accent}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Eyebrow tone="ember" size="xs">
                {format.cycleLabel} · S{day.superCycle}
              </Eyebrow>
              {!todayDailyId && (
                <span className="text-[9px] uppercase tracking-[0.16em] font-mono font-bold text-bone/50">
                  · Awaiting upload
                </span>
              )}
            </div>
            <p className="font-display text-base md:text-lg font-semibold text-bone leading-tight tracking-[0.04em] uppercase">
              Day {day.dayInCycle} · {cfg.label}
            </p>
            <p className="mt-0.5 text-[11px] text-bone/55 font-body line-clamp-1">
              {campaignTitle}
            </p>

            {/* Threshold + countdown row */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
                  Minimum
                </p>
                <Numeric
                  value={day.minPoints}
                  format="comma"
                  className={cn("text-sm font-bold mt-0.5", cyclePalette.accent)}
                  animateOnView={false}
                />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
                  Closes in
                </p>
                <p
                  className={cn(
                    "text-sm font-mono font-bold tabular-nums mt-0.5",
                    cyclePalette.accent,
                  )}
                >
                  {format.countdown}
                </p>
              </div>
            </div>
          </div>

          <ChevronRight
            size={16}
            className="text-bone/40 flex-shrink-0 self-center"
            aria-hidden="true"
          />
        </div>

        {/* Day-type ladder — D1..D5 with the active day glowing */}
        <div className="relative px-4 pb-3 md:px-5 md:pb-3 -mt-1">
          <div className="flex items-center gap-1.5">
            {GW_DAY_SCHEDULE.map((dc) => {
              const isCurrent = dc.dayInCycle === day.dayInCycle
              const isPast = dc.dayInCycle < day.dayInCycle
              return (
                <span
                  key={dc.type}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-all",
                    isCurrent
                      ? cycle === "war"
                        ? "bg-blood-light shadow-[0_0_8px_-1px_color-mix(in_oklab,var(--blood-light)_70%,transparent)]"
                        : "bg-ember shadow-[0_0_8px_-1px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
                      : isPast
                        ? "bg-bone/40"
                        : "bg-ash/50",
                  )}
                  aria-label={`Day ${dc.dayInCycle} · ${dc.label}${
                    isCurrent ? " (today)" : isPast ? " (done)" : ""
                  }`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[9px] uppercase tracking-[0.16em] text-bone/45 font-body">
            <span>{GW_DAY_SCHEDULE[0].short}</span>
            <span>{GW_DAY_SCHEDULE[GW_DAY_SCHEDULE.length - 1].short}</span>
          </div>
        </div>

        {/* Progress strip with avatar trio */}
        {progress && total > 0 && (
          <div className="relative px-4 pb-3 md:px-5 md:pb-4 pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body inline-flex items-center gap-1.5">
                <Flame size={10} aria-hidden="true" />
                Threshold cleared
              </span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-bone">
                {hits} / {total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-ash/40 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full", cyclePalette.fillBar)}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
            {progress.topThree && progress.topThree.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-bone/50 font-body">
                  Top
                </span>
                <div className="flex -space-x-2">
                  {progress.topThree.slice(0, 3).map((m, i) => (
                    <span
                      key={m.id}
                      className="rounded-full ring-2 ring-ink"
                      style={{ zIndex: 3 - i }}
                    >
                      <MemberAvatar
                        name={m.name}
                        tier={m.tier ?? "frontliner"}
                        size={24}
                        idScope={`rn-${m.id}`}
                        static
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  )
}

function OtherProcessingTile({ ev }: { ev: ProcessingEvent }) {
  const cfg = getEventConfig(ev.event_type_code) ?? getEventConfig("fcu")!
  const Glyph = cfg.Glyph
  return (
    <Link
      href={`/events/${ev.id}`}
      className={cn(
        "flex items-center gap-3 surface-3 rounded-xl border border-ember/30 px-4 py-3 active:scale-[0.99]",
        "min-h-[64px] transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-ink/70 border border-ember/30 flex items-center justify-center">
        <Glyph size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <Eyebrow tone="ember" size="xs">
          {cfg.label} · processing
        </Eyebrow>
        <p className="text-sm font-semibold text-bone truncate mt-0.5">
          {ev.title}
        </p>
      </div>
      <ChevronRight size={14} className="text-bone/40 flex-shrink-0" aria-hidden="true" />
    </Link>
  )
}
