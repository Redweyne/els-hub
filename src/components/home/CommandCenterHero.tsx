"use client"

import { ReactNode, useRef } from "react"
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion"
import { ELSEmblemV2, RankStarsRow } from "@/components/heraldry"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { ParticleField } from "@/components/motion/ParticleField"
import { Shimmer } from "@/components/motion/Shimmer"
import { cn } from "@/lib/cn"

export interface CommandCenterHeroProps {
  memberCount: number
  totalInfluence: number
  factionPlacement?: string
  server?: number
  factionClass?: string
  isLoading?: boolean
}

const EASE = [0.2, 0.8, 0.2, 1] as const

export function CommandCenterHero({
  memberCount,
  totalInfluence,
  factionPlacement,
  server = 78,
  factionClass = "S",
  isLoading = false,
}: CommandCenterHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const emblemY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"])
  const emblemScale = useTransform(scrollYProgress, [0, 1], [1, 0.7])
  const emblemOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.25])

  const emblemStyle = reducedMotion
    ? undefined
    : { y: emblemY, scale: emblemScale, opacity: emblemOpacity }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[88svh] md:min-h-[85vh] flex items-center overflow-hidden surface-2 film-grain-drift"
      aria-labelledby="hero-title"
    >
      <div
        className="aurora-orb-ember pointer-events-none"
        style={{ top: "10%", left: "-8%", opacity: 0.9 }}
      />
      <div
        className="aurora-orb-blood pointer-events-none"
        style={{ bottom: "-20%", right: "-5%", opacity: 0.85 }}
      />

      {!reducedMotion && (
        <ParticleField
          count={32}
          direction="up"
          speed={16}
          size={1.4}
          maxOpacity={0.45}
        />
      )}

      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-5 md:px-8 pt-20 pb-10 md:pt-24 md:pb-20">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
          <motion.div
            className="flex-shrink-0 flex justify-center md:order-2 md:flex-1"
            style={emblemStyle}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <ELSEmblemV2
              size={240}
              glow
              starCount={5}
              idScope="hero"
              className="w-[56vw] max-w-[240px] h-auto md:w-[300px] md:max-w-none md:h-[300px] lg:w-[340px] lg:h-[340px]"
            />
          </motion.div>

          <div className="flex-1 md:order-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            >
              <Eyebrow tone="ember" size="sm">
                {factionPlacement
                  ? `${factionPlacement} · Server ${server}`
                  : `Server ${server}`}
              </Eyebrow>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            >
              <DisplayHeading
                level={1}
                className="mt-3 text-[2.25rem] leading-[1] md:text-6xl lg:text-7xl"
                as="h1"
              >
                <span id="hero-title">ELYSIUM</span>
              </DisplayHeading>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-center md:justify-start gap-3 mt-5"
            >
              <RankStarsRow count={5} filled={5} size={15} />
              <Eyebrow tone="bone" size="xs">
                Class {factionClass}
              </Eyebrow>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="mt-4 text-bone/55 text-[13px] md:text-base max-w-md mx-auto md:mx-0 leading-relaxed font-body hidden md:block"
            >
              A faction built on presence, pressure, and pedigree.
              Every move is tracked. Every rank is earned.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="mt-6 md:mt-8 grid grid-cols-3 gap-2 md:gap-3 md:max-w-lg"
            >
              <StatCard
                label="Members"
                isLoading={isLoading}
                value={
                  <Numeric
                    value={memberCount}
                    format="raw"
                    className="text-ember"
                  />
                }
              />
              <StatCard
                label="Influence"
                isLoading={isLoading}
                value={
                  <Numeric
                    value={totalInfluence}
                    format="compact"
                    precision={1}
                    className="text-ember"
                  />
                }
              />
              <StatCard
                label="Standing"
                isLoading={isLoading}
                valueClass="text-ember"
                value={factionPlacement ?? "—"}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {!reducedMotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
          aria-hidden="true"
        >
          <span className="text-[9px] uppercase tracking-[0.35em] text-bone/40 font-body">
            Scroll
          </span>
          <motion.div
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-[1px] h-10 bg-gradient-to-b from-ember/70 to-transparent origin-top"
          />
        </motion.div>
      )}
    </section>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  valueClass?: string
  isLoading?: boolean
}

function StatCard({ label, value, valueClass, isLoading }: StatCardProps) {
  return (
    <div className="surface-3 rounded-xl p-2.5 md:p-4 border border-ash min-w-0">
      <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-bone/50 font-body truncate">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 md:mt-1.5 text-[15px] md:text-2xl font-bold font-mono tabular-nums leading-none",
          valueClass ?? "text-bone",
        )}
      >
        {isLoading ? <Shimmer className="h-5 w-14 mt-0.5" /> : value}
      </div>
    </div>
  )
}
