"use client"

import { motion, useReducedMotion } from "framer-motion"
import { MedalSVG, type MedalTier } from "@/components/heraldry"
import { Numeric, Eyebrow } from "@/components/typography"
import { cn } from "@/lib/cn"

export interface FactionPlacementMedalProps {
  /** 1-based placement (1st of 5 factions in the Oak match). */
  placement: number
  classPoints: number
  classPointsDelta: number
  /** Used to give the medal SVG a unique gradient id. */
  idScope?: string
  className?: string
}

/**
 * Hero medal block for an Oak event.
 *
 * Mobile layout: medal centered, class-points block stacked below.
 * Tablet+: medal left, class-points right.
 *
 * Tap target: this component is purely presentational, no interaction.
 */
export function FactionPlacementMedal({
  placement,
  classPoints,
  classPointsDelta,
  idScope = "oak-placement",
  className,
}: FactionPlacementMedalProps) {
  const reducedMotion = useReducedMotion()
  const tier: MedalTier | "slate" =
    placement === 1
      ? "gold"
      : placement === 2
        ? "silver"
        : placement === 3
          ? "bronze"
          : "slate"

  const accentClass =
    tier === "gold"
      ? "text-ember"
      : tier === "silver"
        ? "text-bone"
        : tier === "bronze"
          ? "text-[#d89a6c]"
          : "text-bone/60"

  const aurora =
    tier === "gold"
      ? "from-ember/20 via-ember/10 to-transparent"
      : tier === "silver"
        ? "from-bone/15 via-bone/5 to-transparent"
        : tier === "bronze"
          ? "from-[#8c5a2c]/20 via-[#8c5a2c]/8 to-transparent"
          : "from-smoke/40 via-smoke/15 to-transparent"

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border surface-3",
        tier === "gold"
          ? "border-ember/40"
          : tier === "silver"
            ? "border-bone/30"
            : tier === "bronze"
              ? "border-[#8c5a2c]/40"
              : "border-ash",
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 bg-gradient-to-b pointer-events-none", aurora)}
        aria-hidden="true"
      />

      <div className="relative px-5 py-6 md:px-7 md:py-8 flex flex-col md:flex-row items-center md:items-stretch gap-5 md:gap-7">
        {/* Medal */}
        <div className="flex-shrink-0 flex items-center justify-center">
          {tier === "slate" ? (
            <SlateBadge placement={placement} />
          ) : (
            <motion.div
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.7, rotate: -12 }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <MedalSVG
                tier={tier}
                rank={placement}
                size={84}
                idScope={idScope}
              />
            </motion.div>
          )}
        </div>

        {/* Class Points block */}
        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left">
          <Eyebrow tone="ember" size="xs">
            Faction Placement
          </Eyebrow>
          <p
            className={cn(
              "mt-1 font-display text-3xl md:text-4xl font-bold tracking-[-0.01em]",
              accentClass,
            )}
          >
            {placementLabel(placement)}
          </p>

          <div className="mt-4 w-full md:w-auto pt-4 border-t border-ash/40">
            <p className="text-[10px] uppercase tracking-[0.18em] text-bone/45 font-body mb-1">
              Class Points
            </p>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <Numeric
                value={classPoints}
                format="comma"
                className="text-2xl md:text-3xl text-bone font-bold"
              />
              {classPointsDelta !== 0 && (
                <span
                  className={cn(
                    "text-sm font-mono font-bold tabular-nums",
                    classPointsDelta > 0 ? "text-ember" : "text-blood",
                  )}
                >
                  {classPointsDelta > 0 ? "+" : ""}
                  {classPointsDelta.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function placementLabel(n: number): string {
  if (n === 1) return "No. 1"
  if (n === 2) return "No. 2"
  if (n === 3) return "No. 3"
  return `No. ${n}`
}

function SlateBadge({ placement }: { placement: number }) {
  return (
    <div className="w-20 h-20 rounded-full border-2 border-ash bg-ink/60 flex items-center justify-center">
      <span className="font-display text-3xl font-bold text-bone/60 tabular-nums">
        {placement}
      </span>
    </div>
  )
}
