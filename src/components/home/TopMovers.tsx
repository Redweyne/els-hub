"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import { MemberAvatar } from "@/components/member"
import { SparkLine, DeltaArrow } from "@/components/dataviz"
import { cn } from "@/lib/cn"

export interface MoverRow {
  memberId: string
  name: string
  tier: string | null
  /** Signed rank delta (positive = improved). */
  delta: number
  /** Last 6 ranks oldest → newest (for the inline sparkline). */
  recentRanks: ReadonlyArray<number | null>
}

export interface TopMoversProps {
  /** Members whose rank improved most. */
  risers: ReadonlyArray<MoverRow>
  /** Members whose rank dropped most. */
  fallers: ReadonlyArray<MoverRow>
  className?: string
}

/**
 * Two-column grid: 3 risers + 3 fallers in the most recent event of any type.
 * Mobile: stacked sections (risers above, fallers below).
 * Tablet+: 2 columns side by side.
 *
 * Each row is a tap target leading to the member profile. Includes inline
 * sparkline + delta arrow so a glance tells the story.
 */
export function TopMovers({
  risers,
  fallers,
  className,
}: TopMoversProps) {
  const reducedMotion = useReducedMotion()

  if (risers.length === 0 && fallers.length === 0) return null

  return (
    <section
      className={cn("max-w-2xl mx-auto px-5", className)}
      aria-label="Top movers"
    >
      <div className="flex items-end justify-between mb-3">
        <Eyebrow tone="ember" size="sm">
          Top Movers
        </Eyebrow>
        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body">
          since last event
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Bucket
          title="Risers"
          icon={<ArrowUpRight size={11} aria-hidden="true" />}
          accentClass="text-ember border-ember/40"
          rows={risers}
          reducedMotion={reducedMotion}
          inverted
        />
        <Bucket
          title="Fallers"
          icon={<ArrowDownRight size={11} aria-hidden="true" />}
          accentClass="text-blood-light border-blood/40"
          rows={fallers}
          reducedMotion={reducedMotion}
          inverted={false}
        />
      </div>
    </section>
  )
}

function Bucket({
  title,
  icon,
  accentClass,
  rows,
  reducedMotion,
  inverted,
}: {
  title: string
  icon: React.ReactNode
  accentClass: string
  rows: ReadonlyArray<MoverRow>
  reducedMotion: boolean | null
  inverted: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="surface-3 rounded-xl border border-ash p-3.5">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono font-bold pb-2",
            accentClass.split(" ")[0],
          )}
        >
          {icon}
          {title}
        </div>
        <p className="text-bone/45 text-xs font-body">No movement yet.</p>
      </div>
    )
  }
  return (
    <div className="surface-3 rounded-xl border border-ash p-3 md:p-3.5">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono font-bold pb-2 border-b",
          accentClass,
        )}
      >
        {icon}
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.slice(0, 3).map((row, idx) => (
          <motion.li
            key={row.memberId}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.45,
              delay: Math.min(idx * 0.05, 0.3),
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            <Link
              href={`/members/${row.memberId}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg p-2 min-h-[52px]",
                "bg-ink/40 border border-ash/60 hover:border-ember/30 active:scale-[0.99] transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
              )}
            >
              <MemberAvatar
                name={row.name}
                tier={row.tier ?? "frontliner"}
                size={32}
                idScope={`tm-${row.memberId}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-bone truncate">
                  {row.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <DeltaArrow
                    delta={row.delta}
                    inverted={inverted}
                    size={10}
                    showValue
                  />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-bone/40 font-body">
                    ranks
                  </span>
                </div>
              </div>
              <SparkLine
                data={row.recentRanks}
                width={44}
                height={16}
                color={inverted ? "var(--ember)" : "var(--blood-light)"}
                inverted
                showLastDot
                fill
                className="opacity-90 flex-shrink-0"
              />
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
