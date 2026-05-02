/**
 * Hand-rolled dataviz primitives.
 *
 * All SVG, all GPU-friendly, all reduced-motion aware. Total bundle weight
 * under 5kb gzipped — no chart library overhead. Used everywhere a number
 * needs visual context.
 */

export { SparkLine } from "./SparkLine"
export type { SparkLineProps } from "./SparkLine"

export { MicroBar } from "./MicroBar"
export type { MicroBarProps } from "./MicroBar"

export { RingProgress } from "./RingProgress"
export type { RingProgressProps } from "./RingProgress"

export { DeltaArrow } from "./DeltaArrow"
export type { DeltaArrowProps } from "./DeltaArrow"

export { Histogram } from "./Histogram"
export type { HistogramProps } from "./Histogram"

export { HeatGrid } from "./HeatGrid"
export type { HeatGridProps } from "./HeatGrid"

export { TrendArc } from "./TrendArc"
export type { TrendArcProps } from "./TrendArc"

export { PercentileChip } from "./PercentileChip"
export type { PercentileChipProps } from "./PercentileChip"
