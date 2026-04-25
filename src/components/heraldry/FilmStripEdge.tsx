import { cn } from "@/lib/cn"

export interface FilmStripEdgeProps {
  orientation?: "vertical" | "horizontal"
  holeCount?: number
  className?: string
}

export function FilmStripEdge({
  orientation = "vertical",
  holeCount = 10,
  className,
}: FilmStripEdgeProps) {
  const isVertical = orientation === "vertical"
  return (
    <div
      className={cn(
        "flex items-center justify-around",
        isVertical ? "flex-col w-3 h-full py-2" : "flex-row h-3 w-full px-2",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: holeCount }).map((_, i) => (
        <span
          key={i}
          className="bg-ember/50 rounded-sm"
          style={{
            width: isVertical ? 4 : 6,
            height: isVertical ? 6 : 4,
          }}
        />
      ))}
    </div>
  )
}
