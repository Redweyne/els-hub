"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { MedalSVG } from "@/components/heraldry"
import { Eyebrow, Numeric } from "@/components/typography"
import { Shimmer } from "@/components/motion/Shimmer"
import { cn } from "@/lib/cn"

export interface PodiumPerformer {
  memberId: string
  name: string
  tier: string
  points: number
}

export interface PodiumTopThreeProps {
  performers: PodiumPerformer[]
  eventTitle?: string
  isLoading?: boolean
  className?: string
}

const EASE = [0.2, 0.8, 0.2, 1] as const

/**
 * Classical Olympic-style podium: 1st center (tallest), 2nd left, 3rd right.
 * Medals overlap the top of each card. Mobile-first sizing.
 */
export function PodiumTopThree({
  performers,
  eventTitle,
  isLoading,
  className,
}: PodiumTopThreeProps) {
  const reducedMotion = useReducedMotion()

  const [first, second, third] = [
    performers[0],
    performers[1],
    performers[2],
  ]

  const items: (PodiumPerformer | undefined)[] = [second, first, third]
  const tiers: ("silver" | "gold" | "bronze")[] = ["silver", "gold", "bronze"]
  const ranks = [2, 1, 3]
  const heightClasses = [
    "h-[150px] md:h-[190px]",
    "h-[180px] md:h-[230px]",
    "h-[135px] md:h-[170px]",
  ]
  const delays = [0.15, 0, 0.3]

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 gap-2 md:gap-4 items-end", className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("relative", heightClasses[i])}>
            <Shimmer className="w-full h-full rounded-xl" delay={i * 120} />
          </div>
        ))}
      </div>
    )
  }

  if (!performers || performers.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 md:gap-4 items-end",
        className,
      )}
    >
      {items.map((p, i) => {
        if (!p) {
          return (
            <div
              key={i}
              className={cn(
                "rounded-xl surface-2 border border-ash/50 flex items-center justify-center",
                heightClasses[i],
              )}
            >
              <Eyebrow tone="muted">—</Eyebrow>
            </div>
          )
        }
        return (
          <PodiumCard
            key={p.memberId}
            performer={p}
            tier={tiers[i]}
            rank={ranks[i]}
            heightClass={heightClasses[i]}
            delay={delays[i]}
            reducedMotion={!!reducedMotion}
          />
        )
      })}
      {eventTitle && (
        <p className="col-span-3 mt-3 text-center text-[10px] uppercase tracking-[0.25em] text-bone/45 font-body">
          {eventTitle}
        </p>
      )}
    </div>
  )
}

function PodiumCard({
  performer,
  tier,
  rank,
  heightClass,
  delay,
  reducedMotion,
}: {
  performer: PodiumPerformer
  tier: "gold" | "silver" | "bronze"
  rank: number
  heightClass: string
  delay: number
  reducedMotion: boolean
}) {
  const tierStyles = {
    gold: {
      border: "border-ember/50",
      gradient:
        "from-ember/15 via-ember/5 to-transparent",
      glow: "shadow-[0_0_32px_-8px_color-mix(in_oklab,var(--ember)_55%,transparent)]",
      tierText: "text-ember",
    },
    silver: {
      border: "border-bone/30",
      gradient: "from-bone/10 via-bone/5 to-transparent",
      glow: "shadow-[0_0_20px_-10px_color-mix(in_oklab,var(--bone)_40%,transparent)]",
      tierText: "text-bone/80",
    },
    bronze: {
      border: "border-[#8c5a2c]/50",
      gradient: "from-[#8c5a2c]/15 via-[#8c5a2c]/5 to-transparent",
      glow: "shadow-[0_0_18px_-10px_color-mix(in_oklab,#a0613a_50%,transparent)]",
      tierText: "text-[#d89a6c]",
    },
  }[tier]

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={cn("relative", heightClass)}
    >
      <Link
        href={`/members/${performer.memberId}`}
        className={cn(
          "absolute inset-0 rounded-xl surface-3 border flex flex-col items-center justify-end",
          "pt-12 md:pt-16 pb-3 md:pb-4 px-2 md:px-3",
          "transition-transform duration-300 active:scale-[0.98]",
          "bg-gradient-to-b",
          tierStyles.border,
          tierStyles.gradient,
          tierStyles.glow,
        )}
      >
        <div className="absolute -top-7 md:-top-10 left-1/2 -translate-x-1/2 pointer-events-none">
          <motion.div
            initial={reducedMotion ? { scale: 1 } : { scale: 0, rotate: -20 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 18,
              delay: delay + 0.25,
            }}
          >
            <MedalSVG
              tier={tier}
              rank={rank}
              size={52}
              idScope={`podium-${rank}`}
              className="md:w-[68px] md:h-[102px]"
            />
          </motion.div>
        </div>

        <p
          className={cn(
            "w-full text-center font-semibold text-bone text-[13px] md:text-base truncate leading-tight",
          )}
          title={performer.name}
        >
          {performer.name}
        </p>
        <p
          className={cn(
            "w-full text-center text-[9px] md:text-[10px] uppercase tracking-[0.2em] mt-0.5 truncate capitalize",
            tierStyles.tierText,
          )}
        >
          {performer.tier}
        </p>
        <div className="mt-2 md:mt-3">
          <Numeric
            value={performer.points}
            format="compact"
            precision={1}
            className={cn(
              "font-mono font-bold tabular-nums text-sm md:text-base",
              tierStyles.tierText,
            )}
          />
        </div>
      </Link>
    </motion.div>
  )
}
