import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "./button"

interface ConfirmationDialogProps {
  show: boolean
  title: string
  description: string
  cancelLabel?: string
  confirmLabel?: string
  isDestructive?: boolean
  isLoading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({
  show,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  isDestructive = false,
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-smoke border border-ash rounded-lg p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              {isDestructive && (
                <AlertTriangle size={24} className="text-blood flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-bone text-lg">{title}</h3>
                <p className="text-sm text-bone/70 mt-2">{description}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 ${
                  isDestructive
                    ? "bg-blood hover:bg-blood/80"
                    : "bg-ember hover:bg-ember/80"
                }`}
              >
                {isLoading ? "..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
