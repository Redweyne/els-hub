"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import {
  TrophySVG,
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
} from "@/components/heraldry"
import type { MedalTier } from "@/components/heraldry"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { Shimmer } from "@/components/motion/Shimmer"
import { cn } from "@/lib/cn"

export interface HonorEntry {
  eventId: string
  eventCode: "fcu" | "goa" | "sgoa" | "gw-sl" | "gw-fh" | string
  title: string
  placement: number | null
  metric?: string
  date: string
}

export interface HonorWallPreviewProps {
  honors: HonorEntry[]
  isLoading?: boolean
  viewAllHref?: string
  className?: string
}

const EASE = [0.2, 0.8, 0.2, 1] as const

export function HonorWallPreview({
  honors,
  isLoading,
  viewAllHref = "/honor",
  className,
}: HonorWallPreviewProps) {
  const reducedMotion = useReducedMotion()

  return (
    <section className={cn("space-y-4", className)}>
      <header className="flex items-end justify-between gap-3 px-5 md:px-8">
        <div>
          <Eyebrow tone="ember" size="sm">Honor Wall</Eyebrow>
          <DisplayHeading level={3} className="mt-1">
            Trophies Earned
          </DisplayHeading>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs text-bone/60 hover:text-ember transition-colors uppercase tracking-[0.2em] font-body active:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember rounded px-1 py-0.5"
        >
          View all
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </header>

      <div className="relative">
        <div
          className={cn(
            "flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-2",
            "px-5 md:px-8 scrollbar-thin",
            "[-webkit-overflow-scrolling:touch]",
          )}
          style={{ scrollPaddingLeft: "1.25rem" }}
        >
          {isLoading
            ? [0, 1, 2].map((i) => (
                <Shimmer
                  key={i}
                  delay={i * 120}
                  className="flex-shrink-0 w-[44vw] md:w-56 h-48 md:h-56 rounded-xl snap-start"
                />
              ))
            : honors.length === 0
              ? (
                <div className="w-full flex items-center justify-center py-8">
                  <Eyebrow tone="muted">No honors yet</Eyebrow>
                </div>
              )
              : honors.map((honor, i) => (
                  <HonorCard
                    key={honor.eventId}
                    honor={honor}
                    delay={i * 0.08}
                    reducedMotion={!!reducedMotion}
                  />
                ))}
        </div>
      </div>
    </section>
  )
}

function HonorCard({
  honor,
  delay,
  reducedMotion,
}: {
  honor: HonorEntry
  delay: number
  reducedMotion: boolean
}) {
  const trophyTier: MedalTier | "slate" =
    honor.placement === 1
      ? "gold"
      : honor.placement === 2
        ? "silver"
        : honor.placement === 3
          ? "bronze"
          : "slate"

  const glyphMap = {
    fcu: FactionCallUpGlyph,
    goa: GloryOfOakvaleGlyph,
    sgoa: GloryOfOakvaleGlyph,
    "gw-sl": GovernorsWarGlyph,
    "gw-fh": GovernorsWarGlyph,
  } as const
  const Glyph =
    (glyphMap as Record<string, typeof FactionCallUpGlyph | undefined>)[
      honor.eventCode
    ] ?? FactionCallUpGlyph

  const placementLabel =
    honor.placement === 1
      ? "1st"
      : honor.placement === 2
        ? "2nd"
        : honor.placement === 3
          ? "3rd"
          : honor.placement
            ? `${honor.placement}th`
            : "—"

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="flex-shrink-0 w-[44vw] md:w-56 snap-start"
    >
      <Link
        href={`/events/${honor.eventId}`}
        className={cn(
          "block h-full surface-3 rounded-xl border border-ash overflow-hidden",
          "transition-all duration-300 active:scale-[0.98]",
          "hover:border-ember/40 hover:shadow-[0_0_24px_-12px_color-mix(in_oklab,var(--ember)_60%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        )}
      >
        <div className="relative flex items-center justify-center py-3 md:py-4 bg-gradient-to-b from-ember/5 to-transparent">
          <Glyph size={28} className="absolute top-2 right-2 opacity-25" />
          <TrophySVG
            tier={trophyTier}
            size={72}
            idScope={`honor-${honor.eventId}`}
            className="md:w-24 md:h-[106px]"
          />
        </div>
        <div className="px-3 md:px-4 pb-3 md:pb-4 pt-2">
          <p
            className="text-[13px] md:text-sm text-bone font-semibold leading-tight line-clamp-2"
            title={honor.title}
          >
            {honor.title}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[10px] md:text-xs font-mono font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em]",
                trophyTier === "gold"
                  ? "bg-ember/20 text-ember"
                  : trophyTier === "silver"
                    ? "bg-bone/15 text-bone"
                    : trophyTier === "bronze"
                      ? "bg-[#8c5a2c]/20 text-[#d89a6c]"
                      : "bg-ash text-bone/60",
              )}
            >
              {placementLabel}
            </span>
            {honor.metric ? (
              <Numeric
                value={parseFloat(honor.metric) || 0}
                format="compact"
                className="text-bone/60 text-[11px] md:text-xs"
              />
            ) : (
              <span className="text-[10px] text-bone/40 font-body">
                {honor.date}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
