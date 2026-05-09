"use client"

import { ReactNode } from "react"
import { Suspense } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { SessionTracker } from "@/components/analytics/SessionTracker"
import { MemberPeekProvider } from "@/components/member/MemberPeek"
import { UploadBanner } from "@/components/layout/UploadBanner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MemberPeekProvider>
          <Suspense fallback={null}>
            <SessionTracker />
          </Suspense>
          <UploadBanner />
          {children}
        </MemberPeekProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
