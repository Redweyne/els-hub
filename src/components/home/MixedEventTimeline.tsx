"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { Calendar, ChevronRight } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import { DayTypeBadge } from "@/components/event/gw"
import { MemberAvatar } from "@/components/member"
import {
  getEventConfig,
  type EventTypeCode,
  type GWDailyMeta,
  type OakReportCard,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

interface RecentEvent {
  id: string
  title: string
  event_type_code: EventTypeCode
  created_at: string
  faction_result_json: OakReportCard | null
  meta_json: GWDailyMeta | null
}

interface TopThreeRow {
  member_id: string
  name: string
  tier: string | null
}

export interface MixedEventTimelineProps {
  className?: string
  /** Maximum items to show (default 6). */
  limit?: number
}

/**
 * Mixed-type event timeline for the dashboard.
 *
 * Mobile: vertical card list with type-color accent on the left.
 * Each card is a 60+px tap target with the event glyph, label, title, date.
 *
 * Excludes `gw_campaign` parent rows (those clutter; the dailies show what's
 * happening anyway). Includes FCU + Oak + gw_daily.
 */
export function MixedEventTimeline({
  className,
  limit = 6,
}: MixedEventTimelineProps) {
  const [events, setEvents] = useState<RecentEvent[] | null>(null)
  const [topThreeByEvent, setTopThreeByEvent] = useState<
    Record<string, TopThreeRow[]>
  >({})
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      // Pull events excluding gw_campaign + legacy unused codes.
      const wantedCodes = ["fcu", "oak", "gw_daily", "goa", "gw-sl", "gw-fh"]
      const { data } = await supabase
        .from("events")
        .select(
          "id, title, event_type_code, created_at, faction_result_json, meta_json",
        )
        .eq("status", "published")
        .in("event_type_code", wantedCodes)
        .order("created_at", { ascending: false })
        .limit(limit)
      const evs = (data ?? []) as RecentEvent[]
      setEvents(evs)

      if (evs.length > 0) {
        // Pull all event_scores for these events in one query, then keep top-3 per event.
        const ids = evs.map((e) => e.id)
        const { data: scores } = await supabase
          .from("event_scores")
          .select(
            "event_id, member_id, points, members:member_id(canonical_name, rank_tier)",
          )
          .in("event_id", ids)
          .order("points", { ascending: false })
        const grouped: Record<string, TopThreeRow[]> = {}
        for (const s of scores ?? []) {
          if (!grouped[s.event_id]) grouped[s.event_id] = []
          if (grouped[s.event_id].length >= 3) continue
          const m = Array.isArray(s.members) ? s.members[0] : s.members
          grouped[s.event_id].push({
            member_id: s.member_id,
            name: m?.canonical_name ?? "?",
            tier: (m as { rank_tier?: string } | null)?.rank_tier ?? null,
          })
        }
        setTopThreeByEvent(grouped)
      }
    }
    load()
  }, [limit])

  if (events === null) {
    return (
      <section className={cn("max-w-2xl mx-auto px-5", className)}>
        <Eyebrow tone="ember" size="sm">
          Recent Events
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-ash/40 bg-smoke/40 animate-pulse"
            />
          ))}
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className={cn("max-w-2xl mx-auto px-5", className)}>
        <Eyebrow tone="ember" size="sm">
          Recent Events
        </Eyebrow>
        <p className="mt-3 text-bone/55 text-sm font-body">
          The first event will be inscribed here.
        </p>
      </section>
    )
  }

  return (
    <section
      className={cn("max-w-2xl mx-auto px-5", className)}
      aria-label="Recent events"
    >
      <div className="flex items-end justify-between mb-3">
        <Eyebrow tone="ember" size="sm">
          Recent Events
        </Eyebrow>
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-bone/60 hover:text-ember transition-colors min-h-[36px] px-1"
        >
          All
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </div>

      <ul className="space-y-2">
        {events.map((ev, idx) => {
          const cfg = getEventConfig(ev.event_type_code) ?? getEventConfig("fcu")!
          const Glyph = cfg.Glyph
          const placement = ev.faction_result_json?.placement
          const meta = ev.meta_json
          const accentBorder =
            cfg.accent === "ember"
              ? "border-l-ember/60"
              : cfg.accent === "blood"
                ? "border-l-blood/60"
                : "border-l-blood-light/60"
          return (
            <motion.li
              key={ev.id}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.45,
                delay: Math.min(idx * 0.04, 0.3),
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <Link
                href={`/events/${ev.id}`}
                className={cn(
                  "block surface-3 rounded-xl border border-ash border-l-[3px]",
                  accentBorder,
                  "min-h-[76px] active:scale-[0.99] transition-all duration-150",
                  "hover:border-ember/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                )}
              >
                <div className="flex items-center gap-3 px-3.5 py-3 relative overflow-hidden">
                  <Glyph
                    size={48}
                    className="absolute -right-2 -top-2 opacity-[0.08] pointer-events-none"
                  />
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg bg-ink/60 border flex items-center justify-center",
                      cfg.accent === "ember" && "border-ember/30",
                      cfg.accent === "blood" && "border-blood/30",
                      cfg.accent === "blood-light" && "border-blood-light/30",
                    )}
                  >
                    <Glyph size={22} />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Eyebrow tone="ember" size="xs">
                        {cfg.abbrev}
                      </Eyebrow>
                      {ev.event_type_code === "gw_daily" && meta && (
                        <DayTypeBadge
                          dayType={meta.day_type}
                          cycle={meta.cycle}
                          size="xs"
                        />
                      )}
                      {placement != null && placement <= 3 && (
                        <span
                          className={cn(
                            "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-[0.1em] border",
                            placement === 1 && "bg-ember/15 text-ember border-ember/40",
                            placement === 2 && "bg-bone/12 text-bone border-bone/30",
                            placement === 3 && "bg-[#8c5a2c]/15 text-[#d89a6c] border-[#8c5a2c]/40",
                          )}
                        >
                          No. {placement}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-bone truncate">
                      {ev.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] text-bone/45 inline-flex items-center gap-1.5 font-body">
                        <Calendar size={10} aria-hidden="true" />
                        {new Date(ev.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {topThreeByEvent[ev.id]?.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {topThreeByEvent[ev.id].slice(0, 3).map((m, i) => (
                            <span
                              key={m.member_id}
                              className="rounded-full ring-1 ring-ink"
                              style={{ zIndex: 3 - i }}
                              title={m.name}
                            >
                              <MemberAvatar
                                name={m.name}
                                tier={m.tier ?? "frontliner"}
                                size={24}
                                idScope={`mt-${ev.id}-${m.member_id}`}
                                static
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-bone/30 flex-shrink-0 relative"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
