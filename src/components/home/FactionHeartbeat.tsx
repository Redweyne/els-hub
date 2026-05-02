"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { Histogram } from "@/components/dataviz"
import {
  pointsToSmoothPath,
  scaleLinear,
  maxOf,
  minOf,
} from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

interface RankPoint {
  /** ISO date. */
  at: string
  /** Faction average rank (lower = better). */
  avgRank: number
  /** Total points for that event. */
  totalPoints?: number
  /** Event title for the tooltip. */
  title: string
}

interface InfluencePoint {
  at: string
  influence: number
}

interface PlacementPoint {
  /** 1, 2, 3, 4, 5+ — distribution slot. */
  placement: number
  /** Number of events that landed in this slot. */
  count: number
}

export interface FactionHeartbeatProps {
  /** Last 12 events: average rank trajectory. */
  recentEvents: ReadonlyArray<RankPoint>
  /** Influence weekly aggregates (last ~8). */
  influenceWeeks: ReadonlyArray<InfluencePoint>
  /** Placement distribution counts. */
  placementBuckets: ReadonlyArray<PlacementPoint>
  className?: string
}

const VIEWS = ["Trajectory", "Influence", "Placements"] as const
type ViewId = (typeof VIEWS)[number]

/**
 * Three-view swipeable analytics card. Each view is one SVG, all hand-rolled,
 * combined < 4kb gzipped. Mobile snap-scroll with momentum; degrades to
 * desktop arrows.
 */
export function FactionHeartbeat({
  recentEvents,
  influenceWeeks,
  placementBuckets,
  className,
}: FactionHeartbeatProps) {
  const reducedMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // Snap-scroll observer — keeps the dot indicator + a11y label in sync.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w === 0) return
      const idx = Math.round(el.scrollLeft / w)
      setActive(Math.max(0, Math.min(VIEWS.length - 1, idx)))
    }
    el.addEventListener("scroll", update, { passive: true })
    return () => el.removeEventListener("scroll", update)
  }, [])

  const goTo = (idx: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }

  return (
    <section
      className={cn("max-w-2xl mx-auto px-5", className)}
      aria-label="Faction heartbeat — swipeable analytics"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <Eyebrow tone="ember" size="sm">
            <span className="inline-flex items-center gap-1.5">
              <Heart size={10} aria-hidden="true" />
              Faction Heartbeat
            </span>
          </Eyebrow>
          <p className="mt-0.5 text-[11px] text-bone/55 font-body">
            {VIEWS[active]} · swipe for more
          </p>
        </div>
        {/* Desktop arrows; mobile uses swipe */}
        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, active - 1))}
            disabled={active === 0}
            className={cn(
              "w-8 h-8 rounded-full bg-smoke/60 border border-ash flex items-center justify-center",
              "hover:border-ember/40 transition-colors disabled:opacity-30",
            )}
            aria-label="Previous view"
          >
            <ChevronLeft size={14} className="text-bone" />
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(VIEWS.length - 1, active + 1))}
            disabled={active === VIEWS.length - 1}
            className={cn(
              "w-8 h-8 rounded-full bg-smoke/60 border border-ash flex items-center justify-center",
              "hover:border-ember/40 transition-colors disabled:opacity-30",
            )}
            aria-label="Next view"
          >
            <ChevronRight size={14} className="text-bone" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={cn(
          "relative overflow-x-auto overflow-y-hidden snap-x snap-mandatory",
          "[&::-webkit-scrollbar]:hidden",
        )}
        style={{ scrollbarWidth: "none", overscrollBehavior: "contain" }}
        role="group"
        aria-roledescription="carousel"
      >
        <div className="flex w-full">
          <ViewCard title="Last 12 Events" snap>
            <RankTrajectoryView data={recentEvents} />
          </ViewCard>
          <ViewCard title="Influence Trend" snap>
            <InfluenceView data={influenceWeeks} />
          </ViewCard>
          <ViewCard title="Placement Distribution" snap>
            <PlacementsView data={placementBuckets} />
          </ViewCard>
        </div>
      </div>

      {/* Pip indicator */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {VIEWS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              "rounded-full transition-all min-h-[20px] min-w-[20px] flex items-center justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember",
            )}
            aria-label={`Go to ${label} view`}
            aria-current={active === i ? "true" : undefined}
          >
            <span
              className={cn(
                "block rounded-full transition-all",
                active === i
                  ? "w-5 h-1.5 bg-ember"
                  : "w-1.5 h-1.5 bg-bone/30",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}

function ViewCard({
  title,
  snap,
  children,
}: {
  title: string
  snap?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-full px-0",
        snap && "snap-center snap-always",
      )}
    >
      <div className="surface-3 rounded-xl border border-ash p-3.5 md:p-4">
        <div className="flex items-baseline justify-between mb-2">
          <Eyebrow tone="muted" size="xs">
            {title}
          </Eyebrow>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// View 1 — Trajectory (rank line + last point dot)
// ─────────────────────────────────────────────────────────────────────────────

function RankTrajectoryView({ data }: { data: ReadonlyArray<RankPoint> }) {
  const reducedMotion = useReducedMotion()
  const W = 320
  const H = 110

  if (data.length < 2) {
    return <EmptyView text="Need 2+ recent events to draw a trajectory." />
  }

  const ranks = data.map((d) => d.avgRank)
  const lo = minOf(ranks)
  const hi = maxOf(ranks)
  const padX = 10
  const padY = 14
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  // Lower rank is better: invert Y so a lower number sits visually higher.
  const points: Array<[number, number]> = data.map((d, i) => {
    const x = scaleLinear(i, 0, Math.max(1, data.length - 1), padX, padX + innerW)
    const t = scaleLinear(d.avgRank, lo, hi, 0, 1)
    const y = padY + t * innerH // lower rank → top
    return [x, y]
  })
  const path = pointsToSmoothPath(points, 0.55)
  const areaPath = `${path} L${padX + innerW},${padY + innerH} L${padX},${padY + innerH} Z`
  const last = points[points.length - 1]
  const latest = data[data.length - 1]

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="font-display text-2xl font-semibold text-bone leading-none">
          #{latest.avgRank.toFixed(1)}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          Avg rank · most recent
        </p>
      </div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full text-ember"
        role="img"
        aria-label={`Faction average rank trajectory across last ${data.length} events`}
      >
        <defs>
          <linearGradient id="fh-traj-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Baseline grid */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={padX + innerW}
            y1={padY + t * innerH}
            y2={padY + t * innerH}
            stroke="currentColor"
            strokeWidth={0.4}
            opacity={0.12}
            strokeDasharray="2 3"
          />
        ))}
        <motion.path
          d={areaPath}
          fill="url(#fh-traj-fill)"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r={3}
          fill="currentColor"
          initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, duration: 0.3, ease: "backOut" }}
        />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
        <span>oldest</span>
        <span className="font-mono tabular-nums normal-case tracking-normal text-bone/65">
          {data.length} events
        </span>
        <span>now</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// View 2 — Influence area chart
// ─────────────────────────────────────────────────────────────────────────────

function InfluenceView({ data }: { data: ReadonlyArray<InfluencePoint> }) {
  const reducedMotion = useReducedMotion()
  const W = 320
  const H = 110

  if (data.length < 2) {
    return <EmptyView text="Influence trend will appear once we have 2+ snapshots." />
  }

  const values = data.map((d) => d.influence)
  const lo = minOf(values)
  const hi = maxOf(values)
  const padX = 10
  const padY = 14
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const points: Array<[number, number]> = data.map((d, i) => {
    const x = scaleLinear(i, 0, Math.max(1, data.length - 1), padX, padX + innerW)
    const t = scaleLinear(d.influence, lo, hi, 0, 1)
    const y = padY + (1 - t) * innerH
    return [x, y]
  })
  const path = pointsToSmoothPath(points, 0.55)
  const areaPath = `${path} L${padX + innerW},${padY + innerH} L${padX},${padY + innerH} Z`
  const latest = data[data.length - 1].influence
  const earliest = data[0].influence
  const delta = latest - earliest
  const pct = earliest === 0 ? 0 : Math.round((delta / earliest) * 100)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <Numeric
          value={latest}
          format="compact"
          precision={1}
          className="font-display text-2xl font-semibold text-bone leading-none"
        />
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.18em] font-mono font-bold",
            delta > 0 ? "text-ember" : delta < 0 ? "text-blood-light" : "text-bone/45",
          )}
        >
          {delta > 0 ? "+" : ""}
          {pct}% over period
        </p>
      </div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full text-ember-light"
        role="img"
        aria-label={`Faction influence trend across ${data.length} weeks`}
      >
        <defs>
          <linearGradient id="fh-inf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill="url(#fh-inf-fill)"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// View 3 — Placements distribution donut
// ─────────────────────────────────────────────────────────────────────────────

function PlacementsView({ data }: { data: ReadonlyArray<PlacementPoint> }) {
  const reducedMotion = useReducedMotion()
  const cleaned = useMemo(
    () => [...data].sort((a, b) => a.placement - b.placement),
    [data],
  )
  const total = useMemo(
    () => cleaned.reduce((s, p) => s + p.count, 0),
    [cleaned],
  )

  if (total === 0) {
    return <EmptyView text="No published placements yet." />
  }

  const COLORS: Record<string, string> = {
    "1": "var(--ember)",
    "2": "var(--bone)",
    "3": "#d89a6c",
    other: "var(--smoke)",
  }
  const W = 200
  const H = 200
  const cx = W / 2
  const cy = H / 2
  const r = 72
  const stroke = 26
  const circumference = 2 * Math.PI * r

  let acc = 0
  const segments = cleaned.map((p) => {
    const fraction = p.count / total
    const length = circumference * fraction
    const dasharray = `${length} ${circumference}`
    const offset = -acc
    acc += length
    const color =
      p.placement === 1
        ? COLORS["1"]
        : p.placement === 2
          ? COLORS["2"]
          : p.placement === 3
            ? COLORS["3"]
            : COLORS.other
    return { p, dasharray, offset, color, fraction }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block flex-shrink-0 -rotate-90"
        role="img"
        aria-label={`Placement distribution across ${total} events`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {segments.map((seg, i) => (
          <motion.circle
            key={seg.p.placement}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.offset}
            strokeLinecap="butt"
            initial={
              reducedMotion
                ? { strokeDasharray: seg.dasharray }
                : { strokeDasharray: `0 ${circumference}` }
            }
            animate={{ strokeDasharray: seg.dasharray }}
            transition={{
              delay: 0.2 + i * 0.12,
              duration: reducedMotion ? 0 : 0.7,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          />
        ))}
        {/* Center label */}
        <g transform={`rotate(90 ${cx} ${cy})`}>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="font-display"
            fontSize="22"
            fontWeight="700"
            fill="var(--bone)"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize="9"
            fill="var(--bone-dim)"
            letterSpacing="2"
          >
            EVENTS
          </text>
        </g>
      </svg>
      <ul className="flex-1 grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full">
        {segments.map((seg) => (
          <li
            key={seg.p.placement}
            className="flex items-center gap-2 text-[12px] text-bone/85"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: seg.color }}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums text-bone">
              {seg.p.count}
            </span>
            <span className="text-bone/55">
              {placementLabel(seg.p.placement)}
            </span>
            <span className="ml-auto text-bone/45 font-mono tabular-nums">
              {Math.round(seg.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function placementLabel(n: number): string {
  if (n === 1) return "Gold"
  if (n === 2) return "Silver"
  if (n === 3) return "Bronze"
  return `Other (${n}+)`
}

function EmptyView({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-bone/55 text-sm font-body">{text}</p>
    </div>
  )
}

// Re-export Histogram so the homepage data fetch can compose with it if it wants.
export { Histogram }
