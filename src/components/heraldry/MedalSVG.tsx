import { cn } from "@/lib/cn"

export type MedalTier = "gold" | "silver" | "bronze"

export interface MedalSVGProps {
  tier: MedalTier
  rank?: number
  size?: number
  idScope?: string
  className?: string
}

export function MedalSVG({
  tier,
  rank,
  size = 64,
  idScope,
  className,
}: MedalSVGProps) {
  const uid = idScope ?? `m-${tier}`
  const palette = TIER_PALETTE[tier]
  const displayRank = rank ?? (tier === "gold" ? 1 : tier === "silver" ? 2 : 3)

  return (
    <svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 80 120"
      className={cn(className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${tier} medal, rank ${displayRank}`}
    >
      <defs>
        <linearGradient id={`medal-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="50%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </linearGradient>
        <radialGradient id={`medal-shine-${uid}`} cx="35%" cy="30%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
        </radialGradient>
        <linearGradient id={`ribbon-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--blood-light)" />
          <stop offset="100%" stopColor="var(--blood-dark)" />
        </linearGradient>
      </defs>

      <g>
        <path
          d="M 18 0 L 34 48 L 26 52 L 10 4 Z"
          fill={`url(#ribbon-${uid})`}
          opacity="0.95"
        />
        <path
          d="M 62 0 L 46 48 L 54 52 L 70 4 Z"
          fill={`url(#ribbon-${uid})`}
          opacity="0.95"
        />
        <path
          d="M 26 52 L 40 66 L 54 52 L 48 56 L 40 60 L 32 56 Z"
          fill="var(--blood-dark)"
          opacity="0.8"
        />
      </g>

      <g transform="translate(40, 78)">
        <circle
          cx="0"
          cy="0"
          r="30"
          fill={`url(#medal-${uid})`}
          stroke={palette.rim}
          strokeWidth="1.4"
        />
        <circle
          cx="0"
          cy="0"
          r="30"
          fill={`url(#medal-shine-${uid})`}
        />
        <circle
          cx="0"
          cy="0"
          r="26"
          fill="none"
          stroke={palette.rim}
          strokeWidth="0.6"
          opacity="0.6"
        />
        <circle
          cx="0"
          cy="0"
          r="22"
          fill={palette.inner}
          stroke={palette.rim}
          strokeWidth="0.8"
        />

        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontSize="22"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontWeight="700"
          fill={palette.number}
          style={{
            filter: `drop-shadow(0 1px 2px ${palette.shadow})`,
          }}
        >
          {displayRank}
        </text>

        <g opacity="0.45" fill={palette.rim}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <circle
                key={i}
                cx={Math.cos(a) * 28}
                cy={Math.sin(a) * 28}
                r="0.9"
              />
            )
          })}
        </g>
      </g>
    </svg>
  )
}

const TIER_PALETTE: Record<MedalTier, {
  light: string
  mid: string
  dark: string
  rim: string
  inner: string
  number: string
  shadow: string
}> = {
  gold: {
    light: "#f4d77b",
    mid: "#c9a227",
    dark: "#8c6f0f",
    rim: "#f2dd91",
    inner: "#2c2314",
    number: "#f6e6a6",
    shadow: "rgba(140, 111, 15, 0.8)",
  },
  silver: {
    light: "#eaeaea",
    mid: "#b8b8b8",
    dark: "#6e6e6e",
    rim: "#ededed",
    inner: "#1f1f1f",
    number: "#dcdcdc",
    shadow: "rgba(80, 80, 80, 0.8)",
  },
  bronze: {
    light: "#e0a577",
    mid: "#a0613a",
    dark: "#5b3218",
    rim: "#d8a07a",
    inner: "#1a0f08",
    number: "#e3b089",
    shadow: "rgba(91, 50, 24, 0.8)",
  },
}
