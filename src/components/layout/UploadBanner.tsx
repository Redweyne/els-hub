"use client"

/**
 * Global in-flight upload banner.
 *
 * Shows a slim, dismissible bar at the very top of the viewport whenever an
 * OCR upload is mid-flight, derived from a localStorage entry written by the
 * upload form. Polls `/api/tracking/status/[eventId]` every ~4 s and renders
 * a progress bar. Once the event flips to `published`, switches to a "View
 * results" CTA. Officer can dismiss; the banner re-appears on a later upload.
 *
 * Why this exists: without it, an officer who navigates away during upload
 * has no idea whether the OCR is still running, stalled, or finished. The
 * server-side OCR continues regardless of client connection — the banner is
 * just a window into that DB-derived progress.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, X, AlertCircle } from "lucide-react"
import { apiPath, appPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

const LS_KEY = "els.upload.in_flight.v1"
const POLL_MS = 4000

export interface InFlightUpload {
  eventId: string
  title: string
  totalFiles: number
  startedAt: number
  type: string
}

interface StatusResponse {
  eventId: string
  title: string
  status: string
  eventTypeCode: string
  screenshotsTotal: number
  screenshotsDone: number
  screenshotsFailed: number
  scoresWritten: number
  reviewQueuePending: number
  createdAt: string
  updatedAt: string
}

export function readInFlightUpload(): InFlightUpload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InFlightUpload
    if (!parsed?.eventId) return null
    // Auto-expire entries older than 30 minutes; OCR should never run that
    // long; if it has, the entry is almost certainly stale.
    if (Date.now() - parsed.startedAt > 30 * 60 * 1000) {
      window.localStorage.removeItem(LS_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeInFlightUpload(entry: InFlightUpload) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_KEY, JSON.stringify(entry))
  window.dispatchEvent(new Event("els:upload:changed"))
}

export function clearInFlightUpload() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LS_KEY)
  window.dispatchEvent(new Event("els:upload:changed"))
}

export function UploadBanner() {
  const [entry, setEntry] = useState<InFlightUpload | null>(null)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  // Hydrate from localStorage + react to writes from the upload form.
  useEffect(() => {
    const sync = () => setEntry(readInFlightUpload())
    sync()
    window.addEventListener("els:upload:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("els:upload:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  // Poll the status endpoint while an entry exists.
  const poll = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(apiPath(`/tracking/status/${eventId}`), {
        cache: "no-store",
      })
      if (!res.ok) {
        setPollError("Status check failed")
        return
      }
      const data = (await res.json()) as StatusResponse
      setStatus(data)
      setPollError(null)
    } catch {
      setPollError("Network error")
    }
  }, [])

  useEffect(() => {
    if (!entry) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    poll(entry.eventId)
    intervalRef.current = window.setInterval(() => poll(entry.eventId), POLL_MS)
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [entry, poll])

  // Hide the banner if the user dismissed THIS event.
  if (!entry) return null
  if (dismissedFor === entry.eventId) return null

  const currentStatus = status?.eventId === entry.eventId ? status : null
  const total = currentStatus?.screenshotsTotal ?? entry.totalFiles
  const done = currentStatus?.screenshotsDone ?? 0
  const failed = currentStatus?.screenshotsFailed ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const isPublished = currentStatus?.status === "published"
  const reviewPending = currentStatus?.reviewQueuePending ?? 0

  const dismiss = () => {
    setDismissedFor(entry.eventId)
    if (isPublished) {
      // Once published, a dismiss is permanent — clear the LS entry too.
      clearInFlightUpload()
    }
  }

  const targetHref = isPublished
    ? reviewPending > 0
      ? appPath(`/tracking/review?event_id=${entry.eventId}`)
      : appPath(`/events/${entry.eventId}`)
    : appPath(`/events/${entry.eventId}`)

  return (
    <AnimatePresence>
      <motion.div
        key="upload-banner"
        initial={{ y: -32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -32, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed left-0 right-0 z-[60] pointer-events-none"
        style={{ top: "env(safe-area-inset-top)" }}
        role="status"
        aria-live="polite"
      >
        <div className="px-3 pt-2 pointer-events-auto">
          <div
            className={cn(
              "max-w-3xl mx-auto rounded-xl border backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] overflow-hidden",
              isPublished
                ? "bg-ember/10 border-ember/40"
                : pollError
                  ? "bg-blood/10 border-blood/40"
                  : "bg-smoke/85 border-ash",
            )}
          >
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex-shrink-0">
                {isPublished ? (
                  <CheckCircle2 size={18} className="text-ember" aria-hidden="true" />
                ) : pollError ? (
                  <AlertCircle size={18} className="text-blood-light" aria-hidden="true" />
                ) : (
                  <Loader2 size={18} className="text-ember animate-spin" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body truncate">
                    {isPublished
                      ? "Upload complete"
                      : pollError
                        ? "Connection issue"
                        : "Uploading"}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-bone/60 ml-auto flex-shrink-0">
                    {done}/{total}
                    {failed > 0 ? ` · ${failed} failed` : ""}
                  </p>
                </div>
                <p className="text-[13px] text-bone font-semibold truncate mt-0.5">
                  {currentStatus?.title ?? entry.title}
                </p>

                {!isPublished && (
                  <div className="mt-1.5 h-[3px] w-full rounded-full bg-ash/40 overflow-hidden">
                    <motion.div
                      className="h-full bg-ember"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                )}

                {isPublished && (
                  <p className="text-[11px] text-bone/65 mt-0.5">
                    {reviewPending > 0
                      ? `${reviewPending} need review · tap to resolve`
                      : `${currentStatus?.scoresWritten ?? 0} scores written · tap to view`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={targetHref}
                  className={cn(
                    "min-h-[36px] px-3 inline-flex items-center justify-center rounded-md text-[11px] font-bold uppercase tracking-[0.14em]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                    isPublished
                      ? "bg-ember text-ink"
                      : "border border-ash text-bone/75 hover:text-bone",
                  )}
                  onClick={() => {
                    if (isPublished) clearInFlightUpload()
                  }}
                >
                  {isPublished ? (reviewPending > 0 ? "Review" : "View") : "Open"}
                </Link>
                <button
                  type="button"
                  onClick={dismiss}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md text-bone/55 hover:text-bone hover:bg-ash/30"
                  aria-label="Dismiss"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
