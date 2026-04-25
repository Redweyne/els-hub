import { cn } from "@/lib/cn"
import { StarPrimitive } from "./StarPrimitive"

export interface RankStarProps {
  size?: number
  filled?: boolean
  glow?: boolean
  className?: string
}

export function RankStar({
  size = 16,
  filled = true,
  glow = false,
  className,
}: RankStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={cn(
        "text-ember",
        glow && "drop-shadow-[0_0_6px_color-mix(in_oklab,var(--ember)_65%,transparent)]",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Rank star"
    >
      <StarPrimitive cx={10} cy={10} r={9} filled={filled} />
    </svg>
  )
}

export interface RankStarsRowProps {
  count: number
  filled?: number
  size?: number
  gap?: number
  className?: string
}

/**
 * Horizontal row of stars. `filled` controls how many are solid vs. outline.
 * Use for showing an active faction's rank (e.g. Class S = 5 filled stars).
 */
export function RankStarsRow({
  count,
  filled,
  size = 14,
  gap = 4,
  className,
}: RankStarsRowProps) {
  const filledCount = filled ?? count
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap }}
      aria-label={`${filledCount} of ${count} stars`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <RankStar key={i} size={size} filled={i < filledCount} />
      ))}
    </span>
  )
}
