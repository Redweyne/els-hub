"use client"

import React, { ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-ink pt-20 pb-28 px-4 flex items-center justify-center">
            <div className="max-w-md w-full">
              <Card className="bg-smoke/70 border-blood/40">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-blood/20 flex items-center justify-center">
                      <AlertCircle size={24} className="text-blood" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-bone mb-2">
                      Something went wrong
                    </h2>
                    <p className="text-sm text-bone/60">
                      We encountered an error. Try refreshing or go back home.
                    </p>
                  </div>
                  {process.env.NODE_ENV === "development" && this.state.error && (
                    <div className="text-left bg-blood/10 border border-blood/20 rounded p-3">
                      <p className="text-[10px] text-blood/80 font-mono break-words">
                        {this.state.error.message}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-ember hover:bg-ember/90 text-ink font-semibold transition-colors text-sm"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                    <Link href="/" className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-ash hover:bg-ash/80 text-bone font-semibold transition-colors text-sm">
                        <Home size={16} />
                        Home
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
