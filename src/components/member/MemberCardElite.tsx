"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Numeric } from "@/components/typography"
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
  delay?: number
  className?: string
}

const TIER_CONFIG: Record<
  string,
  {
    ring: string
    avatarBg: string
    roleLabel: string
    roleText: string
    abbr: string
  }
> = {
  mastermind: {
    ring: "ring-ember shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--ember)_70%,transparent)]",
    avatarBg:
      "bg-gradient-to-br from-ember-light via-ember to-ember-dark text-ink",
    roleLabel: "Mastermind",
    roleText: "text-ember",
    abbr: "V",
  },
  leaders: {
    ring: "ring-blood/60",
    avatarBg:
      "bg-gradient-to-br from-blood-light via-blood to-blood-dark text-bone",
    roleLabel: "Leader",
    roleText: "text-blood",
    abbr: "IV",
  },
  frontliner: {
    ring: "ring-bone/30",
    avatarBg: "bg-gradient-to-br from-smoke to-ink-100 text-bone",
    roleLabel: "Frontliner",
    roleText: "text-bone/70",
    abbr: "III",
  },
  production: {
    ring: "ring-ash",
    avatarBg: "bg-gradient-to-br from-ink-100 to-ink text-bone/70",
    roleLabel: "Production",
    roleText: "text-bone/50",
    abbr: "II",
  },
  stranger: {
    ring: "ring-ash/50",
    avatarBg: "bg-gradient-to-br from-ink-100 to-ink text-bone/50",
    roleLabel: "Stranger",
    roleText: "text-bone/45",
    abbr: "I",
  },
}

const FAMILY_EMOJI: Record<string, string> = {
  advisor: "🛡",
  general: "⚔",
  diplomat: "✢",
  coordinator: "❖",
}

export function MemberCardElite({
  id,
  name,
  tier,
  familyRole,
  influence,
  vipLevel,
  delay = 0,
  className,
}: MemberCardEliteProps) {
  const reducedMotion = useReducedMotion()
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.frontliner
  const initial = name.trim()[0]?.toUpperCase() ?? "?"

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
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "relative flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center",
              "font-display font-bold text-base md:text-lg select-none",
              "ring-2 ring-offset-2 ring-offset-ink",
              cfg.avatarBg,
              cfg.ring,
            )}
          >
            <span>{initial}</span>
            {familyRole && FAMILY_EMOJI[familyRole as string] && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ink border border-ember/60 flex items-center justify-center text-[10px] leading-none"
                title={familyRole as string}
                aria-label={`Family role: ${familyRole}`}
              >
                {FAMILY_EMOJI[familyRole as string]}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-bone text-[14px] md:text-sm leading-tight truncate"
              title={name}
            >
              {name}
            </p>
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

          <div className="flex-shrink-0 text-right">
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
      </Link>
    </motion.div>
  )
}
