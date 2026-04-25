"use client"

import { motion } from "framer-motion"
import { StarPrimitive } from "@/components/heraldry/StarPrimitive"

const EASE_CINEMA = [0.2, 0.8, 0.2, 1] as const
const STAR_ANGLES = [228, 250, 270, 290, 312]

interface IntroEmblemProps {
  size?: number
  reducedMotion?: boolean
}

/**
 * Animated, act-orchestrated version of the ELSEmblem used in IntroSequence v2.
 * Draws itself on over ~1.4s, then breathes during Act III.
 * When `reducedMotion` is true, snaps to final state immediately.
 */
export function IntroEmblem({ size = 180, reducedMotion = false }: IntroEmblemProps) {
  const start = (base: number, delay: number) =>
    reducedMotion ? 0 : base + delay

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="text-ember drop-shadow-[0_0_18px_color-mix(in_oklab,var(--ember)_55%,transparent)]"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ELYSIUM Emblem"
      animate={
        reducedMotion
          ? { scale: 1 }
          : {
              scale: [1, 1.02, 1],
            }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              scale: {
                duration: 3.2,
                times: [0, 0.5, 1],
                ease: "easeInOut",
                repeat: Infinity,
                delay: 2.8,
              },
            }
      }
    >
      <defs>
        <linearGradient id="intro-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ember-light)" stopOpacity="0.6" />
          <stop offset="55%" stopColor="var(--ember)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--ember-dark)" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="intro-field" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ink-100)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
        </radialGradient>
        <filter id="intro-glyph-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.circle
        cx={100}
        cy={100}
        r={92}
        fill="url(#intro-field)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: start(0, 0.2), ease: EASE_CINEMA }}
      />

      <motion.circle
        cx={100}
        cy={100}
        r={95}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: reducedMotion ? 0 : 0.9,
          delay: start(0, 0.4),
          ease: EASE_CINEMA,
        }}
      />
      <motion.circle
        cx={100}
        cy={100}
        r={88}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        transition={{
          duration: reducedMotion ? 0 : 0.7,
          delay: start(0, 0.6),
          ease: EASE_CINEMA,
        }}
      />

      <g>
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2
          const inner = 92
          const outer = 95
          const x1 = 100 + Math.cos(angle) * inner
          const y1 = 100 + Math.sin(angle) * inner
          const x2 = 100 + Math.cos(angle) * outer
          const y2 = 100 + Math.sin(angle) * outer
          const major = i % 5 === 0
          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={major ? 0.6 : 0.3}
              initial={{ opacity: 0 }}
              animate={{ opacity: major ? 0.7 : 0.22 }}
              transition={{
                duration: reducedMotion ? 0 : 0.18,
                delay: start(0, 0.8 + (i / 60) * 0.25),
              }}
            />
          )
        })}
      </g>

      {STAR_ANGLES.map((angleDeg, i) => {
        const rad = (angleDeg * Math.PI) / 180
        const r = 76
        const cx = 100 + Math.cos(rad) * r
        const cy = 100 + Math.sin(rad) * r
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              delay: start(0, 0.95 + i * 0.08),
              ease: EASE_CINEMA,
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <StarPrimitive cx={cx} cy={cy} r={5} />
          </motion.g>
        )
      })}

      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: reducedMotion ? 0 : 0.55,
          delay: start(0, 1.05),
          ease: EASE_CINEMA,
        }}
        style={{ transformOrigin: "100px 102px" }}
      >
        <circle
          cx={100}
          cy={102}
          r={34}
          fill="var(--ink)"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.9"
        />
        <circle
          cx={100}
          cy={102}
          r={30}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          opacity="0.5"
        />
      </motion.g>

      <motion.g
        transform="translate(100, 104)"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.5,
          delay: start(0, 1.15),
          ease: EASE_CINEMA,
        }}
      >
        <rect
          x="-14"
          y="-6"
          width="28"
          height="22"
          fill="url(#intro-tower)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="-14"
          y="-14"
          width="7"
          height="8"
          fill="url(#intro-tower)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="-3"
          y="-14"
          width="6"
          height="8"
          fill="url(#intro-tower)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="7"
          y="-14"
          width="7"
          height="8"
          fill="url(#intro-tower)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="-14"
          x2="0"
          y2="-23"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path d="M0 -23 L7 -21 L0 -19 Z" fill="currentColor" />
        <path
          d="M-4 16 L-4 10 A4 4 0 0 1 4 10 L4 16 Z"
          fill="var(--ink)"
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <rect x="-1" y="-1" width="2" height="6" fill="var(--ink)" />
      </motion.g>

      <motion.g
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity={0.6}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{
          duration: reducedMotion ? 0 : 0.4,
          delay: start(0, 1.25),
        }}
      >
        {[
          { x: 30, y: 30 },
          { x: 170, y: 30 },
          { x: 170, y: 170 },
          { x: 30, y: 170 },
        ].map((pos, i) => (
          <g key={i} transform={`translate(${pos.x},${pos.y})`}>
            <path d="M -4 -4 L 0 -8 L 4 -4 L 0 0 Z" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none" />
          </g>
        ))}
      </motion.g>

      <motion.text
        x="100"
        y="165"
        textAnchor="middle"
        fontSize="16"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="4"
        filter="url(#intro-glyph-glow)"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.5,
          delay: start(0, 1.3),
          ease: EASE_CINEMA,
        }}
      >
        ELS
      </motion.text>

      <motion.text
        x="100"
        y="180"
        textAnchor="middle"
        fontSize="6"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
        fill="currentColor"
        letterSpacing="3"
        opacity="0.7"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{
          duration: reducedMotion ? 0 : 0.4,
          delay: start(0, 1.4),
        }}
      >
        ELYSIUM
      </motion.text>
    </motion.svg>
  )
}
