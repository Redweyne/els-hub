"use client"

import { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/cn"

export interface SectionProps {
  children: ReactNode
  delay?: number
  duration?: number
  /** Entry direction (default "up") */
  from?: "up" | "down" | "left" | "right" | "fade"
  /** Distance to travel in px. Default 20. */
  distance?: number
  /** Fraction of element that must be visible to trigger (default 0.2). */
  amount?: number
  /** Element tag. Default "div". */
  as?: "div" | "section" | "article" | "aside" | "header" | "footer"
  className?: string
  /**
   * Skip the on-view trigger and animate immediately on mount.
   * Useful for first-paint hero sections.
   */
  immediate?: boolean
}

/**
 * Reveal-on-scroll wrapper.
 * Element starts offset+invisible, animates to final position when scrolled
 * into view. Honors prefers-reduced-motion (instant appearance).
 */
export function Section({
  children,
  delay = 0,
  duration = 0.6,
  from = "up",
  distance = 20,
  amount = 0.2,
  as = "div",
  className,
  immediate = false,
}: SectionProps) {
  const reducedMotion = useReducedMotion()

  const initial = reducedMotion
    ? { opacity: 1 }
    : from === "fade"
      ? { opacity: 0 }
      : {
          opacity: 0,
          x: from === "left" ? -distance : from === "right" ? distance : 0,
          y: from === "up" ? distance : from === "down" ? -distance : 0,
        }

  const animate = { opacity: 1, x: 0, y: 0 }

  const MotionTag = motion[as]

  const viewportProps = immediate
    ? undefined
    : { once: true, amount }

  return (
    <MotionTag
      initial={initial}
      {...(immediate
        ? { animate }
        : { whileInView: animate, viewport: viewportProps })}
      transition={{
        duration: reducedMotion ? 0 : duration,
        delay: reducedMotion ? 0 : delay,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  )
}

export interface StaggerProps {
  children: ReactNode
  delay?: number
  staggerDelay?: number
  className?: string
  as?: "div" | "ul" | "ol" | "section"
}

/**
 * Container that staggers children reveal. Each direct child should be a
 * `<StaggerItem>` or motion element with the appropriate variants.
 */
export function Stagger({
  children,
  delay = 0,
  staggerDelay = 0.06,
  className,
  as = "div",
}: StaggerProps) {
  const reducedMotion = useReducedMotion()
  const MotionTag = motion[as]

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reducedMotion ? 0 : delay,
            staggerChildren: reducedMotion ? 0 : staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

export interface StaggerItemProps {
  children: ReactNode
  distance?: number
  className?: string
  as?: "div" | "li" | "article"
}

export function StaggerItem({
  children,
  distance = 16,
  className,
  as = "div",
}: StaggerItemProps) {
  const MotionTag = motion[as]

  return (
    <MotionTag
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
        },
      }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}
