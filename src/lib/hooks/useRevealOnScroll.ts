"use client"

import { useInView } from "framer-motion"
import { useRef, RefObject } from "react"

export interface UseRevealOnScrollOptions {
  /** Fraction of the element that must be visible to trigger (0-1). Default 0.25 */
  amount?: number
  /** Only fire once (default true). */
  once?: boolean
  /** Optional root margin (e.g. "-80px 0px -80px 0px") */
  margin?: string
}

/**
 * IntersectionObserver-backed reveal hook.
 * Returns [ref, isInView] — attach the ref to any element.
 * Thin wrapper around framer-motion's useInView to keep import surface consistent.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>({
  amount = 0.25,
  once = true,
}: UseRevealOnScrollOptions = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { amount, once })
  return [ref, inView]
}
