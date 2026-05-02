"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useState, useCallback, type ChangeEvent, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Sword,
  Upload,
} from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/typography"
import {
  EVENT_TYPES,
  GW_DAY_SCHEDULE,
  UPLOADABLE_TYPES,
  type EventTypeCode,
  type GWCycle,
  type GWDayType,
  type GWCampaignMeta,
  getGWThreshold,
} from "@/lib/events/config"
import { getActiveGWDay, formatActiveDay } from "@/lib/gw/schedule"
import { apiPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

interface ProgressUpdate {
  type: string
  totalFiles?: number
  fileNumber?: number
  fileName?: string
  rowCount?: number
  eventId?: string
  totalRows?: number
  autoResolved?: number
  reviewQueueCount?: number
  message?: string
}

interface ExistingEvent {
  id: string
  title: string
  created_at: string
  event_type_code: string
}

interface ActiveCampaign {
  id: string
  title: string
  meta_json: GWCampaignMeta
}

const TYPE_PLACEHOLDERS: Record<EventTypeCode, string> = {
  fcu: "FCU — Week of May 1",
  oak: "Glory of Oakvale — May 4",
  gw_daily: "Auto-filled from active campaign",
  gw_campaign: "—",
}

export default function UploadEventPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-ink pt-20 pb-bottom-nav flex items-center justify-center">
          <motion.div
            className="w-10 h-10 rounded-full border-2 border-ember border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            aria-label="Loading"
          />
        </main>
      }
    >
      <UploadEventInner />
    </Suspense>
  )
}

function UploadEventInner() {
  const router = useRouter()
  const search = useSearchParams()

  const [eventType, setEventType] = useState<EventTypeCode>(() => {
    const t = search.get("type")
    if (t && UPLOADABLE_TYPES.includes(t as EventTypeCode)) {
      return t as EventTypeCode
    }
    return "fcu"
  })

  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [factionId, setFactionId] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [progress, setProgress] = useState<ProgressUpdate[]>([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [mode, setMode] = useState<"new" | "update">("new")
  const [existingEvents, setExistingEvents] = useState<ExistingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")

  // GW Daily–only state.
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null)
  const [gwOverrideOpen, setGwOverrideOpen] = useState(false)
  const [gwCycle, setGwCycle] = useState<GWCycle>("war")
  const [gwDayType, setGwDayType] = useState<GWDayType>("robbing")
  const [gwSuperCycle, setGwSuperCycle] = useState(1)
  const [gwDayInCycle, setGwDayInCycle] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [gwDeadlineIso, setGwDeadlineIso] = useState<string>("")
  const [now, setNow] = useState(() => new Date())

  // Tick the clock every second so the countdown stays live.
  useEffect(() => {
    if (eventType !== "gw_daily") return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [eventType])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("faction_id, platform_role")
          .eq("auth_user_id", session.user.id)
          .single()
        if (error || !profile) {
          router.push("/")
          return
        }
        if (!["owner", "officer"].includes(profile.platform_role)) {
          router.push("/")
          return
        }
        setFactionId(profile.faction_id)
      } catch {
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  // Existing events for the "update" mode — filtered by current event type.
  useEffect(() => {
    if (!factionId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const codes = legacyCodesFor(eventType)
    supabase
      .from("events")
      .select("id, title, created_at, event_type_code")
      .eq("faction_id", factionId)
      .in("event_type_code", codes)
      .in("status", ["published", "processing"])
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setExistingEvents(data ?? []))
  }, [factionId, eventType])

  // GW Daily — load active campaign and auto-detect today's day-type.
  useEffect(() => {
    if (eventType !== "gw_daily" || !factionId) {
      setActiveCampaign(null)
      return
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase
      .from("events")
      .select("id, title, meta_json")
      .eq("faction_id", factionId)
      .eq("event_type_code", "gw_campaign")
      .eq("status", "processing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.meta_json) {
          setActiveCampaign(null)
          return
        }
        const camp: ActiveCampaign = {
          id: data.id,
          title: data.title,
          meta_json: data.meta_json as GWCampaignMeta,
        }
        setActiveCampaign(camp)
        const active = getActiveGWDay(
          camp.meta_json.start_date_iso,
          camp.meta_json.expected_days,
        )
        setGwCycle(active.cycle)
        setGwDayType(active.dayType)
        setGwSuperCycle(active.superCycle)
        setGwDayInCycle(active.dayInCycle)
        setGwDeadlineIso(active.deadlineIso)
        // Suggest a sensible title.
        if (!eventTitle) {
          setEventTitle(
            `GW · ${active.cycle === "war" ? "War" : "Hegemony"} · Day ${active.dayInCycle} · ${active.config.label}`,
          )
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, factionId])

  const activeDayPreview = useMemo(() => {
    if (!activeCampaign) return null
    const active = getActiveGWDay(
      activeCampaign.meta_json.start_date_iso,
      activeCampaign.meta_json.expected_days,
      now,
    )
    return { active, format: formatActiveDay(active, now) }
  }, [activeCampaign, now])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []))
    setError("")
  }

  const switchType = useCallback((next: EventTypeCode) => {
    setEventType(next)
    setEventTitle("")
    setSelectedEventId("")
    setError("")
    setSuccess("")
    setProgress([])
    setMode("new")
    setGwOverrideOpen(false)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setError("Select at least one screenshot.")
      return
    }
    if (mode === "new" && eventType !== "gw_daily" && !eventTitle.trim()) {
      setError("Enter an event title.")
      return
    }
    if (mode === "new" && eventType === "gw_daily" && !activeCampaign) {
      setError("No active GW campaign. Start one first.")
      return
    }
    if (mode === "update" && !selectedEventId) {
      setError("Select an event to update.")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")
    setProgress([])
    setProcessedCount(0)
    setTotalFiles(0)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("screenshots", file))
      formData.append("event_type", eventType)
      formData.append("faction_id", factionId)

      if (mode === "update") {
        formData.append("event_id", selectedEventId)
      } else {
        formData.append("event_title", eventTitle.trim())
      }

      if (mode === "new" && eventType === "gw_daily" && activeCampaign) {
        formData.append("gw_campaign_id", activeCampaign.id)
        formData.append("gw_cycle", gwCycle)
        formData.append("gw_super_cycle", String(gwSuperCycle))
        formData.append("gw_day_in_cycle", String(gwDayInCycle))
        formData.append("gw_day_type", gwDayType)
        formData.append("gw_min_points", String(getGWThreshold(gwDayType, gwCycle)))
        formData.append("gw_deadline_iso", gwDeadlineIso)
      }

      const response = await fetch(apiPath("/tracking/ocr"), {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""
      let finalData: ProgressUpdate | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const update: ProgressUpdate = JSON.parse(line)
            if (update.type === "start") {
              setTotalFiles(update.totalFiles ?? 0)
            } else if (update.type === "event_created" || update.type === "event_reused") {
              // captured in finalData if no review
            } else if (update.type === "processing") {
              setProgress((prev) => [
                ...prev,
                { type: "processing", fileName: update.fileName, fileNumber: update.fileNumber },
              ])
            } else if (update.type === "extracted") {
              setProgress((prev) => [
                ...prev,
                {
                  type: "extracted",
                  fileName: update.fileName,
                  fileNumber: update.fileNumber,
                  rowCount: update.rowCount,
                },
              ])
              setProcessedCount(update.fileNumber ?? 0)
            } else if (update.type === "complete") {
              finalData = update
            } else if (update.type === "error") {
              throw new Error(update.message ?? "Processing failed")
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && !parseErr.message.startsWith("Processing")) {
              console.error("Failed to parse progress update:", line, parseErr)
            }
          }
        }
      }

      if (finalData) {
        const action = mode === "update" ? "Updated" : "Processed"
        setSuccess(
          `${action}! ${finalData.autoResolved} auto-matched, ${finalData.reviewQueueCount} need review.`,
        )
        setFiles([])
        setEventTitle("")
        setSelectedEventId("")

        if ((finalData.reviewQueueCount ?? 0) > 0) {
          setTimeout(() => {
            router.push(`/tracking/review?event_id=${finalData?.eventId}`)
          }, 1500)
        } else {
          setTimeout(() => {
            router.push(`/events/${finalData?.eventId}`)
          }, 1500)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <>
        <Header title="Tracking" />
        <main className="min-h-screen bg-ink pt-20 pb-bottom-nav flex items-center justify-center">
          <motion.div
            className="w-10 h-10 rounded-full border-2 border-ember border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            aria-label="Loading"
          />
        </main>
        <BottomNav />
      </>
    )
  }

  const cfg = EVENT_TYPES[eventType]
  const Glyph = cfg.Glyph

  return (
    <>
      <Header title="Upload Event" />
      <main
        id="main"
        className="min-h-screen bg-ink pt-20 pb-bottom-nav surface-1 px-5"
      >
        <section className="max-w-md mx-auto">
          {/* Hero */}
          <div className="flex items-start gap-3 pt-2 pb-5">
            <div
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-lg bg-ink/80 border flex items-center justify-center",
                cfg.accent === "ember" && "border-ember/40 shadow-[0_0_18px_-6px_color-mix(in_oklab,var(--ember)_60%,transparent)]",
                cfg.accent === "blood" && "border-blood/40 shadow-[0_0_18px_-6px_color-mix(in_oklab,var(--blood)_60%,transparent)]",
                cfg.accent === "blood-light" && "border-blood-light/40 shadow-[0_0_18px_-6px_color-mix(in_oklab,var(--blood-light)_60%,transparent)]",
              )}
            >
              <Glyph size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow tone="ember" size="sm">
                Tracking
              </Eyebrow>
              <h1 className="mt-1 font-display text-2xl font-semibold text-bone tracking-[-0.01em]">
                {cfg.label}
              </h1>
              <p className="mt-1.5 text-bone/55 text-[13px] font-body">
                {cfg.tagline}
              </p>
            </div>
          </div>

          {/* Event-type selector — mobile-first segmented pills */}
          <div
            role="tablist"
            aria-label="Event type"
            className="grid grid-cols-3 gap-1.5 p-1 bg-smoke/50 border border-ash rounded-xl mb-5"
          >
            {UPLOADABLE_TYPES.map((code) => {
              const c = EVENT_TYPES[code]
              const isActive = code === eventType
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchType(code)}
                  disabled={isLoading}
                  className={cn(
                    "min-h-[48px] rounded-lg text-xs font-bold uppercase tracking-[0.16em] transition-all duration-150 active:scale-[0.97]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                    isActive
                      ? "bg-ember text-ink shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                      : "text-bone/65 hover:text-bone",
                  )}
                >
                  {c.abbrev}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode toggle */}
            <div
              role="tablist"
              aria-label="Upload mode"
              className="grid grid-cols-2 gap-1.5 p-1 bg-smoke/50 border border-ash rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "new"}
                onClick={() => {
                  setMode("new")
                  setSelectedEventId("")
                  setError("")
                }}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center gap-2 min-h-[48px] rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                  mode === "new"
                    ? "bg-ember text-ink"
                    : "text-bone/65 hover:text-bone",
                )}
              >
                <Plus size={16} aria-hidden="true" />
                New
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "update"}
                onClick={() => {
                  setMode("update")
                  setEventTitle("")
                  setError("")
                }}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center gap-2 min-h-[48px] rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                  mode === "update"
                    ? "bg-ember text-ink"
                    : "text-bone/65 hover:text-bone",
                )}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Update Existing
              </button>
            </div>

            {/* GW Daily — Active campaign auto-detect panel */}
            {mode === "new" && eventType === "gw_daily" && (
              <GWDailyPanel
                campaign={activeCampaign}
                cycle={gwCycle}
                dayType={gwDayType}
                superCycle={gwSuperCycle}
                dayInCycle={gwDayInCycle}
                deadlineIso={gwDeadlineIso}
                isOverrideOpen={gwOverrideOpen}
                onToggleOverride={() => setGwOverrideOpen((v) => !v)}
                onChange={(p) => {
                  setGwCycle(p.cycle)
                  setGwDayType(p.dayType)
                  setGwSuperCycle(p.superCycle)
                  setGwDayInCycle(p.dayInCycle)
                }}
                detected={activeDayPreview?.active ?? null}
                detectedFormat={activeDayPreview?.format ?? null}
                disabled={isLoading}
              />
            )}

            {/* Title (new mode, non-GW) */}
            {mode === "new" && eventType !== "gw_daily" && (
              <Card className="bg-smoke/70 border-ash">
                <CardContent className="p-4 md:p-5">
                  <label
                    htmlFor="event-title"
                    className="block text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2"
                  >
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    disabled={isLoading}
                    placeholder={TYPE_PLACEHOLDERS[eventType]}
                    className="w-full bg-ink/60 border border-ash rounded-lg px-3 py-3 text-bone placeholder-bone/35 focus:outline-none focus:border-ember/60 text-base"
                    autoComplete="off"
                  />
                </CardContent>
              </Card>
            )}

            {/* Title (new mode, GW Daily — auto-suggested but editable) */}
            {mode === "new" && eventType === "gw_daily" && activeCampaign && (
              <Card className="bg-smoke/70 border-ash">
                <CardContent className="p-4 md:p-5">
                  <label
                    htmlFor="event-title"
                    className="block text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2"
                  >
                    Daily Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    disabled={isLoading}
                    placeholder="GW · War · Day 2 · Kingpin"
                    className="w-full bg-ink/60 border border-ash rounded-lg px-3 py-3 text-bone placeholder-bone/35 focus:outline-none focus:border-ember/60 text-base"
                    autoComplete="off"
                  />
                </CardContent>
              </Card>
            )}

            {/* Existing event picker (update mode) */}
            {mode === "update" && (
              <Card className="bg-smoke/70 border-ash">
                <CardContent className="p-4 md:p-5">
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2">
                    Replace Existing {cfg.abbrev}
                  </label>
                  <p className="text-xs text-bone/55 mb-3">
                    Existing scores will be wiped and rebuilt from the new screenshots.
                  </p>
                  {existingEvents.length === 0 ? (
                    <p className="text-xs text-bone/50 py-3 text-center">
                      No existing {cfg.abbrev} events. Switch to <b>New</b>.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {existingEvents.map((ev) => {
                        const isSelected = selectedEventId === ev.id
                        const date = new Date(ev.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedEventId(ev.id)}
                            disabled={isLoading}
                            aria-pressed={isSelected}
                            className={cn(
                              "w-full text-left px-3 py-3 rounded-lg border transition-all duration-150 active:scale-[0.99]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                              isSelected
                                ? "border-ember bg-ember/10"
                                : "border-ash bg-ink/40 hover:bg-ink/60",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-semibold truncate",
                                    isSelected ? "text-ember" : "text-bone",
                                  )}
                                >
                                  {ev.title}
                                </p>
                                <p className="text-xs text-bone/50 mt-0.5">{date}</p>
                              </div>
                              {isSelected && (
                                <CheckCircle2
                                  size={18}
                                  className="text-ember flex-shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Screenshot uploader */}
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-4 md:p-5">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-3">
                  Screenshots
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                  id="screenshot-input"
                />
                <label
                  htmlFor="screenshot-input"
                  className={cn(
                    "flex items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 md:p-8 cursor-pointer transition-colors min-h-[120px]",
                    isLoading
                      ? "opacity-50 cursor-not-allowed border-ash"
                      : files.length > 0
                        ? "border-ember/60 bg-ember/5"
                        : "border-ash hover:border-ember/40",
                  )}
                >
                  <Upload
                    size={22}
                    className={cn(files.length > 0 ? "text-ember" : "text-bone/55")}
                    aria-hidden="true"
                  />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-bone">
                      {files.length > 0
                        ? `${files.length} screenshot${files.length === 1 ? "" : "s"} ready`
                        : "Tap to add screenshots"}
                    </p>
                    <p className="text-[11px] text-bone/50 mt-1 font-body">
                      PNG / JPG · multi-select supported
                    </p>
                  </div>
                </label>

                {files.length > 0 && (
                  <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {files.map((file) => (
                      <li
                        key={file.name}
                        className="text-[11px] text-bone/55 truncate font-mono"
                      >
                        · {file.name}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Progress */}
            {isLoading && progress.length > 0 && (
              <Card className="bg-smoke/70 border-ash">
                <CardContent className="p-4 md:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-bone/65 font-body">
                      Processing
                    </p>
                    <p className="text-sm font-mono text-ember font-bold tabular-nums">
                      {processedCount}/{totalFiles}
                    </p>
                  </div>
                  <div className="w-full bg-ash/30 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className="bg-ember h-full"
                      animate={{
                        width:
                          totalFiles > 0
                            ? `${(processedCount / totalFiles) * 100}%`
                            : "0%",
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <ul className="space-y-2.5 max-h-48 overflow-y-auto">
                    {progress.map((p, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        {p.type === "extracted" ? (
                          <CheckCircle2 size={16} className="text-ember flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <Loader2 size={16} className="text-bone/50 animate-spin flex-shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bone truncate font-medium">{p.fileName}</p>
                          {p.type === "extracted" && p.rowCount && (
                            <p className="text-[11px] text-bone/55 mt-0.5">
                              {p.rowCount} row{p.rowCount === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {error && (
              <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
                <AlertCircle size={16} className="text-blood flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-blood">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex gap-2 bg-ember/10 border border-ember/30 rounded-lg p-3">
                <CheckCircle2 size={16} className="text-ember flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-ember">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || files.length === 0 || (mode === "update" && !selectedEventId) || (eventType === "gw_daily" && mode === "new" && !activeCampaign)}
              className={cn(
                "w-full text-bone font-semibold min-h-[56px] text-base",
                cfg.accent === "ember" ? "bg-ember/90 hover:bg-ember text-ink" : "bg-blood hover:bg-blood/90",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" aria-hidden="true" />
                  Processing…
                </>
              ) : mode === "update" ? (
                `Replace ${files.length} screenshot${files.length === 1 ? "" : "s"}`
              ) : eventType === "gw_daily" ? (
                `Submit ${cfg.abbrev} Daily`
              ) : (
                `Extract ${cfg.abbrev}`
              )}
            </Button>
          </form>

          {/* Help footer */}
          <p className="mt-6 text-[11px] text-bone/40 font-body text-center">
            Need to start a Governor&apos;s War campaign?{" "}
            <Link
              href="/tracking/campaigns/new"
              className="text-ember/80 hover:text-ember underline-offset-2 hover:underline"
            >
              Open campaign setup
            </Link>
          </p>
        </section>
      </main>
      <BottomNav />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

interface GWDailyPanelProps {
  campaign: ActiveCampaign | null
  detected: ReturnType<typeof getActiveGWDay> | null
  detectedFormat: ReturnType<typeof formatActiveDay> | null
  cycle: GWCycle
  dayType: GWDayType
  superCycle: number
  dayInCycle: 1 | 2 | 3 | 4 | 5
  deadlineIso: string
  isOverrideOpen: boolean
  onToggleOverride: () => void
  onChange: (p: {
    cycle: GWCycle
    dayType: GWDayType
    superCycle: number
    dayInCycle: 1 | 2 | 3 | 4 | 5
  }) => void
  disabled: boolean
}

function GWDailyPanel({
  campaign,
  detected,
  detectedFormat,
  cycle,
  dayType,
  superCycle,
  dayInCycle,
  isOverrideOpen,
  onToggleOverride,
  onChange,
  disabled,
}: GWDailyPanelProps) {
  if (!campaign) {
    return (
      <Card className="bg-blood/8 border-blood/30">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blood-light flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bone text-sm">No active campaign.</p>
              <p className="text-xs text-bone/60 mt-1">
                Start a Governor&apos;s War campaign first; daily uploads attach to it
                automatically.
              </p>
            </div>
          </div>
          <Link
            href="/tracking/campaigns/new"
            className="block w-full text-center bg-blood hover:bg-blood/90 text-bone font-semibold rounded-lg min-h-[44px] inline-flex items-center justify-center"
          >
            Start GW Campaign
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-smoke/70 border-blood/30">
      <CardContent className="p-4 md:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Eyebrow tone="ember" size="xs">
              Active Campaign
            </Eyebrow>
            <p className="mt-1 font-display text-base font-semibold text-bone truncate">
              {campaign.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOverride}
            disabled={disabled}
            className="text-[11px] uppercase tracking-[0.16em] text-bone/55 hover:text-ember underline-offset-2 hover:underline min-h-[36px] px-2"
          >
            {isOverrideOpen ? "Cancel" : "Override"}
          </button>
        </div>

        {/* Detected today card */}
        {!isOverrideOpen && detected && detectedFormat && (
          <div
            className={cn(
              "rounded-lg border p-3.5 relative overflow-hidden",
              cycle === "war"
                ? "bg-blood/12 border-blood/35"
                : "bg-ember/12 border-ember/35",
            )}
          >
            <div
              className={cn(
                "absolute inset-0 pointer-events-none",
                cycle === "war"
                  ? "bg-gradient-to-br from-blood/15 via-transparent to-transparent"
                  : "bg-gradient-to-br from-ember/15 via-transparent to-transparent",
              )}
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Sword
                  size={12}
                  className={cycle === "war" ? "text-blood-light" : "text-ember"}
                  aria-hidden="true"
                />
                <span className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body">
                  Today · {detectedFormat.cycleLabel} · Super-Cycle {detected.superCycle}
                </span>
              </div>
              <p className="font-display text-xl font-semibold text-bone">
                {detectedFormat.dayLabel}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-bone/55 font-body">Minimum</span>
                <span className="font-mono text-base font-bold tabular-nums text-bone">
                  {detectedFormat.threshold}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-bone/55 font-body">Rolls over in</span>
                <span className="font-mono text-base font-bold tabular-nums text-ember">
                  {detectedFormat.countdown}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Override picker */}
        {isOverrideOpen && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2">
                Cycle
              </p>
              <div
                role="radiogroup"
                aria-label="Cycle"
                className="grid grid-cols-2 gap-1.5"
              >
                {(["war", "hegemony"] as GWCycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={cycle === c}
                    onClick={() =>
                      onChange({ cycle: c, dayType, superCycle, dayInCycle })
                    }
                    disabled={disabled}
                    className={cn(
                      "min-h-[44px] rounded-lg text-xs font-bold uppercase tracking-[0.14em] border transition-all active:scale-[0.97]",
                      cycle === c
                        ? c === "war"
                          ? "bg-blood/25 text-bone border-blood/60"
                          : "bg-ember/25 text-ink border-ember/60"
                        : "bg-ink/40 text-bone/55 border-ash hover:border-ember/30",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2">
                Day-Type
              </p>
              <div
                role="radiogroup"
                aria-label="Day type"
                className="grid grid-cols-5 gap-1"
              >
                {GW_DAY_SCHEDULE.map((dc) => (
                  <button
                    key={dc.type}
                    type="button"
                    role="radio"
                    aria-checked={dayType === dc.type}
                    onClick={() =>
                      onChange({
                        cycle,
                        dayType: dc.type,
                        superCycle,
                        dayInCycle: dc.dayInCycle,
                      })
                    }
                    disabled={disabled}
                    className={cn(
                      "min-h-[48px] flex flex-col items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-[0.08em] border transition-all active:scale-[0.97]",
                      dayType === dc.type
                        ? "bg-ember text-ink border-ember"
                        : "bg-ink/40 text-bone/60 border-ash hover:border-ember/30",
                    )}
                  >
                    <span className="text-[11px] font-mono tabular-nums">
                      D{dc.dayInCycle}
                    </span>
                    <span className="leading-tight mt-0.5">{dc.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2">
                Super-Cycle
              </p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      onChange({ cycle, dayType, superCycle: n, dayInCycle })
                    }
                    disabled={disabled}
                    className={cn(
                      "min-h-[44px] rounded-lg text-sm font-mono font-bold tabular-nums border transition-all active:scale-[0.97]",
                      superCycle === n
                        ? "bg-bone/20 text-bone border-bone/40"
                        : "bg-ink/40 text-bone/55 border-ash hover:border-ember/30",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-ink/40 border border-ash p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body mb-1">
                Override threshold
              </p>
              <p className="font-mono text-sm tabular-nums text-bone">
                {getGWThreshold(dayType, cycle).toLocaleString("en-US")} pts
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function legacyCodesFor(code: EventTypeCode): string[] {
  // Pull in legacy codes so old data still appears in the picker.
  if (code === "oak") return ["oak", "goa", "sgoa"]
  if (code === "gw_daily") return ["gw_daily", "gw-sl", "gw-fh"]
  return [code]
}
