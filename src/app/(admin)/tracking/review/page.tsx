"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { apiPath } from "@/lib/paths"

interface ReviewItem {
  id: string
  raw_name: string
  candidates_json: Array<{ member_id: string; canonical_name: string; confidence: number }>
  raw_ocr_row_json: any
}

function ReviewQueueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams?.get("event_id")

  const [items, setItems] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!eventId) {
      router.push("/tracking/new")
      return
    }

    const loadQueue = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error: queryError } = await supabase
          .from("review_queue")
          .select("*")
          .eq("event_id", eventId)
          .is("resolution", null)

        if (queryError) throw queryError
        setItems(data || [])
      } catch (err) {
        console.error("Load queue error:", err)
        setError("Failed to load review queue")
      } finally {
        setIsLoading(false)
      }
    }

    loadQueue()
  }, [eventId, router])

  const handleResolve = async (memberId: string) => {
    if (!items[currentIndex]) return

    setIsResolving(true)
    try {
      const response = await fetch(apiPath(`/admin/review/${items[currentIndex].id}/resolve`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          member_id: memberId,
          ocr_row: items[currentIndex].raw_ocr_row_json,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Resolution failed")
      }

      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) {
        router.push(`/events/${eventId}`)
      } else {
        setCurrentIndex(nextIndex)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Resolution failed"
      setError(message)
      console.error("Resolution error:", err)
    } finally {
      setIsResolving(false)
    }
  }

  const handleIgnore = async () => {
    if (!items[currentIndex]) return

    setIsResolving(true)
    try {
      const response = await fetch(apiPath(`/admin/review/${items[currentIndex].id}/resolve`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          resolution: "ignored",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Ignore failed")
      }

      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) {
        router.push(`/events/${eventId}`)
      } else {
        setCurrentIndex(nextIndex)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ignore failed"
      setError(message)
      console.error("Ignore error:", err)
    } finally {
      setIsResolving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4 flex items-center justify-center">
        <div className="text-bone text-sm">Loading review queue...</div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
        <div className="max-w-2xl mx-auto py-8">
          <h1 className="font-display text-2xl font-bold text-bone tracking-[0.2em] mb-4">
            Review Complete
          </h1>
          <p className="text-bone/60 text-sm mb-6">All matches resolved!</p>
          <Button
            onClick={() => router.push(`/events/${eventId}`)}
            className="bg-blood hover:bg-blood/90 text-bone font-semibold"
          >
            View Event
          </Button>
        </div>
      </main>
    )
  }

  const current = items[currentIndex]
  const progress = `${currentIndex + 1} / ${items.length}`

  return (
    <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold text-bone tracking-[0.2em]">
              Review Queue
            </h1>
            <span className="text-xs text-bone/60">{progress}</span>
          </div>
          <div className="w-full bg-ash/30 rounded h-1">
            <div
              className="bg-blood h-1 rounded transition-all"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <Card className="bg-blood/10 border-blood/30 mb-6">
            <CardContent className="p-3">
              <p className="text-xs text-blood">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-smoke/70 border-ash">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-2">
                Extracted Name
              </p>
              <p className="text-lg font-semibold text-bone">{current.raw_name}</p>
            </div>

            <div>
              <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-3">
                Candidates
              </p>
              <div className="space-y-2">
                {current.candidates_json.map((candidate, idx) => (
                  <Button
                    key={candidate.member_id}
                    onClick={() => handleResolve(candidate.member_id)}
                    disabled={isResolving}
                    className="w-full justify-between text-left bg-ash/30 hover:bg-blood/10 border border-ash text-bone px-4 py-3 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{candidate.canonical_name}</p>
                      <p className="text-xs text-bone/60">
                        {(candidate.confidence * 100).toFixed(0)}% match
                      </p>
                    </div>
                    {isResolving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => handleResolve("")}
                disabled={isResolving}
                variant="outline"
                className="w-full border-bone/30 text-bone hover:bg-bone/10"
              >
                <Plus size={16} className="mr-2" />
                New Member
              </Button>
              <Button
                onClick={handleIgnore}
                disabled={isResolving}
                variant="outline"
                className="w-full border-ash/50 text-bone/60 hover:bg-ash/10"
              >
                Skip / Ignore
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<ReviewQueueLoadingPage />}>
      <ReviewQueueContent />
    </Suspense>
  )
}

function ReviewQueueLoadingPage() {
  return (
    <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4 flex items-center justify-center">
      <motion.div
        className="w-12 h-12 rounded-full border-2 border-ember border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </main>
  )
}
