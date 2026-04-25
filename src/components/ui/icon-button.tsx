"use client"

import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react"
import { cn } from "@/lib/cn"

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  badge?: boolean | number
  tone?: "default" | "ember" | "blood" | "ghost"
  size?: "sm" | "md" | "lg"
}

/**
 * Icon-only button with enforced a11y label, 48px+ touch target by default,
 * ember active state glow, and optional notification badge.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      badge,
      tone = "default",
      size = "md",
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    const sizeClass = {
      sm: "w-10 h-10",
      md: "w-12 h-12",
      lg: "w-14 h-14",
    }[size]

    const toneClass = {
      default:
        "text-bone/70 hover:text-ember hover:bg-ember/10 active:bg-ember/20",
      ember:
        "text-ember hover:bg-ember/15 active:bg-ember/25",
      blood: "text-blood hover:bg-blood/15 active:bg-blood/25",
      ghost:
        "text-bone/50 hover:text-bone hover:bg-ash active:bg-ash/80",
    }[tone]

    const showBadge = badge !== undefined && badge !== false
    const badgeNumeric =
      typeof badge === "number" && badge > 99 ? "99+" : badge

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          "active:scale-95 select-none",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClass,
          toneClass,
          className,
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center">
          {icon}
        </span>
        {showBadge && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-blood rounded-full text-[10px] font-bold text-bone flex items-center justify-center border border-ink"
          >
            {typeof badge === "number" ? badgeNumeric : ""}
          </span>
        )}
      </button>
    )
  },
)
