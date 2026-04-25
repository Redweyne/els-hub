import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface DisplayHeadingProps {
  children: ReactNode
  level?: 1 | 2 | 3
  variant?: "hero" | "section" | "sub" | "tight"
  tone?: "bone" | "ember" | "gradient"
  className?: string
  as?: "h1" | "h2" | "h3" | "h4" | "div"
}

/**
 * Cormorant Garamond display heading with consistent tracking, weights,
 * and cinematic tone variants. Pair with `<Eyebrow>` above it.
 */
export function DisplayHeading({
  children,
  level = 2,
  variant,
  tone = "bone",
  className,
  as,
}: DisplayHeadingProps) {
  const Component = as ?? (`h${level}` as "h1" | "h2" | "h3")

  const resolvedVariant =
    variant ??
    (level === 1 ? "hero" : level === 2 ? "section" : "sub")

  const variantClass = {
    hero: "text-4xl md:text-5xl lg:text-6xl uppercase tracking-[0.25em] font-semibold leading-[1.05]",
    section: "text-2xl md:text-3xl uppercase tracking-[0.15em] font-semibold leading-[1.1]",
    sub: "text-lg md:text-xl tracking-[0.08em] font-semibold leading-tight",
    tight: "text-3xl md:text-5xl tracking-[-0.02em] font-semibold leading-[1]",
  }[resolvedVariant]

  const toneClass = {
    bone: "text-bone",
    ember: "text-ember",
    gradient:
      "bg-gradient-to-r from-bone via-ember to-bone bg-clip-text text-transparent",
  }[tone]

  return (
    <Component
      className={cn("font-display", variantClass, toneClass, className)}
    >
      {children}
    </Component>
  )
}
