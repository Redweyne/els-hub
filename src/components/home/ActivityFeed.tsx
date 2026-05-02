"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { Award, Crown, Flame, TrendingUp } from "lucide-react"
import { Eyebrow, Numeric } from "@/components/typography"
import { MemberAvatar } from "@/components/member"
import {
  getEventConfig,
  type GWDailyMeta,
  type OakReportCard,
} from "@/lib/events/config"
import { cn } from "@/lib/cn"

type ActivityKind =
  | "podium"
  | "threshold"
  | "milestone"
  | "category-hero"

interface ActivityEntry {
  id: string
  kind: ActivityKind
  /** ISO timestamp for sort + relative-time. */
  at: string
  /** Primary sentence shown in the feed. */
  text: React.ReactNode
  /** Optional href to navigate to. */
  href?: string
  /** Icon shown on the left when no member is attached. */
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconClass: string
  /** When set, the row shows a MemberAvatar instead of the generic icon. */
  member?: { name: string; tier?: string | null; id?: string } | null
}

export interface ActivityFeedProps {
  className?: string
}

/**
 * Derived activity feed.
 *
 * No write path. Reads recent published events + scores and produces a
 * human-readable stream of "what just happened" — podium finishes, threshold
 * hits during active GW dailies, faction placements, category heroes.
 *
 * Mobile: vertical list with 56px+ tap rows, relative timestamps.
 * Tablet+: same layout, just wider.
 */
export function ActivityFeed({ className }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Pull the last ~10 published events of any type.
      const { data: events } = await supabase
        .from("events")
        .select(
          "id, title, event_type_code, created_at, meta_json, faction_result_json",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10)

      const evs = (events ?? []) as Array<{
        id: string
        title: string
        event_type_code: string | null
        created_at: string
        meta_json: GWDailyMeta | null
        faction_result_json: OakReportCard | { placement?: number } | null
      }>

      if (evs.length === 0) {
        setEntries([])
        return
      }

      // Pull top-3 scores + member names per event.
      const eventIds = evs.map((e) => e.id)
      const { data: scores } = await supabase
        .from("event_scores")
        .select(
          "id, event_id, member_id, rank_value, points, members:member_id(canonical_name, rank_tier)",
        )
        .in("event_id", eventIds)
        .order("points", { ascending: false })

      const scoresByEvent = new Map<string, typeof scores>()
      for (const s of scores ?? []) {
        const list = scoresByEvent.get(s.event_id) ?? []
        list.push(s)
        scoresByEvent.set(s.event_id, list as never)
      }

      const out: ActivityEntry[] = []

      for (const ev of evs) {
        const cfg = getEventConfig(ev.event_type_code) ?? getEventConfig("fcu")
        const cfgLabel = cfg?.abbrev ?? "Event"
        const list = scoresByEvent.get(ev.id) ?? []
        if (list.length === 0) continue
        const top = list.slice(0, 3)

        // Faction placement (Oak)
        const fr = ev.faction_result_json as OakReportCard | null
        if (fr?.placement && fr.placement <= 3) {
          out.push({
            id: `pl-${ev.id}`,
            kind: "milestone",
            at: ev.created_at,
            href: `/events/${ev.id}`,
            icon: Crown,
            iconClass:
              fr.placement === 1
                ? "text-ember"
                : fr.placement === 2
                  ? "text-bone"
                  : "text-[#d89a6c]",
            text: (
              <>
                Faction placed <b className="text-bone">No. {fr.placement}</b>{" "}
                in <span className="text-ember">{ev.title}</span>
              </>
            ),
          })
        }

        // 1st-place performer
        const first = top[0]
        if (first) {
          const m = Array.isArray(first.members) ? first.members[0] : first.members
          out.push({
            id: `top1-${ev.id}`,
            kind: "podium",
            at: ev.created_at,
            href: m ? `/members/${first.member_id}` : `/events/${ev.id}`,
            icon: Award,
            iconClass: "text-ember",
            member: m
              ? {
                  name: m.canonical_name,
                  tier: (m as { rank_tier?: string }).rank_tier,
                  id: first.member_id,
                }
              : null,
            text: (
              <>
                <b className="text-bone">{m?.canonical_name ?? "Someone"}</b>{" "}
                claimed <span className="text-ember">1st</span> in{" "}
                <span className="text-bone/80">{cfgLabel}</span> ·{" "}
                <Numeric
                  value={first.points}
                  format="compact"
                  precision={1}
                  className="text-bone font-bold"
                  animateOnView={false}
                />
              </>
            ),
          })
        }

        // Category heroes (Oak only)
        if (
          ev.event_type_code === "oak" &&
          fr &&
          "best_of_all" in fr &&
          (fr as OakReportCard).best_of_all
        ) {
          const heroes = (fr as OakReportCard).best_of_all
          for (const cat of ["total", "kill", "occupation"] as const) {
            const h = heroes[cat]
            if (h?.name) {
              out.push({
                id: `oak-hero-${ev.id}-${cat}`,
                kind: "category-hero",
                at: ev.created_at,
                href: `/events/${ev.id}`,
                icon: Award,
                iconClass: "text-ember/80",
                text: (
                  <>
                    <b className="text-bone">{h.name}</b> top{" "}
                    <span className="text-ember">{cat}</span> hero in Oak
                  </>
                ),
              })
              break // one per Oak event is plenty
            }
          }
        }

        // GW threshold milestones — count of members who hit min_points
        if (ev.event_type_code === "gw_daily" && ev.meta_json?.min_points) {
          const hits = list.filter(
            (s) => (s.points ?? 0) >= (ev.meta_json?.min_points ?? 0),
          ).length
          if (hits > 0) {
            out.push({
              id: `gw-thr-${ev.id}`,
              kind: "threshold",
              at: ev.created_at,
              href: `/events/${ev.id}`,
              icon: Flame,
              iconClass: "text-blood-light",
              text: (
                <>
                  <span className="text-bone font-bold">{hits}</span> member
                  {hits === 1 ? "" : "s"} cleared{" "}
                  <span className="text-blood-light">
                    {ev.meta_json.day_type}
                  </span>{" "}
                  threshold
                </>
              ),
            })
          }
        }

        // Streak: rank improvement compared to previous event of same type.
        if (top[0]) {
          const memberId = top[0].member_id
          const previousSameType = evs.find(
            (e) => e.id !== ev.id && e.event_type_code === ev.event_type_code,
          )
          if (previousSameType) {
            const prevList = scoresByEvent.get(previousSameType.id) ?? []
            const prevRow = prevList.find((p) => p.member_id === memberId)
            if (prevRow && prevRow.rank_value > top[0].rank_value) {
              const delta = prevRow.rank_value - top[0].rank_value
              if (delta >= 3) {
                const m = Array.isArray(top[0].members) ? top[0].members[0] : top[0].members
                out.push({
                  id: `rise-${ev.id}-${memberId}`,
                  kind: "milestone",
                  at: ev.created_at,
                  href: `/members/${memberId}`,
                  icon: TrendingUp,
                  iconClass: "text-ember",
                  member: m
                    ? {
                        name: m.canonical_name,
                        tier: (m as { rank_tier?: string }).rank_tier,
                        id: memberId,
                      }
                    : null,
                  text: (
                    <>
                      <b className="text-bone">{m?.canonical_name ?? "Member"}</b>{" "}
                      jumped <span className="text-ember">+{delta}</span> ranks
                    </>
                  ),
                })
              }
            }
          }
        }
      }

      // Sort newest-first, dedupe, cap at 12.
      const seen = new Set<string>()
      const sorted = out
        .filter((e) => {
          if (seen.has(e.id)) return false
          seen.add(e.id)
          return true
        })
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 12)
      setEntries(sorted)
    }

    load()
  }, [])

  const stagger = useMemo(
    () =>
      reducedMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
        : null,
    [reducedMotion],
  )

  if (entries === null) {
    return (
      <section className={cn("max-w-2xl mx-auto px-5", className)}>
        <Eyebrow tone="ember" size="sm">
          What Just Happened
        </Eyebrow>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-ash/40 bg-smoke/40 animate-pulse"
            />
          ))}
        </div>
      </section>
    )
  }

  if (entries.length === 0) {
    return (
      <section className={cn("max-w-2xl mx-auto px-5", className)}>
        <Eyebrow tone="ember" size="sm">
          What Just Happened
        </Eyebrow>
        <p className="mt-3 text-bone/55 text-sm font-body">
          When a daily lands, action will surface here.
        </p>
      </section>
    )
  }

  // Group entries by day bucket: today / yesterday / older.
  const groups = groupByDay(entries)

  return (
    <section
      className={cn("max-w-2xl mx-auto px-5", className)}
      aria-label="Recent activity"
    >
      <Eyebrow tone="ember" size="sm">
        What Just Happened
      </Eyebrow>
      <div className="mt-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
                {group.label}
              </span>
              <span className="flex-1 h-px bg-ash/40" />
              <span className="text-[10px] font-mono tabular-nums text-bone/35">
                {group.entries.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {group.entries.map((entry, idx) => {
                const Icon = entry.icon
                const wrapperClass = cn(
                  "flex items-center gap-3 surface-3 rounded-xl border border-ash/60 px-3 py-2.5 min-h-[56px]",
                  "transition-all duration-150",
                  entry.href
                    ? "active:scale-[0.99] hover:border-ember/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                    : "",
                )
                const inner = (
                  <>
                    {entry.member ? (
                      <MemberAvatar
                        name={entry.member.name}
                        tier={entry.member.tier ?? "frontliner"}
                        size={32}
                        idScope={`af-${entry.id}`}
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-lg bg-ink/60 border border-ash flex items-center justify-center",
                          entry.iconClass,
                        )}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                    )}
                    <p className="flex-1 min-w-0 text-[13px] text-bone/85 font-body line-clamp-2 leading-snug">
                      {entry.text}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-bone/40 font-mono tabular-nums">
                      {relativeTime(entry.at)}
                    </span>
                  </>
                )
                return (
                  <motion.li
                    key={entry.id}
                    initial={
                      stagger
                        ? stagger.initial
                        : { opacity: 0, y: 6 }
                    }
                    animate={stagger ? stagger.animate : { opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: Math.min(idx * 0.04, 0.4),
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  >
                    {entry.href ? (
                      <Link href={entry.href} className={wrapperClass}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={wrapperClass}>{inner}</div>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function groupByDay(
  entries: ActivityEntry[],
): Array<{ label: string; entries: ActivityEntry[] }> {
  const buckets = new Map<string, { label: string; entries: ActivityEntry[]; sortKey: number }>()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 24 * 60 * 60 * 1000

  for (const e of entries) {
    const ts = new Date(e.at).getTime()
    const date = new Date(ts)
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime()

    let label: string
    let sortKey: number
    if (dayStart === today) {
      label = "Today"
      sortKey = today
    } else if (dayStart === yesterday) {
      label = "Yesterday"
      sortKey = yesterday
    } else {
      label = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      sortKey = dayStart
    }
    if (!buckets.has(label)) {
      buckets.set(label, { label, entries: [], sortKey })
    }
    buckets.get(label)!.entries.push(e)
  }

  return Array.from(buckets.values()).sort((a, b) => b.sortKey - a.sortKey)
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}
