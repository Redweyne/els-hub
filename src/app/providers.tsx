"use client"

import { ReactNode } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
