"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { BookOpen, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Eyebrow } from "@/components/typography"
import { apiPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

export interface EventRecapProps {
  eventId: string
  /** True when the viewer is an officer or owner — shows the regenerate button. */
  isOfficer: boolean
  /** Pre-cached markdown (when present we skip the fetch on mount). */
  initialRecapMd?: string | null
  /** Pre-cached generation timestamp. */
  initialGeneratedAt?: string | null
  className?: string
}

interface RecapPayload {
  recap_md: string | null
  generated_at: string | null
}

/**
 * AI-written event recap.
 *
 * Reads:  GET /api/recap/[eventId]   (public)
 * Writes: POST /api/recap/[eventId]  (officer-only)
 *
 * Mobile-first: wide-enough type for prose reading, generous line-height,
 * collapses to a "Generate recap" CTA card when none exists yet (officer-only;
 * public viewers just see nothing in that case).
 */
export function EventRecap({
  eventId,
  isOfficer,
  initialRecapMd,
  initialGeneratedAt,
  className,
}: EventRecapProps) {
  const reducedMotion = useReducedMotion()
  const [recap, setRecap] = useState<RecapPayload>({
    recap_md: initialRecapMd ?? null,
    generated_at: initialGeneratedAt ?? null,
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [didFetch, setDidFetch] = useState(!!initialRecapMd)

  // If we weren't seeded with a cached recap, lazy-fetch one shot. After that
  // the recap only changes via explicit regenerate.
  useEffect(() => {
    if (didFetch) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(apiPath(`/recap/${eventId}`))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as RecapPayload
        if (!cancelled) {
          setRecap(json)
          setDidFetch(true)
        }
      } catch {
        if (!cancelled) setDidFetch(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId, didFetch])

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(apiPath(`/recap/${eventId}`), { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to generate")
      setRecap(json as RecapPayload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setGenerating(false)
    }
  }

  // No recap and the viewer is the public — render nothing (no dead pixels).
  if (!recap.recap_md && !isOfficer && didFetch) {
    return null
  }

  return (
    <motion.section
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-ember/30 surface-3",
        "px-4 py-4 md:px-5 md:py-5",
        className,
      )}
      aria-label="Event recap"
    >
      {/* subtle ember glow corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-ember/12 blur-2xl"
      />

      <div className="relative flex items-center justify-between gap-2 mb-2">
        <Eyebrow tone="ember" size="xs">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={11} aria-hidden="true" />
            Game Story
          </span>
        </Eyebrow>
        {isOfficer && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            aria-label={recap.recap_md ? "Regenerate recap" : "Generate recap"}
            className={cn(
              "inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-[10px] uppercase tracking-[0.16em] font-mono font-bold",
              "transition-all duration-150 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
              generating
                ? "bg-smoke/60 border-ash text-bone/55"
                : "bg-ember/10 border-ember/40 text-ember hover:bg-ember/20",
            )}
          >
            {generating ? (
              <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            ) : recap.recap_md ? (
              <RefreshCw size={11} aria-hidden="true" />
            ) : (
              <Sparkles size={11} aria-hidden="true" />
            )}
            {generating
              ? "Writing…"
              : recap.recap_md
                ? "Regenerate"
                : "Generate recap"}
          </button>
        )}
      </div>

      {error && (
        <p className="relative text-[12px] text-blood-light bg-blood/10 border border-blood/30 rounded px-2 py-1.5 mb-2">
          {error}
        </p>
      )}

      {recap.recap_md ? (
        <RecapBody md={recap.recap_md} />
      ) : isOfficer ? (
        <p className="relative text-[13px] text-bone/60 font-body leading-relaxed">
          No recap yet. Tap <b>Generate</b> to have the chronicler write a
          short, mafia-tone summary of this event — perfect for pasting into
          Discord.
        </p>
      ) : null}

      {recap.generated_at && (
        <p className="relative mt-2.5 text-[10px] uppercase tracking-[0.18em] text-bone/40 font-mono">
          Written {timeAgo(recap.generated_at)}
        </p>
      )}
    </motion.section>
  )
}

/**
 * Render the recap markdown as plain paragraphs. We deliberately don't pull
 * in a markdown library — the prompt forces 2 paragraphs of plain prose, no
 * headers or lists, so paragraph splitting is enough. Any inline asterisks
 * are dropped to avoid stray italic markers leaking through.
 */
function RecapBody({ md }: { md: string }) {
  const cleaned = md.trim().replace(/\*\*/g, "").replace(/__/g, "")
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="relative space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-[14px] md:text-[15px] text-bone/90 font-body leading-relaxed"
        >
          {p}
        </p>
      ))}
    </div>
  )
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return "just now"
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
