import { cn } from "@/lib/cn"

export interface OrnateDividerProps {
  variant?: "solid" | "dotted" | "fleur"
  label?: string
  className?: string
}

export function OrnateDivider({
  variant = "solid",
  label,
  className,
}: OrnateDividerProps) {
  return (
    <div
      className={cn("flex items-center gap-3 w-full text-ember/70", className)}
      role="separator"
      aria-label={label}
    >
      <DividerLine variant={variant} />

      <div className="flex-shrink-0">
        <CenterMark variant={variant} />
      </div>

      {label && (
        <span className="text-[10px] uppercase tracking-[0.28em] font-body text-bone/50 whitespace-nowrap">
          {label}
        </span>
      )}

      {label && (
        <div className="flex-shrink-0">
          <CenterMark variant={variant} />
        </div>
      )}

      <DividerLine variant={variant} />
    </div>
  )
}

function DividerLine({ variant }: { variant: OrnateDividerProps["variant"] }) {
  if (variant === "dotted") {
    return (
      <div
        className="h-px flex-1 border-t border-dotted border-ember/40"
        style={{ borderTopWidth: "1px" }}
      />
    )
  }
  return (
    <div
      className="h-px flex-1 bg-gradient-to-r from-transparent via-ember/50 to-transparent"
      style={{ minWidth: "12px" }}
    />
  )
}

function CenterMark({ variant }: { variant: OrnateDividerProps["variant"] }) {
  if (variant === "fleur") {
    return (
      <svg
        width="22"
        height="10"
        viewBox="0 0 22 10"
        fill="none"
        className="text-ember"
        aria-hidden="true"
      >
        <path
          d="M0 5 L5 5 M17 5 L22 5"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <circle cx="6" cy="5" r="1.2" fill="currentColor" />
        <circle cx="16" cy="5" r="1.2" fill="currentColor" />
        <path
          d="M11 1 L13 5 L11 9 L9 5 Z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    )
  }
  if (variant === "dotted") {
    return (
      <div
        className="h-1.5 w-1.5 rounded-full bg-ember/70"
        aria-hidden="true"
      />
    )
  }
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      className="text-ember"
      aria-hidden="true"
    >
      <path
        d="M7 1 L11 5 L7 9 L3 5 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 3 L9 5 L7 7 L5 5 Z"
        fill="var(--ink)"
      />
    </svg>
  )
}
