"use client"

import { motion, useReducedMotion } from "framer-motion"
import { clamp } from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface PercentileChipProps {
  /** 0..100 percentile. Higher = better. */
  percentile: number
  /** Show "Top X%" (true) vs "X%ile" (false). Default true. */
  asTop?: boolean
  className?: string
}

/**
 * Tiny pill that says "Top 22%" — used inline next to a member's name or
 * stat to put it in faction context. ~0.3kb.
 *
 * Color tiers:
 *  - Top ≤ 10% → ember-light (gold)
 *  - Top ≤ 25% → ember (yellow gold)
 *  - Top ≤ 50% → bone (silver)
 *  - else      → muted
 */
export function PercentileChip({
  percentile,
  asTop = true,
  className,
}: PercentileChipProps) {
  const reducedMotion = useReducedMotion()
  const p = clamp(Math.round(percentile), 0, 100)
  // Convert percentile (higher better) to "Top X%"
  const top = 100 - p
  const display = asTop ? `Top ${Math.max(1, top)}%` : `${p}%ile`
  const tone =
    top <= 10
      ? "bg-ember/20 text-ember-light border-ember/45"
      : top <= 25
        ? "bg-ember/12 text-ember border-ember/35"
        : top <= 50
          ? "bg-bone/10 text-bone/85 border-bone/25"
          : "bg-smoke/60 text-bone/55 border-ash"

  return (
    <motion.span
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center font-mono font-bold tabular-nums",
        "text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border",
        tone,
        className,
      )}
      aria-label={`Faction percentile: ${display}`}
    >
      {display}
    </motion.span>
  )
}
