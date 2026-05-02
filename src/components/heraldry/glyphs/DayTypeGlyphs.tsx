/**
 * Day-type glyphs for the Governor's War daily cycle.
 *
 * Each is a 64×64 inline SVG that scales to any size. They share the same
 * convention as the other heraldry glyphs (currentColor stroke, text-ember
 * default tint, optional `filled` for solid variant).
 *
 * Visual concepts:
 *   Robbing   — money sack with cross-hatched seam (loot run)
 *   Kingpin   — silhouetted crown (boss target)
 *   Influence — concentric rings expanding outward (sphere of control)
 *   Speedups  — three stacked chevrons (fast-forward fuel)
 *   Massacre  — crossed daggers (peak-intensity day)
 */

import { cn } from "@/lib/cn"
import type { GlyphProps } from "./FactionCallUpGlyph"

function GlyphFrame({
  size = 48,
  className,
  ariaLabel,
  children,
}: {
  size?: number
  className?: string
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("text-ember", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.5"
      />
      {children}
    </svg>
  )
}

export function RobbingGlyph({ size, className, filled }: GlyphProps) {
  return (
    <GlyphFrame size={size} className={className} ariaLabel="Robbing">
      <g transform="translate(32, 33)">
        {/* Sack body */}
        <path
          d="M -10 -2 Q -14 6 -10 13 Q -4 16 0 16 Q 4 16 10 13 Q 14 6 10 -2 Z"
          fill={filled ? "currentColor" : "none"}
          fillOpacity={filled ? 0.18 : undefined}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Tied neck */}
        <path
          d="M -7 -2 Q -8 -8 -3 -10 Q 0 -11 3 -10 Q 8 -8 7 -2 Z"
          fill="currentColor"
          opacity="0.85"
        />
        {/* Cross-hatch seam */}
        <line x1="-6" y1="3" x2="6" y2="3" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        <line x1="-7" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        {/* Coin sparkle */}
        <circle cx="0" cy="11" r="1.4" fill="currentColor" />
      </g>
    </GlyphFrame>
  )
}

export function KingpinGlyph({ size, className, filled }: GlyphProps) {
  return (
    <GlyphFrame size={size} className={className} ariaLabel="Kingpin">
      <g transform="translate(32, 36)">
        {/* Crown band */}
        <rect
          x="-13"
          y="2"
          width="26"
          height="6"
          fill={filled ? "currentColor" : "none"}
          fillOpacity={filled ? 0.18 : undefined}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Three peaks */}
        <path
          d="M -13 2 L -13 -6 L -8 -2 L -3 -10 L 0 -2 L 3 -10 L 8 -2 L 13 -6 L 13 2 Z"
          fill={filled ? "currentColor" : "none"}
          fillOpacity={filled ? 0.18 : undefined}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Gem dots */}
        <circle cx="-8" cy="-2" r="1.6" fill="currentColor" />
        <circle cx="0" cy="-3" r="1.8" fill="currentColor" />
        <circle cx="8" cy="-2" r="1.6" fill="currentColor" />
        {/* Bottom stroke */}
        <line x1="-13" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      </g>
    </GlyphFrame>
  )
}

export function InfluenceGlyph({ size, className, filled }: GlyphProps) {
  return (
    <GlyphFrame size={size} className={className} ariaLabel="Influence">
      <g transform="translate(32, 32)">
        <circle cx="0" cy="0" r="2.4" fill="currentColor" />
        <circle
          cx="0"
          cy="0"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.85"
        />
        <circle
          cx="0"
          cy="0"
          r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.6"
          strokeDasharray="2 2"
        />
        <circle
          cx="0"
          cy="0"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          opacity="0.4"
          strokeDasharray="1 3"
        />
        {filled ? (
          <circle cx="0" cy="0" r="6" fill="currentColor" fillOpacity="0.1" />
        ) : null}
      </g>
    </GlyphFrame>
  )
}

export function SpeedupsGlyph({ size, className, filled }: GlyphProps) {
  return (
    <GlyphFrame size={size} className={className} ariaLabel="Speedups">
      <g transform="translate(32, 32)">
        {/* Three stacked chevrons pointing right */}
        <path
          d="M -12 -10 L -2 0 L -12 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <path
          d="M -4 -10 L 6 0 L -4 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <path
          d="M 4 -10 L 14 0 L 4 10"
          fill={filled ? "currentColor" : "none"}
          fillOpacity={filled ? 0.18 : undefined}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </GlyphFrame>
  )
}

export function MassacreGlyph({ size, className, filled }: GlyphProps) {
  return (
    <GlyphFrame size={size} className={className} ariaLabel="Massacre">
      <g transform="translate(32, 32)">
        {/* Two crossed daggers */}
        <g transform="rotate(-30)">
          <DaggerPath filled={filled} />
        </g>
        <g transform="rotate(30)">
          <DaggerPath filled={filled} />
        </g>
        {/* Center pivot */}
        <circle cx="0" cy="0" r="1.8" fill="currentColor" />
      </g>
    </GlyphFrame>
  )
}

function DaggerPath({ filled }: { filled?: boolean }) {
  return (
    <g
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Blade */}
      <path
        d="M 0 -16 L 2.5 -2 L -2.5 -2 Z"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.2 : undefined}
      />
      {/* Crossguard */}
      <line x1="-5" y1="-2" x2="5" y2="-2" strokeWidth="2" />
      {/* Hilt */}
      <line x1="0" y1="-2" x2="0" y2="6" strokeWidth="2.2" />
      {/* Pommel */}
      <circle cx="0" cy="7.5" r="1.5" fill="currentColor" />
    </g>
  )
}

import type { GWDayType } from "@/lib/events/config"

/** Lookup from a GW day type → its glyph component. */
export function getDayTypeGlyph(type: GWDayType) {
  switch (type) {
    case "robbing":
      return RobbingGlyph
    case "kingpin":
      return KingpinGlyph
    case "influence":
      return InfluenceGlyph
    case "speedups":
      return SpeedupsGlyph
    case "massacre":
      return MassacreGlyph
  }
}
