import { Eyebrow } from "@/components/typography"
import { cn } from "@/lib/cn"

export type RankTier =
  | "mastermind"
  | "leaders"
  | "frontliner"
  | "production"
  | "stranger"

const TIER_META: Record<
  string,
  {
    label: string
    sigil: string
    accentClass: string
    barClass: string
  }
> = {
  mastermind: {
    label: "Mastermind",
    sigil: "V",
    accentClass: "text-ember",
    barClass: "bg-gradient-to-r from-ember via-ember/40 to-transparent",
  },
  leaders: {
    label: "Leaders",
    sigil: "IV",
    accentClass: "text-blood",
    barClass: "bg-gradient-to-r from-blood via-blood/40 to-transparent",
  },
  frontliner: {
    label: "Frontliner",
    sigil: "III",
    accentClass: "text-bone",
    barClass: "bg-gradient-to-r from-bone/60 via-bone/25 to-transparent",
  },
  production: {
    label: "Production",
    sigil: "II",
    accentClass: "text-bone/60",
    barClass: "bg-gradient-to-r from-bone/30 via-bone/10 to-transparent",
  },
  stranger: {
    label: "Stranger",
    sigil: "I",
    accentClass: "text-bone/45",
    barClass: "bg-gradient-to-r from-bone/20 via-bone/5 to-transparent",
  },
}

export interface TierDividerProps {
  tier: RankTier | string
  count?: number
  className?: string
}

/**
 * Ornate section divider used between tier groups in the Members Gallery.
 * Heraldic sigil (V, IV, III…) + tier name + count, with a gradient rule.
 */
export function TierDivider({ tier, count, className }: TierDividerProps) {
  const meta = TIER_META[tier] ?? TIER_META.frontliner
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full font-display font-bold text-[11px] md:text-xs tracking-[0.08em] border",
          meta.accentClass,
          "border-current/40",
        )}
        aria-hidden="true"
      >
        {meta.sigil}
      </span>
      <div>
        <Eyebrow tone="muted" size="xs">
          Rank Tier
        </Eyebrow>
        <h3
          className={cn(
            "font-display text-xl md:text-2xl font-semibold tracking-[0.12em] uppercase leading-none mt-0.5",
            meta.accentClass,
          )}
        >
          {meta.label}
        </h3>
      </div>
      <div className={cn("flex-1 h-px", meta.barClass)} />
      {count !== undefined && (
        <span className="font-mono text-xs text-bone/50 tabular-nums font-body">
          {count.toString().padStart(2, "0")}
        </span>
      )}
    </div>
  )
}
