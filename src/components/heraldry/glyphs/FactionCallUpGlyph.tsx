import { cn } from "@/lib/cn"

export interface GlyphProps {
  size?: number
  className?: string
  filled?: boolean
}

export function FactionCallUpGlyph({
  size = 48,
  className,
  filled = false,
}: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("text-ember", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Faction Call-Up"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.08 : undefined}
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

      <g transform="translate(32, 32)">
        <path
          d="M -14 -6 L -4 -6 L 8 -12 L 8 12 L -4 6 L -14 6 Q -18 6 -18 3 L -18 -3 Q -18 -6 -14 -6 Z"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="-14" y="-1" width="8" height="2" fill="currentColor" opacity="0.8" />
        <path
          d="M 12 -10 Q 18 -6 18 0 Q 18 6 12 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M 15 -6 Q 19 -3 19 0 Q 19 3 15 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </svg>
  )
}

export function GloryOfOakvaleGlyph({
  size = 48,
  className,
  filled = false,
}: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("text-ember", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Glory of Oakvale"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.08 : undefined}
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

      <g transform="translate(32, 32)">
        <g transform="translate(0, -8)">
          <path
            d="M 0 -12 C -4 -10 -7 -6 -6 -2 C -3 -1 -1 -4 0 -7 C 1 -4 3 -1 6 -2 C 7 -6 4 -10 0 -12 Z"
            fill="currentColor"
            opacity="0.95"
          />
          <line x1="0" y1="-5" x2="0" y2="3" stroke="var(--ink)" strokeWidth="0.6" />
        </g>
        <g transform="translate(0, 5)">
          <rect x="-10" y="-2" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="-10" y="-7" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="-2" y="-7" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="6" y="-7" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="-1.5" y="4" width="3" height="8" fill="var(--ink)" stroke="currentColor" strokeWidth="0.7" />
        </g>
      </g>
    </svg>
  )
}

export function GovernorsWarGlyph({
  size = 48,
  className,
  filled = false,
}: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("text-ember", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Governor's War"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.08 : undefined}
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

      <g transform="translate(32, 32)">
        <g transform="translate(0, -14)">
          <path
            d="M -6 -2 L -4 -6 L 0 -8 L 4 -6 L 6 -2 Z"
            fill="currentColor"
          />
          <rect x="-6" y="-2" width="12" height="2" fill="currentColor" />
          <circle cx="-3" cy="-4" r="0.8" fill="var(--ink)" />
          <circle cx="0" cy="-5" r="0.8" fill="var(--ink)" />
          <circle cx="3" cy="-4" r="0.8" fill="var(--ink)" />
        </g>

        <g transform="rotate(-28) translate(0, 4)">
          <PistolPath />
        </g>
        <g transform="rotate(28) translate(0, 4)">
          <PistolPath />
        </g>
      </g>
    </svg>
  )
}

function PistolPath() {
  return (
    <g stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M -10 0 L 10 0 L 10 2 L 3 2 L 3 6 L -3 6 L -3 2 L -10 2 Z" fill="currentColor" fillOpacity="0.9" />
      <line x1="-10" y1="1" x2="-13" y2="1" strokeWidth="1.6" />
    </g>
  )
}
