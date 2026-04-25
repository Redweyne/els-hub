"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { IntroEmblem } from "./IntroEmblem"

interface IntroSequenceProps {
  onComplete: () => void
}

const TOTAL_DURATION_MS = 4500
const SKIP_AVAILABLE_AFTER_MS = 800
const REDUCED_MOTION_DURATION_MS = 600

const EASE = [0.2, 0.8, 0.2, 1] as const
const ELYSIUM = "ELYSIUM".split("")

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const reducedMotion = useReducedMotion()
  const [isSkipped, setIsSkipped] = useState(false)
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    const skipTimer = setTimeout(
      () => setCanSkip(true),
      SKIP_AVAILABLE_AFTER_MS,
    )
    return () => clearTimeout(skipTimer)
  }, [])

  useEffect(() => {
    if (isSkipped) {
      onComplete()
      return
    }
    const duration = reducedMotion
      ? REDUCED_MOTION_DURATION_MS
      : TOTAL_DURATION_MS
    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [isSkipped, onComplete, reducedMotion])

  const handleSkip = () => {
    if (canSkip) setIsSkipped(true)
  }

  return (
    <AnimatePresence>
      {!isSkipped && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-0 z-[100] bg-ink flex items-center justify-center overflow-hidden film-grain-drift"
          aria-label="ELYSIUM intro"
          role="dialog"
          aria-modal="true"
        >
          {!reducedMotion && (
            <>
              <motion.div
                className="aurora-orb-ember"
                style={{ top: "30%", left: "30%", transform: "translate(-50%, -50%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 1.4, ease: EASE }}
              />
              <motion.div
                className="aurora-orb-blood"
                style={{ top: "70%", left: "70%", transform: "translate(-50%, -50%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 1.1, delay: 1.6, ease: EASE }}
              />
            </>
          )}

          {!reducedMotion && <ConvergingParticles />}

          {!reducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 2.5, 3.5] }}
              transition={{
                duration: 1.2,
                delay: 2.9,
                times: [0, 0.4, 1],
                ease: "easeOut",
              }}
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--blood) 35%, transparent) 0%, transparent 60%)",
              }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center">
            <IntroEmblem size={200} reducedMotion={!!reducedMotion} />

            <motion.div
              className="mt-6 flex items-baseline"
              style={{ gap: "0.28em" }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: reducedMotion ? 0 : 0.06,
                    delayChildren: reducedMotion ? 0 : 1.8,
                  },
                },
              }}
            >
              {ELYSIUM.map((letter, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: reducedMotion ? 0 : 0.5,
                        ease: EASE,
                      },
                    },
                  }}
                  className="font-display text-bone text-4xl md:text-5xl font-semibold"
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.5,
                delay: reducedMotion ? 0 : 2.4,
                ease: EASE,
              }}
              className="mt-4 text-[11px] uppercase tracking-[0.35em] text-ember/80 font-body"
            >
              Class S · Server 78
            </motion.p>
          </div>

          <motion.button
            onClick={handleSkip}
            disabled={!canSkip}
            initial={{ opacity: 0 }}
            animate={{ opacity: canSkip ? 0.6 : 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-bone uppercase tracking-[0.3em] cursor-pointer px-4 py-2 rounded border border-ash hover:border-ember/50 transition-colors disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            aria-label="Skip intro"
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ConvergingParticles() {
  const particles = [
    { from: { x: "-40vw", y: "-40vh" }, delay: 1.5 },
    { from: { x: "40vw", y: "-40vh" }, delay: 1.55 },
    { from: { x: "40vw", y: "40vh" }, delay: 1.6 },
    { from: { x: "-40vw", y: "40vh" }, delay: 1.65 },
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-ember shadow-[0_0_12px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
          initial={{ x: p.from.x, y: p.from.y, opacity: 0, scale: 0.5 }}
          animate={{
            x: "0vw",
            y: "0vh",
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.2],
          }}
          transition={{
            duration: 1.0,
            delay: p.delay,
            times: [0, 0.15, 0.8, 1],
            ease: [0.35, 0, 0.65, 1],
          }}
        />
      ))}
    </div>
  )
}
