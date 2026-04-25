import { cn } from "@/lib/cn"

export interface LaurelWreathProps {
  size?: number
  side?: "left" | "right" | "both"
  leafCount?: number
  className?: string
}

export function LaurelWreath({
  size = 120,
  side = "both",
  leafCount = 7,
  className,
}: LaurelWreathProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={cn("text-ember", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Laurel wreath"
    >
      {(side === "left" || side === "both") && (
        <LaurelBranch leafCount={leafCount} side="left" />
      )}
      {(side === "right" || side === "both") && (
        <g transform="translate(120, 0) scale(-1, 1)">
          <LaurelBranch leafCount={leafCount} side="left" />
        </g>
      )}
    </svg>
  )
}

function LaurelBranch({
  leafCount,
}: {
  leafCount: number
  side: "left" | "right"
}) {
  const leaves: { x: number; y: number; angle: number; size: number }[] = []
  for (let i = 0; i < leafCount; i++) {
    const t = i / (leafCount - 1)
    const stemX = 60 - 42 * Math.pow(t, 0.85)
    const stemY = 115 - 95 * Math.pow(t, 1.05)
    const dx = -42 * 0.85 * Math.pow(t, -0.15)
    const dy = -95 * 1.05 * Math.pow(t, 0.05)
    const tangent = Math.atan2(dy, dx) * (180 / Math.PI)
    const outwardOffset = i % 2 === 0 ? -5 : 4
    const leafAngle = tangent + outwardOffset * 6
    const leafSize = 8 - t * 2.5
    leaves.push({
      x: stemX + Math.cos((tangent + 90) * (Math.PI / 180)) * outwardOffset,
      y: stemY + Math.sin((tangent + 90) * (Math.PI / 180)) * outwardOffset,
      angle: leafAngle,
      size: leafSize,
    })
  }

  return (
    <g>
      <path
        d="M 60 115 Q 35 80 30 45 T 18 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />

      {leaves.map((leaf, i) => (
        <g
          key={i}
          transform={`translate(${leaf.x},${leaf.y}) rotate(${leaf.angle})`}
        >
          <ellipse
            cx="0"
            cy="0"
            rx={leaf.size}
            ry={leaf.size * 0.4}
            fill="currentColor"
            opacity="0.85"
          />
          <line
            x1={-leaf.size * 0.8}
            y1="0"
            x2={leaf.size * 0.8}
            y2="0"
            stroke="var(--ink)"
            strokeWidth="0.3"
            opacity="0.5"
          />
        </g>
      ))}

      <circle cx="60" cy="115" r="3" fill="currentColor" />
    </g>
  )
}
