import * as React from "react"

import { cn } from "@/lib/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disabled, ...props }, ref) => (
    <input
      type={type}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200",
        "bg-smoke border-ash text-bone placeholder:text-bone/30",
        "focus-visible:outline-none focus-visible:border-ember focus-visible:ring-1 focus-visible:ring-ember/20",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        disabled && "bg-ash/50 border-ash text-bone/50 cursor-not-allowed",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
