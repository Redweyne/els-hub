"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Home, RefreshCw, AlertTriangle } from "lucide-react"

import { ELSEmblemV2 } from "@/components/heraldry"
import { Eyebrow, DisplayHeading } from "@/components/typography"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    console.error("App error boundary:", error)
  }, [error])

  const isDev = process.env.NODE_ENV === "development"

  return (
    <main
      id="main"
      className="relative min-h-[100svh] surface-1 film-grain-drift overflow-hidden flex items-center justify-center px-5 py-10"
    >
      <div
        className="aurora-orb-blood pointer-events-none"
        style={{ top: "10%", left: "50%", transform: "translateX(-50%)", opacity: 0.45 }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm text-center">
        <motion.div
          initial={
            reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }
          }
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="inline-block mb-6 grayscale-[20%]"
        >
          <ELSEmblemV2
            size={120}
            starCount={3}
            idScope="error-page"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-3"
        >
          <AlertTriangle size={14} className="text-blood" aria-hidden="true" />
          <Eyebrow tone="blood" size="sm">
            Disturbance
          </Eyebrow>
        </motion.div>

        <DisplayHeading level={1} as="h1" className="text-3xl">
          Something broke in the archive
        </DisplayHeading>
        <p className="mt-3 text-bone/55 text-sm font-body leading-relaxed">
          An unexpected force interrupted the request. The cause has been
          logged. Try again or return home.
        </p>

        {isDev && error?.message && (
          <pre className="mt-5 text-left bg-blood/8 border border-blood/30 rounded-lg p-3 text-[11px] text-blood/90 overflow-x-auto font-mono">
            {error.message}
            {error.digest && (
              <span className="block text-bone/40 mt-1">
                digest: {error.digest}
              </span>
            )}
          </pre>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-blood-dark via-blood to-blood-light text-bone font-semibold text-sm uppercase tracking-[0.2em] shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--blood)_60%,transparent)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-3 rounded-full border border-ash bg-smoke/40 text-bone/80 hover:text-bone hover:border-ember/40 font-body text-xs uppercase tracking-[0.22em] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            <Home size={12} aria-hidden="true" />
            Return Home
          </Link>
        </div>
      </div>
    </main>
  )
}
