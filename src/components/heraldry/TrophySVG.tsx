import { cn } from "@/lib/cn"
import type { MedalTier } from "./MedalSVG"

export interface TrophySVGProps {
  tier?: MedalTier | "slate"
  label?: string
  size?: number
  idScope?: string
  className?: string
}

export function TrophySVG({
  tier = "gold",
  label,
  size = 96,
  idScope,
  className,
}: TrophySVGProps) {
  const uid = idScope ?? `t-${tier}`
  const palette = TROPHY_PALETTE[tier]

  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 100 110"
      className={cn(className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label ?? `${tier} trophy`}
    >
      <defs>
        <linearGradient id={`trophy-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="50%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </linearGradient>
        <linearGradient id={`trophy-shine-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
        </linearGradient>
      </defs>

      <g>
        <rect
          x="30"
          y="95"
          width="40"
          height="6"
          fill={palette.dark}
          stroke={palette.rim}
          strokeWidth="0.6"
          rx="1"
        />
        <rect
          x="34"
          y="88"
          width="32"
          height="8"
          fill={`url(#trophy-body-${uid})`}
          stroke={palette.rim}
          strokeWidth="0.6"
        />

        <rect
          x="45"
          y="72"
          width="10"
          height="18"
          fill={`url(#trophy-body-${uid})`}
          stroke={palette.rim}
          strokeWidth="0.6"
        />

        <path
          d="M 18 30 Q 10 40 14 55 Q 18 68 32 68 L 34 62 Q 24 62 21 50 Q 19 40 26 32 Z"
          fill={`url(#trophy-body-${uid})`}
          stroke={palette.rim}
          strokeWidth="0.8"
        />
        <path
          d="M 82 30 Q 90 40 86 55 Q 82 68 68 68 L 66 62 Q 76 62 79 50 Q 81 40 74 32 Z"
          fill={`url(#trophy-body-${uid})`}
          stroke={palette.rim}
          strokeWidth="0.8"
        />

        <path
          d="M 24 18 L 76 18 L 74 58 Q 74 70 50 73 Q 26 70 26 58 Z"
          fill={`url(#trophy-body-${uid})`}
          stroke={palette.rim}
          strokeWidth="1"
        />
        <path
          d="M 24 18 L 76 18 L 74 58 Q 74 70 50 73 Q 26 70 26 58 Z"
          fill={`url(#trophy-shine-${uid})`}
          opacity="0.7"
        />

        <ellipse
          cx="50"
          cy="18"
          rx="26"
          ry="5"
          fill={palette.light}
          stroke={palette.rim}
          strokeWidth="1"
        />
        <ellipse
          cx="50"
          cy="17"
          rx="22"
          ry="3"
          fill={palette.dark}
          opacity="0.7"
        />

        <g transform="translate(50, 42)" opacity="0.9">
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = (Math.PI / 5) * (i * 2) - Math.PI / 2
            const x = Math.cos(angle) * 10
            const y = Math.sin(angle) * 10
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.2"
                fill={palette.rim}
              />
            )
          })}
          <circle cx="0" cy="0" r="4" fill="none" stroke={palette.rim} strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  )
}

const TROPHY_PALETTE: Record<string, {
  light: string
  mid: string
  dark: string
  rim: string
}> = {
  gold: {
    light: "#f4d77b",
    mid: "#c9a227",
    dark: "#8c6f0f",
    rim: "#f2dd91",
  },
  silver: {
    light: "#eaeaea",
    mid: "#b8b8b8",
    dark: "#6e6e6e",
    rim: "#ededed",
  },
  bronze: {
    light: "#e0a577",
    mid: "#a0613a",
    dark: "#5b3218",
    rim: "#d8a07a",
  },
  slate: {
    light: "#5a5a5a",
    mid: "#3a3a3a",
    dark: "#1e1e1e",
    rim: "#6b6b6b",
  },
}
