import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface FactionCrestFrameProps {
  children: ReactNode
  corner?: "sharp" | "flourish"
  cornerSize?: number
  inset?: number
  tone?: "ember" | "blood" | "ash"
  className?: string
  innerClassName?: string
}

/**
 * Art-deco corner bracket frame.
 * Four corners, absolutely positioned. Children render in-flow above the brackets.
 * Use on hero sections or premium cards.
 */
export function FactionCrestFrame({
  children,
  corner = "flourish",
  cornerSize = 28,
  inset = 8,
  tone = "ember",
  className,
  innerClassName,
}: FactionCrestFrameProps) {
  const toneClass =
    tone === "blood" ? "text-blood" : tone === "ash" ? "text-bone/40" : "text-ember"

  return (
    <div className={cn("relative", className)}>
      <CornerBracket
        corner={corner}
        size={cornerSize}
        position="tl"
        inset={inset}
        className={toneClass}
      />
      <CornerBracket
        corner={corner}
        size={cornerSize}
        position="tr"
        inset={inset}
        className={toneClass}
      />
      <CornerBracket
        corner={corner}
        size={cornerSize}
        position="bl"
        inset={inset}
        className={toneClass}
      />
      <CornerBracket
        corner={corner}
        size={cornerSize}
        position="br"
        inset={inset}
        className={toneClass}
      />
      <div className={cn("relative", innerClassName)}>{children}</div>
    </div>
  )
}

interface CornerBracketProps {
  corner: "sharp" | "flourish"
  size: number
  position: "tl" | "tr" | "bl" | "br"
  inset: number
  className?: string
}

function CornerBracket({
  corner,
  size,
  position,
  inset,
  className,
}: CornerBracketProps) {
  const rotation = {
    tl: 0,
    tr: 90,
    br: 180,
    bl: 270,
  }[position]

  const pos = {
    tl: { top: inset, left: inset },
    tr: { top: inset, right: inset },
    br: { bottom: inset, right: inset },
    bl: { bottom: inset, left: inset },
  }[position]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("absolute pointer-events-none", className)}
      style={{ ...pos, transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {corner === "sharp" ? (
        <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M 2 14 L 2 2 L 14 2" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M 2 18 L 2 2 L 18 2" />
          <path d="M 2 10 L 6 6 L 10 2" strokeWidth="0.6" opacity="0.7" />
          <circle cx="2" cy="2" r="1.4" fill="currentColor" stroke="none" />
        </g>
      )}
    </svg>
  )
}
