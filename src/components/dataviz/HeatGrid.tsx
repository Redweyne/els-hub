"use client"

import { motion, useReducedMotion } from "framer-motion"
import { clamp } from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface HeatGridProps {
  /** Row-major matrix of cell intensities (0..1). null = empty cell. */
  cells: ReadonlyArray<ReadonlyArray<number | null>>
  /** Optional cell labels (row × col); used as `<title>` for tooltip. */
  labels?: ReadonlyArray<ReadonlyArray<string | null>>
  /** Cell size in px. Default 12. */
  cellSize?: number
  /** Gap between cells in px. Default 2. */
  gap?: number
  /** Color used at intensity 1. */
  color?: string
  /** Optional row labels to print on the left. */
  rowLabels?: ReadonlyArray<string>
  /** Optional column labels to print along the top. */
  colLabels?: ReadonlyArray<string>
  /** Animation entry delay (s). */
  delay?: number
  className?: string
  ariaLabel?: string
}

/**
 * Color-mapped grid (heatmap). ~1.0kb.
 *
 * Used for:
 *  - Day-Type Mastery (5×2 grid: day-types × cycles)
 *  - 365-day faction contribution tile (52×7)
 *
 * Cells fade in with a stagger based on row + col index. Reduced motion
 * paints them all at full opacity instantly.
 */
export function HeatGrid({
  cells,
  labels,
  cellSize = 12,
  gap = 2,
  color = "currentColor",
  rowLabels,
  colLabels,
  delay = 0,
  className,
  ariaLabel,
}: HeatGridProps) {
  const reducedMotion = useReducedMotion()
  const rows = cells.length
  const cols = rows > 0 ? cells[0].length : 0
  const labelRowH = colLabels ? 14 : 0
  const labelColW = rowLabels ? 36 : 0
  const gridW = cols * cellSize + (cols - 1) * gap
  const gridH = rows * cellSize + (rows - 1) * gap
  const totalW = labelColW + gridW
  const totalH = labelRowH + gridH

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className={cn("block", className)}
      role="img"
      aria-label={ariaLabel ?? "Heatmap"}
      style={{ color }}
    >
      {/* Column labels along the top */}
      {colLabels?.map((cl, c) => (
        <text
          key={`cl-${c}`}
          x={labelColW + c * (cellSize + gap) + cellSize / 2}
          y={10}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono), monospace"
          fill="rgba(232, 226, 213, 0.45)"
          className="uppercase tracking-wider"
        >
          {cl}
        </text>
      ))}
      {/* Row labels on the left */}
      {rowLabels?.map((rl, r) => (
        <text
          key={`rl-${r}`}
          x={labelColW - 6}
          y={labelRowH + r * (cellSize + gap) + cellSize / 2 + 3}
          textAnchor="end"
          fontSize={9}
          fontFamily="var(--font-mono), monospace"
          fill="rgba(232, 226, 213, 0.5)"
          className="uppercase tracking-wider"
        >
          {rl}
        </text>
      ))}
      {/* Cells */}
      {cells.map((row, r) =>
        row.map((v, c) => {
          const x = labelColW + c * (cellSize + gap)
          const y = labelRowH + r * (cellSize + gap)
          const intensity = v == null ? 0 : clamp(v, 0, 1)
          const opacity = v == null ? 0.06 : 0.16 + intensity * 0.84
          const tt = labels?.[r]?.[c]
          return (
            <motion.rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={1.5}
              fill={v == null ? "rgba(255,255,255,0.05)" : color}
              fillOpacity={opacity}
              initial={
                reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: delay + (r + c) * 0.012,
                duration: reducedMotion ? 0 : 0.3,
                ease: "easeOut",
              }}
            >
              {tt && <title>{tt}</title>}
            </motion.rect>
          )
        }),
      )}
    </svg>
  )
}
