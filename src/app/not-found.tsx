"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, Home } from "lucide-react"

import { ELSEmblemV2 } from "@/components/heraldry"
import { Eyebrow, DisplayHeading } from "@/components/typography"
import { ParticleField } from "@/components/motion/ParticleField"

const EASE = [0.2, 0.8, 0.2, 1] as const

export default function NotFound() {
  const reducedMotion = useReducedMotion()

  return (
    <main
      id="main"
      className="relative min-h-[100svh] surface-1 film-grain-drift overflow-hidden flex items-center justify-center px-5 py-10"
    >
      <div
        className="aurora-orb-blood pointer-events-none"
        style={{ top: "-20%", left: "-15%", opacity: 0.6 }}
        aria-hidden="true"
      />
      <div
        className="aurora-orb-ember pointer-events-none"
        style={{ bottom: "-25%", right: "-10%", opacity: 0.5 }}
        aria-hidden="true"
      />

      {!reducedMotion && (
        <ParticleField
          count={16}
          direction="up"
          speed={10}
          size={1.2}
          maxOpacity={0.3}
        />
      )}

      <div className="relative z-10 w-full max-w-sm text-center">
        <motion.div
          initial={
            reducedMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.6, rotate: -8 }
          }
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.8,
            ease: EASE,
          }}
          className="relative inline-block mb-7"
        >
          <ELSEmblemV2
            size={140}
            starCount={5}
            idScope="not-found"
            className="opacity-60"
          />
          <motion.svg
            initial={
              reducedMotion
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            animate={{ pathLength: 1, opacity: 0.85 }}
            transition={{
              duration: reducedMotion ? 0 : 1.4,
              delay: reducedMotion ? 0 : 0.4,
              ease: EASE,
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="crack-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--blood-light)" />
                <stop offset="100%" stopColor="var(--blood-dark)" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 30 40 L 80 95 L 70 110 L 105 130 L 95 145 L 165 175"
              fill="none"
              stroke="url(#crack-grad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={
                reducedMotion ? { pathLength: 1 } : { pathLength: 0 }
              }
              animate={{ pathLength: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 1.2,
                delay: reducedMotion ? 0 : 0.5,
                ease: EASE,
              }}
            />
            <motion.path
              d="M 80 95 L 60 100 M 105 130 L 88 122 M 95 145 L 110 158"
              fill="none"
              stroke="url(#crack-grad)"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.7"
              initial={
                reducedMotion ? { pathLength: 1 } : { pathLength: 0 }
              }
              animate={{ pathLength: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 0.8,
                delay: reducedMotion ? 0 : 1.2,
                ease: EASE,
              }}
            />
          </motion.svg>
        </motion.div>

        <Eyebrow tone="blood" size="sm">
          Error · 404
        </Eyebrow>
        <DisplayHeading level={1} as="h1" className="mt-2 text-3xl">
          This Door Is Sealed
        </DisplayHeading>
        <p className="mt-3 text-bone/55 text-sm font-body leading-relaxed">
          The page you sought has been moved, redacted, or never existed.
          The faction watches every door — this one is closed.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-blood-dark via-blood to-blood-light text-bone font-semibold text-sm uppercase tracking-[0.2em] shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--blood)_60%,transparent)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <Home size={14} aria-hidden="true" />
            Return Home
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 py-3 rounded-full border border-ash bg-smoke/40 text-bone/80 hover:text-bone hover:border-ember/40 font-body text-xs uppercase tracking-[0.22em] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Go Back
          </button>
        </div>
      </div>
    </main>
  )
}
