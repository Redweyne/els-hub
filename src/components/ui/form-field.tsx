import React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  showValidation?: boolean
  isValid?: boolean
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, showValidation = false, isValid = false, className = "", disabled, ...props }, ref) => {
    const hasError = !!error
    const showSuccess = showValidation && isValid && !hasError

    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-bone">{label}</label>
        <div className="relative">
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full px-3 py-2 rounded-lg text-bone placeholder:text-bone/30
              transition-all duration-200 border
              ${disabled ? "bg-ash/50 border-ash text-bone/50 cursor-not-allowed" : "bg-smoke border-ash"}
              ${hasError ? "border-blood/50 focus:border-blood focus:ring-1 focus:ring-blood/30" : ""}
              ${showSuccess ? "border-ember focus:border-ember focus:ring-1 focus:ring-ember/30" : ""}
              ${!hasError && !showSuccess ? "focus:border-ember focus:ring-1 focus:ring-ember/20" : ""}
              ${className}
            `}
            {...props}
          />
          {hasError && <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blood pointer-events-none" />}
          {showSuccess && <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ember pointer-events-none" />}
        </div>
        {error && <p className="text-xs text-blood flex items-center gap-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-bone/50">{helperText}</p>}
      </div>
    )
  }
)

FormField.displayName = "FormField"

export { FormField }
