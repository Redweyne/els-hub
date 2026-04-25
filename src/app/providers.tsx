"use client"

import { ReactNode } from "react"
import { Suspense } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { SessionTracker } from "@/components/analytics/SessionTracker"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={null}>
          <SessionTracker />
        </Suspense>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}
