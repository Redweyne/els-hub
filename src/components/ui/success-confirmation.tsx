import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, X } from "lucide-react"
import { Button } from "./button"

interface SuccessConfirmationProps {
  show: boolean
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  autoClose?: boolean
  autoCloseDuration?: number
}

export function SuccessConfirmation({
  show,
  title,
  description,
  primaryAction,
  secondaryAction,
  autoClose = false,
  autoCloseDuration = 5000,
}: SuccessConfirmationProps) {
  const [isVisible, setIsVisible] = React.useState(show)

  React.useEffect(() => {
    setIsVisible(show)

    if (autoClose && show) {
      const timer = setTimeout(() => setIsVisible(false), autoCloseDuration)
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, autoCloseDuration])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
        >
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
          <div className="relative bg-smoke border border-ember/50 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 size={32} className="text-ember flex-shrink-0" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-bone text-lg">{title}</h3>
                <p className="text-sm text-bone/70 mt-1">{description}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {secondaryAction && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    secondaryAction.onClick()
                    setIsVisible(false)
                  }}
                  className="flex-1"
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  type="button"
                  onClick={() => {
                    primaryAction.onClick()
                    setIsVisible(false)
                  }}
                  className="flex-1 bg-ember hover:bg-ember/80"
                >
                  {primaryAction.label}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
