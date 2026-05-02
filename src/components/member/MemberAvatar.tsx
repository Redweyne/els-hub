"use client"

import { useId, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/cn"

export type RankTier =
  | "mastermind"
  | "leaders"
  | "frontliner"
  | "production"
  | "stranger"
  | string

export interface MemberAvatarProps {
  /**
   * The canonical name. Initials are derived from this.
   * Pass the in-game name verbatim; we'll trim and pluck up to 2 graphemes.
   */
  name: string
  /** Tier dictates the ring gradient. Unknown tiers fall back to ash. */
  tier?: RankTier | null
  /** Family role gives a tiny corner-pin tint (advisor/general/etc.). */
  familyRole?: string | null
  /** Pixel diameter. Choose from 24 / 32 / 40 / 56 / 80. Default 40. */
  size?: 24 | 32 | 40 | 56 | 80
  /**
   * Show a 1.5px ember pulse on the ring — used as a "presence"
   * indicator when this member has been active in the last 7 days.
   */
  active?: boolean
  /** Optional unique key for the SVG gradient ids. */
  idScope?: string
  /** Stable mode — no animations at all (good inside virtualized lists). */
  static?: boolean
  className?: string
  /** Override aria-label. */
  ariaLabel?: string
}

/**
 * Avatar with tier-gradient ring + initials. Zero asset cost — ~1.0kb.
 *
 * Visual contract:
 *   - ring color = tier (Mastermind = ember, Leaders = blood,
 *     Frontliner = bone, Production = bone-dim, Stranger = ash)
 *   - core fill = ink, initials = bone (uses display font)
 *   - active=true: ember pulse rim; respects reduced-motion
 *
 * Used in: member list rows, leaderboards, podiums, activity feed,
 * top-movers grid, peek-card bottom sheet.
 */
export function MemberAvatar({
  name,
  tier = "frontliner",
  familyRole,
  size = 40,
  active = false,
  idScope,
  static: isStatic = false,
  className,
  ariaLabel,
}: MemberAvatarProps) {
  const reducedMotion = useReducedMotion()
  const fallbackId = useId()
  const uid = (idScope ?? fallbackId).replace(/[:]/g, "")

  const initials = useMemo(() => deriveInitials(name), [name])
  const palette = TIER_PALETTE[tier ?? "frontliner"] ?? TIER_PALETTE.frontliner

  // Type-scaled values
  const ring = size <= 24 ? 1.4 : size <= 32 ? 1.6 : size <= 40 ? 1.8 : 2.2
  const fontSize =
    size === 24
      ? "text-[9px]"
      : size === 32
        ? "text-[11px]"
        : size === 40
          ? "text-[13px]"
          : size === 56
            ? "text-[18px]"
            : "text-[28px]"

  const showPresence = active && size >= 32

  const animate = !reducedMotion && !isStatic && active

  return (
    <span
      className={cn("relative inline-flex flex-shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${name}${tier ? ` (${tier})` : ""}`}
    >
      {/* Ring SVG — pure presentation */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`r-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.ringStart} />
            <stop offset="100%" stopColor={palette.ringEnd} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ring / 2}
          fill="none"
          stroke={`url(#r-${uid})`}
          strokeWidth={ring}
        />
      </svg>

      {/* Core */}
      <span
        className="relative inline-flex items-center justify-center w-full h-full rounded-full bg-ink/85 border border-ash/60 select-none"
        style={{ inset: ring }}
      >
        <span
          className={cn(
            "font-display font-semibold text-bone tracking-[0.04em] leading-none",
            fontSize,
          )}
          style={{ color: palette.text }}
        >
          {initials || "?"}
        </span>
      </span>

      {/* Family-role tint: small corner notch */}
      {familyRole && size >= 40 && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-ink"
          style={{ background: ROLE_COLORS[familyRole] ?? "var(--ember)" }}
          aria-hidden="true"
          title={familyRole}
        />
      )}

      {/* Presence pulse — only when actually active */}
      {showPresence && (
        <motion.span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow:
              "inset 0 0 0 1.5px color-mix(in oklab, var(--ember) 70%, transparent)",
            willChange: animate ? "opacity, transform" : undefined,
          }}
          animate={
            animate
              ? { opacity: [0.55, 1, 0.55], scale: [1, 1.04, 1] }
              : undefined
          }
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

const TIER_PALETTE: Record<
  string,
  { ringStart: string; ringEnd: string; text: string }
> = {
  mastermind: {
    ringStart: "#e0bd4d",
    ringEnd: "#c9a227",
    text: "#e8e2d5",
  },
  leaders: {
    ringStart: "#a31b1b",
    ringEnd: "#580000",
    text: "#e8e2d5",
  },
  frontliner: {
    ringStart: "#e8e2d5",
    ringEnd: "#8a8680",
    text: "#e8e2d5",
  },
  production: {
    ringStart: "#8a8680",
    ringEnd: "#3a3a3a",
    text: "#e8e2d5",
  },
  stranger: {
    ringStart: "#3a3a3a",
    ringEnd: "#1a1817",
    text: "#bdb8af",
  },
}

const ROLE_COLORS: Record<string, string> = {
  advisor: "var(--ember)",
  general: "var(--blood-light)",
  diplomat: "var(--bone)",
  coordinator: "var(--ember-dark)",
}

/**
 * Pull up to two display "characters" from a name. Handles:
 *  - Latin words → first letter of first 2 tokens
 *  - Single-token / decorated → first 1–2 graphemes
 *  - CJK / emoji-heavy → first grapheme only
 *  - Names like "[ELS] X" → strip the tag first
 */
function deriveInitials(name: string): string {
  const cleaned = name
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .trim()
  if (!cleaned) {
    // Fallback: first non-whitespace grapheme of the original.
    const first = Array.from(name.trim())[0]
    return first ? first.toLocaleUpperCase() : "?"
  }
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) {
    return (
      (firstGrapheme(tokens[0]) + firstGrapheme(tokens[1])).toLocaleUpperCase()
    )
  }
  // Single token: first 1–2 graphemes. CJK names use a single character.
  const graphemes = Array.from(tokens[0] ?? "")
  if (graphemes.length === 0) return "?"
  if (isCJKish(graphemes[0])) return graphemes[0]
  return (
    graphemes
      .slice(0, 2)
      .join("")
      .toLocaleUpperCase()
  )
}

function firstGrapheme(s: string): string {
  return Array.from(s)[0] ?? ""
}

function isCJKish(c: string): boolean {
  if (!c) return false
  const code = c.codePointAt(0) ?? 0
  // CJK Unified Ideographs, Hiragana, Katakana, Hangul Syllables
  return (
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af)
  )
}
