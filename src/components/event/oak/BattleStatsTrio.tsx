"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Crosshair, Flag, MapPin } from "lucide-react"
import { Numeric, Eyebrow } from "@/components/typography"
import { cn } from "@/lib/cn"

export interface BattleStatsTrioProps {
  total: number
  kill: number
  occupation: number
  className?: string
}

/**
 * Three large stat cards: Total / Kill / Occupation. The Total card is
 * emphasized (ember-tinted, ~33% bigger).
 *
 * Mobile: 3-col grid. Numbers compact-format (e.g. "307K") so they always fit.
 * Tablet+: 3-col with bigger type.
 */
export function BattleStatsTrio({
  total,
  kill,
  occupation,
  className,
}: BattleStatsTrioProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className={cn("grid grid-cols-3 gap-2 md:gap-3", className)}>
      <StatCard
        label="Total"
        value={total}
        icon={<Flag size={12} aria-hidden="true" />}
        emphasized
        delay={0}
        reducedMotion={reducedMotion}
      />
      <StatCard
        label="Kill"
        value={kill}
        icon={<Crosshair size={12} aria-hidden="true" />}
        delay={0.07}
        reducedMotion={reducedMotion}
      />
      <StatCard
        label="Occupation"
        value={occupation}
        icon={<MapPin size={12} aria-hidden="true" />}
        delay={0.14}
        reducedMotion={reducedMotion}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  emphasized,
  delay,
  reducedMotion,
}: {
  label: string
  value: number
  icon: React.ReactNode
  emphasized?: boolean
  delay: number
  reducedMotion: boolean | null
}) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "rounded-xl border p-3 md:p-4 surface-3 relative overflow-hidden",
        emphasized
          ? "border-ember/40 shadow-[0_0_18px_-8px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
          : "border-ash",
      )}
    >
      {emphasized && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-ember/12 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-1.5",
            emphasized ? "text-ember" : "text-bone/55",
          )}
        >
          {icon}
          <Eyebrow
            tone={emphasized ? "ember" : "muted"}
            size="xs"
          >
            {label}
          </Eyebrow>
        </div>
        <Numeric
          value={value}
          format="compact"
          precision={1}
          className={cn(
            "mt-1.5 font-bold",
            emphasized ? "text-2xl md:text-3xl text-bone" : "text-lg md:text-xl text-bone/85",
          )}
        />
        <p className="mt-0.5 text-[9px] font-mono tabular-nums text-bone/40">
          {value.toLocaleString("en-US")}
        </p>
      </div>
    </motion.div>
  )
}
