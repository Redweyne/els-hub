"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, Loader2, CheckCircle2, Plus, RefreshCw } from "lucide-react"
import { apiPath } from "@/lib/paths"

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

export default function UploadFCUPage() {
  const router = useRouter()
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login")
          return
        }

        // Get user's faction
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
      } catch (err) {
        console.error("Auth check failed:", err)
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!factionId) return

    const loadEvents = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from("events")
          .select("id, title, created_at, event_type_code")
          .eq("faction_id", factionId)
          .eq("event_type_code", "fcu")
          .in("status", ["published", "processing"])
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error
        setExistingEvents(data || [])
      } catch (err) {
        console.error("Failed to load events:", err)
      }
    }

    loadEvents()
  }, [factionId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setError("Select at least one screenshot")
      return
    }

    if (mode === "new" && !eventTitle.trim()) {
      setError("Enter an event title")
      return
    }

    if (mode === "update" && !selectedEventId) {
      setError("Select an event to update")
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
      files.forEach((file) => {
        formData.append("screenshots", file)
      })
      formData.append("event_type", "fcu")
      formData.append("faction_id", factionId)

      if (mode === "update") {
        formData.append("event_id", selectedEventId)
      } else {
        formData.append("event_title", eventTitle)
      }

      const response = await fetch(apiPath("/tracking/ocr"), {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""
      let eventId = ""
      let finalData: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const update: ProgressUpdate = JSON.parse(line)

            if (update.type === "start") {
              setTotalFiles(update.totalFiles || 0)
            } else if (update.type === "event_created" || update.type === "event_reused") {
              eventId = update.eventId || ""
            } else if (update.type === "processing") {
              setProgress((prev) => [
                ...prev,
                { type: "processing", fileName: update.fileName, fileNumber: update.fileNumber },
              ])
            } else if (update.type === "extracted") {
              setProgress((prev) => [
                ...prev,
                { type: "extracted", fileName: update.fileName, fileNumber: update.fileNumber, rowCount: update.rowCount },
              ])
              setProcessedCount(update.fileNumber || 0)
            } else if (update.type === "complete") {
              finalData = update
            } else if (update.type === "error") {
              throw new Error(update.message || "Processing failed")
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
          `${action}! ${finalData.autoResolved} auto-matched, ${finalData.reviewQueueCount} need review.`
        )
        setFiles([])
        setEventTitle("")
        setSelectedEventId("")

        // Redirect to review queue if there are items
        if (finalData.reviewQueueCount > 0) {
          setTimeout(() => {
            router.push(`/tracking/review?event_id=${finalData.eventId}`)
          }, 1500)
        } else {
          setTimeout(() => {
            router.push(`/events/${finalData.eventId}`)
          }, 1500)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      setError(message)
      console.error("Upload error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4 flex items-center justify-center">
        <div className="text-bone text-sm">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bone tracking-[0.2em] mb-2">
            FACTION CALL-UP
          </h1>
          <p className="text-bone/60 text-sm">
            Upload all FCU ranking screenshots at once. We'll extract the data and build the leaderboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-smoke/50 border border-ash rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode("new")
                setSelectedEventId("")
                setError("")
              }}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "new"
                  ? "bg-ember text-ink"
                  : "text-bone/60 hover:text-bone"
              }`}
            >
              <Plus size={16} />
              New Event
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("update")
                setEventTitle("")
                setError("")
              }}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "update"
                  ? "bg-ember text-ink"
                  : "text-bone/60 hover:text-bone"
              }`}
            >
              <RefreshCw size={16} />
              Update Existing
            </button>
          </div>

          {/* Event Title (new mode) */}
          {mode === "new" && (
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-6">
                <label className="block text-sm font-semibold text-bone mb-2">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., FCU — Week of Apr 18"
                  disabled={isLoading}
                  className="w-full bg-ash/30 border border-ash rounded px-3 py-2 text-bone placeholder-bone/40 focus:outline-none focus:border-ember/50 text-sm"
                />
              </CardContent>
            </Card>
          )}

          {/* Event Picker (update mode) */}
          {mode === "update" && (
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-6">
                <label className="block text-sm font-semibold text-bone mb-2">
                  Select Event to Update
                </label>
                <p className="text-xs text-bone/60 mb-4">
                  Existing scores will be replaced with the new screenshots
                </p>

                {existingEvents.length === 0 ? (
                  <p className="text-xs text-bone/50 py-4 text-center">
                    No existing events found. Create one first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {existingEvents.map((event) => {
                      const isSelected = selectedEventId === event.id
                      const date = new Date(event.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEventId(event.id)}
                          disabled={isLoading}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-ember bg-ember/10"
                              : "border-ash bg-ash/20 hover:bg-ash/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? "text-ember" : "text-bone"}`}>
                                {event.title}
                              </p>
                              <p className="text-xs text-bone/50 mt-0.5">{date}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={18} className="text-ember flex-shrink-0" />
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

          {/* Upload Area */}
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-6">
              <label className="block text-sm font-semibold text-bone mb-4">
                FCU Screenshots (multi-select)
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
                className={`flex items-center justify-center gap-3 border-2 border-dashed border-ash rounded-lg p-8 cursor-pointer transition-colors ${
                  isLoading ? "opacity-50" : "hover:border-ember"
                }`}
              >
                <Upload size={24} className="text-bone/60" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-bone">
                    {files.length > 0
                      ? `${files.length} screenshot${files.length !== 1 ? "s" : ""} selected`
                      : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-xs text-bone/50 mt-1">PNG, JPG — no limit</p>
                </div>
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-bone/70 font-semibold">Selected:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((file) => (
                      <p key={file.name} className="text-xs text-bone/60 truncate">
                        • {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Display */}
          {isLoading && progress.length > 0 && (
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-bone uppercase tracking-[0.08em]">
                      Processing
                    </p>
                    <p className="text-sm font-mono text-ember font-semibold">
                      {processedCount}/{totalFiles}
                    </p>
                  </div>
                  <div className="w-full bg-ash/30 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-ember h-full transition-all duration-300"
                      style={{
                        width: totalFiles > 0 ? `${(processedCount / totalFiles) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  <div className="space-y-3 max-h-56 overflow-y-auto">
                    {progress.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-2 last:pb-0">
                        {p.type === "extracted" ? (
                          <div className="flex-shrink-0">
                            <CheckCircle2 size={18} className="text-ember" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            <Loader2 size={18} className="text-bone/50 animate-spin" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bone truncate font-medium">
                            {p.fileName}
                          </p>
                          {p.type === "extracted" && p.rowCount && (
                            <p className="text-xs text-bone/60 mt-0.5">
                              ✓ {p.rowCount} row{p.rowCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
              <AlertCircle size={16} className="text-blood flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blood">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex gap-2 bg-ember/10 border border-ember/30 rounded-lg p-3">
              <CheckCircle2 size={16} className="text-ember flex-shrink-0 mt-0.5" />
              <p className="text-xs text-ember">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || files.length === 0 || (mode === "update" && !selectedEventId)}
            className="w-full bg-blood hover:bg-blood/90 text-bone font-semibold py-3"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Processing...
              </>
            ) : mode === "update" ? (
              `Update Event (${files.length})`
            ) : (
              `Extract Rankings (${files.length})`
            )}
          </Button>
        </form>

        {/* Info Card */}
        <Card className="bg-ember/10 border-ember/30 mt-8">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-bone mb-2">How it works:</h3>
            <ol className="text-xs text-bone/70 space-y-1 list-decimal list-inside">
              <li>Upload all FCU ranking screenshots from this week</li>
              <li>We extract player ranks, points, and accept ratios</li>
              <li>Review & approve in the queue below</li>
              <li>Leaderboard generates automatically</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
