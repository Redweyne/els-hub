"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Award, Trophy, Crown, Flame, Gem, TrendingUp } from "lucide-react"
import { useState } from "react"

import type { Achievement } from "@/lib/achievements"
import { Eyebrow } from "@/components/typography"
import { cn } from "@/lib/cn"

const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  foundation: Gem,
  veteran: Award,
  tested: Award,
  consistency: Flame,
  steady: Flame,
  rising: TrendingUp,
  "first-place": Crown,
  legend: Trophy,
  frontline: Trophy,
}

export interface AchievementBadgesProps {
  achievements: Achievement[]
  className?: string
}

export function AchievementBadges({
  achievements,
  className,
}: AchievementBadgesProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()

  if (achievements.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      <Eyebrow tone="ember" size="sm">
        Honors Earned
      </Eyebrow>

      <div
        className="flex gap-2 overflow-x-auto -mx-5 md:-mx-8 px-5 md:px-8 pb-2"
        style={{ scrollbarWidth: "none" }}
        role="list"
      >
        {achievements.map((a, i) => {
          const Icon = ACHIEVEMENT_ICONS[a.key] ?? Award
          const isExpanded = expanded === a.key
          return (
            <motion.button
              key={a.key}
              role="listitem"
              type="button"
              onClick={() => setExpanded(isExpanded ? null : a.key)}
              aria-expanded={isExpanded}
              aria-label={`${a.label}: ${a.description}`}
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: Math.min(i * 0.05, 0.4),
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                "text-[11px] font-body font-semibold uppercase tracking-[0.12em]",
                "border transition-all duration-200 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                getTierClass(a.tier),
              )}
            >
              <Icon size={12} aria-hidden="true" />
              <span>{a.label}</span>
              {a.progress && a.progress.current < a.progress.target && (
                <span className="font-mono opacity-70 text-[10px] tabular-nums">
                  {a.progress.current}/{a.progress.target}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {expanded && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-bone/65 font-body italic px-1"
        >
          {achievements.find((a) => a.key === expanded)?.description}
        </motion.p>
      )}
    </div>
  )
}

function getTierClass(tier: Achievement["tier"]): string {
  if (tier === "gold")
    return "bg-ember/15 text-ember border-ember/45 shadow-[0_0_14px_-6px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
  if (tier === "silver")
    return "bg-bone/8 text-bone border-bone/30"
  if (tier === "bronze")
    return "bg-[#8c5a2c]/15 text-[#d89a6c] border-[#8c5a2c]/40"
  return "bg-ember/8 text-ember/90 border-ember/30"
}
