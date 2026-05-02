"use client"

import { getGWDayConfig, type GWCycle, type GWDayType } from "@/lib/events/config"
import { cn } from "@/lib/cn"

export interface DayTypeBadgeProps {
  dayType: GWDayType
  cycle: GWCycle
  /** Show day number prefix ("DAY 2 · "). */
  showDayNumber?: boolean
  size?: "xs" | "sm" | "md"
  className?: string
}

/**
 * Compact badge showing the GW day-type and cycle.
 * Used in: list cards, mixed timeline, member event history.
 */
export function DayTypeBadge({
  dayType,
  cycle,
  showDayNumber = false,
  size = "sm",
  className,
}: DayTypeBadgeProps) {
  const cfg = getGWDayConfig(dayType)
  const label = showDayNumber
    ? `D${cfg.dayInCycle} · ${cfg.short}`
    : cfg.short

  const sizeClass =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5"
      : size === "sm"
        ? "text-[10px] px-2 py-0.5"
        : "text-xs px-2.5 py-1"

  const cycleClass =
    cycle === "war"
      ? "bg-blood/15 text-blood-light border-blood/35"
      : "bg-ember/15 text-ember border-ember/35"

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-bold uppercase tracking-[0.1em] rounded-md border tabular-nums",
        sizeClass,
        cycleClass,
        className,
      )}
    >
      {label}
    </span>
  )
}
