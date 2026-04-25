import { cn } from "@/lib/cn"

export interface ELSEmblemV2Props {
  size?: number
  glow?: boolean
  starCount?: 1 | 3 | 4 | 5 | 6
  variant?: "full" | "mark" | "stripped"
  className?: string
  /**
   * Unique id scope for SVG `<defs>` references.
   * Pass distinct values when multiple ELSEmblems render on one page.
   */
  idScope?: string
}

export function ELSEmblemV2({
  size = 200,
  glow = false,
  starCount = 5,
  variant = "full",
  className,
  idScope = "els",
}: ELSEmblemV2Props) {
  const starAngles = getStarAngles(starCount)
  const uid = idScope

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={cn(
        "text-ember",
        glow && "drop-shadow-[0_0_12px_color-mix(in_oklab,var(--ember)_55%,transparent)]",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ELYSIUM Faction Emblem"
    >
      <defs>
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`tower-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ember-light)" stopOpacity="0.55" />
          <stop offset="55%" stopColor="var(--ember)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ember-dark)" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`field-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ink-100)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {variant === "full" && (
        <circle cx="100" cy="100" r="92" fill={`url(#field-${uid})`} />
      )}

      {variant !== "stripped" && (
        <g>
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.4"
          />

          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2
            const inner = 92
            const outer = 95
            const x1 = Math.round((100 + Math.cos(angle) * inner) * 100) / 100
            const y1 = Math.round((100 + Math.sin(angle) * inner) * 100) / 100
            const x2 = Math.round((100 + Math.cos(angle) * outer) * 100) / 100
            const y2 = Math.round((100 + Math.sin(angle) * outer) * 100) / 100
            const major = i % 5 === 0
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={major ? 0.6 : 0.3}
                opacity={major ? 0.7 : 0.25}
              />
            )
          })}
        </g>
      )}

      {variant === "full" && (
        <g>
          {starAngles.map((angleDeg, i) => {
            const rad = (angleDeg * Math.PI) / 180
            const r = 76
            const cx = Math.round((100 + Math.cos(rad) * r) * 100) / 100
            const cy = Math.round((100 + Math.sin(rad) * r) * 100) / 100
            return <StarPath key={i} cx={cx} cy={cy} r={5} />
          })}
        </g>
      )}

      <g transform="translate(100, 102)">
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="var(--ink)"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.9"
        />
        <circle
          cx="0"
          cy="0"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          opacity="0.5"
        />

        <g transform="translate(0, 2)">
          <rect
            x="-14"
            y="-6"
            width="28"
            height="22"
            fill={`url(#tower-${uid})`}
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="-14"
            y="-14"
            width="7"
            height="8"
            fill={`url(#tower-${uid})`}
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="-3"
            y="-14"
            width="6"
            height="8"
            fill={`url(#tower-${uid})`}
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="7"
            y="-14"
            width="7"
            height="8"
            fill={`url(#tower-${uid})`}
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="-14"
            x2="0"
            y2="-23"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path d="M0 -23 L7 -21 L0 -19 Z" fill="currentColor" />
          <path
            d="M-4 16 L-4 10 A4 4 0 0 1 4 10 L4 16 Z"
            fill="var(--ink)"
            stroke="currentColor"
            strokeWidth="0.7"
          />
          <rect x="-1" y="-1" width="2" height="6" fill="var(--ink)" />
        </g>
      </g>

      {variant === "full" && (
        <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6">
          {[
            { x: 30, y: 30 },
            { x: 170, y: 30 },
            { x: 170, y: 170 },
            { x: 30, y: 170 },
          ].map((pos, i) => (
            <g key={i} transform={`translate(${pos.x},${pos.y})`}>
              <path d="M -4 -4 L 0 -8 L 4 -4 L 0 0 Z" />
              <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none" />
            </g>
          ))}
        </g>
      )}

      {(variant === "full" || variant === "mark") && (
        <text
          x="100"
          y="165"
          textAnchor="middle"
          fontSize="16"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontWeight="600"
          fill="currentColor"
          letterSpacing="4"
          filter={`url(#glow-${uid})`}
        >
          ELS
        </text>
      )}

      {variant === "full" && (
        <text
          x="100"
          y="180"
          textAnchor="middle"
          fontSize="6"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          fill="currentColor"
          letterSpacing="3"
          opacity="0.7"
        >
          ELYSIUM
        </text>
      )}
    </svg>
  )
}

function getStarAngles(count: number): number[] {
  if (count === 1) return [270]
  const arcCenter = 270
  const arcSpan = count <= 3 ? 60 : count === 5 ? 84 : 96
  const arcStart = arcCenter - arcSpan / 2
  const step = arcSpan / (count - 1)
  return Array.from({ length: count }, (_, i) => arcStart + i * step)
}

function StarPath({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * 0.42
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return (
    <polygon
      points={points.join(" ")}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.3"
      strokeLinejoin="round"
    />
  )
}

