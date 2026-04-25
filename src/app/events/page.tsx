"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { Calendar, ChevronRight } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import {
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
  ELSEmblemV2,
  OrnateDivider,
} from "@/components/heraldry"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { Shimmer } from "@/components/motion/Shimmer"
import { Section } from "@/components/motion/Section"
import { NetworkError } from "@/components/ui/network-error"
import { cn } from "@/lib/cn"

interface EventRow {
  id: string
  title: string
  event_type_code: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
  status: string
  faction_result_json?: { placement?: number } | null
}

const EVENT_TYPE_META: Record<
  string,
  { label: string; Glyph: typeof FactionCallUpGlyph }
> = {
  fcu: { label: "Faction Call-Up", Glyph: FactionCallUpGlyph },
  goa: { label: "Glory of Oakvale", Glyph: GloryOfOakvaleGlyph },
  sgoa: { label: "Supreme Glory of Oakvale", Glyph: GloryOfOakvaleGlyph },
  "gw-sl": { label: "Governor's War · SL", Glyph: GovernorsWarGlyph },
  "gw-fh": { label: "Governor's War · FH", Glyph: GovernorsWarGlyph },
}

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data, error: dbError } = await supabase
        .from("events")
        .select(
          "id, title, event_type_code, starts_at, ends_at, created_at, status, faction_result_json",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (dbError) throw dbError
      setEvents((data || []) as EventRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const grouped = useMemo(() => {
    const out = new Map<string, EventRow[]>()
    for (const ev of events) {
      const key = MONTH_FORMAT.format(new Date(ev.created_at))
      if (!out.has(key)) out.set(key, [])
      out.get(key)!.push(ev)
    }
    return out
  }, [events])

  const placementCounts = useMemo(() => {
    const counts = { gold: 0, silver: 0, bronze: 0 }
    for (const e of events) {
      const p = e.faction_result_json?.placement
      if (p === 1) counts.gold++
      else if (p === 2) counts.silver++
      else if (p === 3) counts.bronze++
    }
    return counts
  }, [events])

  return (
    <>
      <Header title="Archive" />

      <main id="main" className="min-h-screen pb-bottom-nav surface-1">
        <section className="relative overflow-hidden pt-20 pb-6 md:pb-10 surface-2 film-grain-drift">
          <div
            className="aurora-orb-ember pointer-events-none"
            style={{ top: "-20%", left: "-10%", opacity: 0.6 }}
            aria-hidden="true"
          />
          <div className="relative z-10 px-5 md:px-8 max-w-2xl mx-auto">
            <Eyebrow tone="ember" size="sm">
              The Archive
            </Eyebrow>
            <DisplayHeading
              level={1}
              as="h1"
              className="mt-2 text-3xl md:text-4xl"
            >
              Events
            </DisplayHeading>
            <p className="mt-3 text-bone/55 text-[13px] md:text-sm font-body max-w-md leading-relaxed">
              Every match the faction has fought. Tap any entry to relive
              the leaderboard.
            </p>

            {!isLoading && events.length > 0 && (
              <div className="mt-6 grid grid-cols-4 gap-2 md:gap-3">
                <SummaryTile label="Total" value={events.length} accent="ember" />
                <SummaryTile
                  label="Gold"
                  value={placementCounts.gold}
                  accent="gold"
                />
                <SummaryTile
                  label="Silver"
                  value={placementCounts.silver}
                  accent="silver"
                />
                <SummaryTile
                  label="Bronze"
                  value={placementCounts.bronze}
                  accent="bronze"
                />
              </div>
            )}
          </div>
        </section>

        <div className="px-5 md:px-8 max-w-2xl mx-auto pt-6 md:pt-10">
          {error ? (
            <NetworkError
              onRetry={loadEvents}
              message="Failed to load the archive. Try again."
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Shimmer
                  key={i}
                  delay={i * 80}
                  className="h-24 rounded-xl"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <EmptyArchive />
          ) : (
            <div className="space-y-8 md:space-y-10">
              {Array.from(grouped.entries()).map(
                ([monthLabel, monthEvents], gIdx) => (
                  <Section
                    key={monthLabel}
                    from="up"
                    delay={gIdx * 0.05}
                    immediate={gIdx === 0}
                  >
                    <MonthHeader
                      month={monthLabel}
                      count={monthEvents.length}
                    />
                    <div className="relative pl-6 md:pl-8">
                      <div
                        className="absolute left-2 md:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-ember/40 via-ember/20 to-transparent"
                        aria-hidden="true"
                      />
                      <ul className="space-y-3 md:space-y-4">
                        {monthEvents.map((ev, idx) => (
                          <TimelineItem
                            key={ev.id}
                            event={ev}
                            indexInMonth={idx}
                          />
                        ))}
                      </ul>
                    </div>
                  </Section>
                ),
              )}

              <div className="pt-6">
                <OrnateDivider variant="fleur" label="End of Archive" />
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  )
}

function MonthHeader({ month, count }: { month: string; count: number }) {
  return (
    <div className="sticky top-16 -mx-5 md:-mx-8 px-5 md:px-8 py-2.5 mb-4 bg-ink/85 backdrop-blur-xl border-b border-ash/40 z-20">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base md:text-lg font-semibold text-bone tracking-[0.18em] uppercase">
          {month}
        </h2>
        <span className="font-mono text-[11px] text-bone/40 tabular-nums">
          {count.toString().padStart(2, "0")} {count === 1 ? "entry" : "entries"}
        </span>
      </div>
    </div>
  )
}

function TimelineItem({
  event,
  indexInMonth,
}: {
  event: EventRow
  indexInMonth: number
}) {
  const reducedMotion = useReducedMotion()
  const meta = EVENT_TYPE_META[event.event_type_code ?? "fcu"] ?? {
    label: "Event",
    Glyph: FactionCallUpGlyph,
  }
  const Glyph = meta.Glyph
  const placement = event.faction_result_json?.placement

  return (
    <motion.li
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.45,
        delay: indexInMonth * 0.04,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="relative"
    >
      <span
        className={cn(
          "absolute -left-[18px] md:-left-[22px] top-5 w-3 h-3 rounded-full",
          "bg-ink border-2",
          placement === 1
            ? "border-ember shadow-[0_0_8px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
            : placement === 2 || placement === 3
              ? "border-ember/70"
              : "border-ash",
        )}
        aria-hidden="true"
      />

      <Link
        href={`/events/${event.id}`}
        className={cn(
          "block surface-3 rounded-xl border border-ash overflow-hidden",
          "transition-all duration-200 active:scale-[0.99]",
          "hover:border-ember/40 hover:shadow-[0_0_24px_-12px_color-mix(in_oklab,var(--ember)_60%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        )}
      >
        <div className="relative p-3 md:p-4">
          <Glyph
            size={88}
            className="absolute -right-3 -top-3 opacity-[0.07] md:opacity-10 pointer-events-none"
          />
          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg bg-ink/80 border border-ember/30 flex items-center justify-center">
              <Glyph size={32} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Eyebrow tone="ember" size="xs">
                  {meta.label}
                </Eyebrow>
                {placement && (
                  <PlacementBadge placement={placement} />
                )}
              </div>
              <p className="mt-1 text-bone font-semibold text-sm md:text-base line-clamp-2 leading-tight">
                {event.title}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-bone/50 font-body">
                <Calendar size={10} aria-hidden="true" />
                <span>
                  {DAY_FORMAT.format(new Date(event.created_at))}
                </span>
                {event.ends_at && (
                  <>
                    <span className="text-bone/30">→</span>
                    <span>
                      {DAY_FORMAT.format(new Date(event.ends_at))}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ChevronRight
              size={16}
              className="text-bone/30 flex-shrink-0 mt-1"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </motion.li>
  )
}

function PlacementBadge({ placement }: { placement: number }) {
  const cls =
    placement === 1
      ? "bg-ember/20 text-ember border-ember/40"
      : placement === 2
        ? "bg-bone/15 text-bone border-bone/30"
        : placement === 3
          ? "bg-[#8c5a2c]/20 text-[#d89a6c] border-[#8c5a2c]/40"
          : "bg-smoke text-bone/60 border-ash"
  const label =
    placement === 1
      ? "1st"
      : placement === 2
        ? "2nd"
        : placement === 3
          ? "3rd"
          : `${placement}th`
  return (
    <span
      className={cn(
        "flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em] border",
        cls,
      )}
      aria-label={`Faction placement: ${label}`}
    >
      {label}
    </span>
  )
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: "ember" | "gold" | "silver" | "bronze"
}) {
  const valueClass = {
    ember: "text-ember",
    gold: "text-ember",
    silver: "text-bone",
    bronze: "text-[#d89a6c]",
  }[accent]
  return (
    <div className="surface-3 rounded-lg border border-ash p-2.5 md:p-3 text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 font-mono font-bold tabular-nums text-base md:text-lg",
          valueClass,
        )}
      >
        <Numeric value={value} format="raw" />
      </div>
    </div>
  )
}

function EmptyArchive() {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="opacity-30 mb-4">
        <ELSEmblemV2 size={120} starCount={5} idScope="empty-archive" />
      </div>
      <DisplayHeading level={3} className="mb-2">
        No events yet
      </DisplayHeading>
      <p className="text-bone/55 text-sm max-w-xs font-body">
        The first event will be written here.
      </p>
    </div>
  )
}
