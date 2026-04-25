import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface EyebrowProps {
  children: ReactNode
  tone?: "ember" | "blood" | "bone" | "muted"
  size?: "xs" | "sm"
  className?: string
  as?: "span" | "p" | "div"
}

/**
 * Micro-label above titles and section headers.
 * Uppercase, wide-tracked, understated — the "over-eye" of a design.
 */
export function Eyebrow({
  children,
  tone = "muted",
  size = "xs",
  className,
  as: Component = "span",
}: EyebrowProps) {
  const toneClass = {
    ember: "text-ember",
    blood: "text-blood",
    bone: "text-bone",
    muted: "text-bone/50",
  }[tone]

  const sizeClass = size === "sm" ? "text-xs tracking-[0.22em]" : "text-[10px] tracking-[0.28em]"

  return (
    <Component
      className={cn(
        "uppercase font-body font-medium",
        sizeClass,
        toneClass,
        className,
      )}
    >
      {children}
    </Component>
  )
}
