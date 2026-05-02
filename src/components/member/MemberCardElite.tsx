"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Numeric } from "@/components/typography"
import { MemberAvatar } from "./MemberAvatar"
import { useLongPressPeek } from "./MemberPeek"
import { SparkLine, DeltaArrow } from "@/components/dataviz"
import { cn } from "@/lib/cn"

export type RankTier =
  | "mastermind"
  | "leaders"
  | "frontliner"
  | "production"
  | "stranger"

export type FamilyRole =
  | "advisor"
  | "general"
  | "diplomat"
  | "coordinator"
  | null

export interface MemberCardEliteProps {
  id: string
  name: string
  tier: RankTier | string
  familyRole?: FamilyRole | string | null
  influence?: number | null
  vipLevel?: number | null
  titles?: string[]
  /**
   * Last N event ranks (oldest → newest). Renders an inline sparkline
   * to the right of the influence value. Omit if no event history.
   */
  recentRanks?: ReadonlyArray<number | null>
  /**
   * Most recent rank delta (latest event compared to prior of same type).
   * Positive number = rank improved (lower number).
   */
  rankDelta?: number | null
  /**
   * Member has scored in the last 7 days — drives the avatar's
   * presence pulse.
   */
  active?: boolean
  delay?: number
  className?: string
}

const TIER_CONFIG: Record<
  string,
  {
    roleLabel: string
    roleText: string
    sparkColor: string
  }
> = {
  mastermind: {
    roleLabel: "Mastermind",
    roleText: "text-ember",
    sparkColor: "var(--ember)",
  },
  leaders: {
    roleLabel: "Leader",
    roleText: "text-blood",
    sparkColor: "var(--blood-light)",
  },
  frontliner: {
    roleLabel: "Frontliner",
    roleText: "text-bone/70",
    sparkColor: "var(--bone-dim)",
  },
  production: {
    roleLabel: "Production",
    roleText: "text-bone/50",
    sparkColor: "var(--bone-dim)",
  },
  stranger: {
    roleLabel: "Stranger",
    roleText: "text-bone/45",
    sparkColor: "var(--bone-dim)",
  },
}

export function MemberCardElite({
  id,
  name,
  tier,
  familyRole,
  influence,
  vipLevel,
  recentRanks,
  rankDelta,
  active = false,
  delay = 0,
  className,
}: MemberCardEliteProps) {
  const reducedMotion = useReducedMotion()
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.frontliner
  const hasSparkData =
    !!recentRanks && recentRanks.filter((r) => r != null).length >= 2
  const sparkColor = cfg.sparkColor
  const peekHandlers = useLongPressPeek(id, name, tier)

  return (
    <motion.div
      initial={
        reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
      }
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.45,
        delay,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={className}
    >
      <Link
        href={`/members/${id}`}
        className={cn(
          "relative block surface-3 rounded-xl p-3 md:p-3.5 border border-ash",
          "transition-all duration-300 active:scale-[0.98]",
          "hover:border-ember/40 hover:shadow-[0_0_24px_-12px_color-mix(in_oklab,var(--ember)_60%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          "select-none touch-manipulation",
        )}
        style={{ viewTransitionName: `member-${id}` }}
        {...peekHandlers}
      >
        <div className="flex items-center gap-3 min-w-0">
          <MemberAvatar
            name={name}
            tier={tier}
            familyRole={familyRole as string | null | undefined}
            size={40}
            active={active}
            idScope={`mc-${id}`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className="font-semibold text-bone text-[14px] md:text-sm leading-tight truncate"
                title={name}
              >
                {name}
              </p>
              {rankDelta != null && rankDelta !== 0 && (
                <DeltaArrow
                  delta={rankDelta}
                  inverted
                  showValue
                  size={10}
                  className="flex-shrink-0"
                />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] md:text-[11px]">
              <span
                className={cn(
                  "uppercase tracking-[0.15em] font-body font-medium",
                  cfg.roleText,
                )}
              >
                {cfg.roleLabel}
              </span>
              {familyRole && typeof familyRole === "string" && (
                <>
                  <span className="text-bone/30">·</span>
                  <span className="text-bone/55 capitalize font-body">
                    {familyRole}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2.5">
            {hasSparkData && (
              <SparkLine
                data={recentRanks!}
                width={48}
                height={18}
                color={sparkColor}
                inverted
                showLastDot
                fill
                label={`${name} recent ranks`}
                className="opacity-90"
              />
            )}
            <div className="text-right min-w-[3.5rem]">
              {influence != null && influence > 0 ? (
                <Numeric
                  value={influence}
                  format="compact"
                  precision={1}
                  className="text-ember text-[13px] md:text-sm font-bold tabular-nums"
                />
              ) : (
                <span className="text-bone/30 text-xs font-body">—</span>
              )}
              {vipLevel != null && vipLevel > 0 && (
                <p className="text-[9px] mt-0.5 text-bone/45 uppercase tracking-wider font-body">
                  VIP {vipLevel}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
