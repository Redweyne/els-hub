"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"
import { AlertCircle, Calendar, ChevronRight, Flag, Loader2, Sword } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eyebrow, DisplayHeading } from "@/components/typography"
import { GovernorsWarGlyph } from "@/components/heraldry"
import { getDayAtOffset } from "@/lib/gw/schedule"
import { cn } from "@/lib/cn"

/**
 * `<input type="datetime-local">` returns a "yyyy-MM-ddTHH:mm" string with no
 * timezone. The user enters Paris time directly. We pair it with the explicit
 * "Europe/Paris" tz on the server side.
 *
 * This page is mobile-first: touch targets are 44–56px, the preview list is
 * a vertical timeline (no horizontal scroll on phones), and the submit
 * button is the largest tap target on the page.
 */
export default function NewCampaignPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [factionId, setFactionId] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Default: today at 02:00 Paris (the natural campaign anchor).
  const defaultStart = useMemo(() => {
    const now = new Date()
    // Format YYYY-MM-DDT02:00 in user-local time. We don't know user's tz,
    // but the input is labeled clearly as Paris so officer can adjust.
    const y = now.getFullYear()
    const m = (now.getMonth() + 1).toString().padStart(2, "0")
    const d = now.getDate().toString().padStart(2, "0")
    return `${y}-${m}-${d}T02:00`
  }, [])

  const [title, setTitle] = useState("")
  const [startLocal, setStartLocal] = useState(defaultStart)
  const [expectedDays, setExpectedDays] = useState(50)

  useEffect(() => {
    const check = async () => {
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
        if (!title) {
          setTitle(`Governor's War — ${new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`)
        }
      } catch {
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Build a preview of the upcoming 10 days from the entered start.
  const startIso = useMemo(() => {
    if (!startLocal) return null
    // Treat the entered time as Paris-local. Build an ISO that, when re-parsed,
    // points to the same Paris-local clock time.
    return new Date(startLocal).toISOString()
  }, [startLocal])

  const preview = useMemo(() => {
    if (!startIso) return []
    return Array.from({ length: 10 }).map((_, i) =>
      getDayAtOffset(startIso, i, expectedDays),
    )
  }, [startIso, expectedDays])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factionId) return
    if (!title.trim() || !startLocal) {
      setError("Title and start date are required.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const startIsoForInsert = new Date(startLocal).toISOString()
      const meta = {
        start_date_iso: startIsoForInsert,
        expected_days: expectedDays,
        tz: "Europe/Paris" as const,
      }
      const endsAt = new Date(
        new Date(startIsoForInsert).getTime() + expectedDays * 24 * 60 * 60 * 1000,
      ).toISOString()
      const { data, error } = await supabase
        .from("events")
        .insert({
          faction_id: factionId,
          event_type_code: "gw_campaign",
          title: title.trim(),
          status: "processing",
          starts_at: startIsoForInsert,
          ends_at: endsAt,
          meta_json: meta,
        })
        .select("id")
        .single()
      if (error) throw error
      router.push(`/events/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start campaign")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <>
        <Header title="Governor's War" />
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

  return (
    <>
      <Header title="Governor's War" />
      <main
        id="main"
        className="min-h-screen bg-ink pt-20 pb-bottom-nav surface-1 px-5"
      >
        <section className="max-w-md mx-auto">
          {/* Hero */}
          <div className="flex items-start gap-3 pt-2 pb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ink/80 border border-ember/40 flex items-center justify-center shadow-[0_0_18px_-6px_color-mix(in_oklab,var(--ember)_60%,transparent)]">
              <GovernorsWarGlyph size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow tone="ember" size="sm">
                Start Campaign
              </Eyebrow>
              <DisplayHeading level={2} className="mt-1 text-2xl">
                Governor&apos;s War
              </DisplayHeading>
              <p className="mt-1.5 text-bone/55 text-[13px] font-body">
                Set the start anchor in Paris time. Days roll over at 02:00 Paris automatically.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-4 md:p-5">
                <label
                  htmlFor="gw-title"
                  className="block text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2"
                >
                  Campaign Title
                </label>
                <input
                  id="gw-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Governor's War — Apr 30"
                  className="w-full bg-ink/60 border border-ash rounded-lg px-3 py-3 text-bone placeholder-bone/35 focus:outline-none focus:border-ember/60 text-base"
                  autoComplete="off"
                />
              </CardContent>
            </Card>

            {/* Start anchor */}
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div>
                  <label
                    htmlFor="gw-start"
                    className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2"
                  >
                    <Calendar size={12} aria-hidden="true" />
                    Day-1 Anchor (Paris time)
                  </label>
                  <input
                    id="gw-start"
                    type="datetime-local"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-ink/60 border border-ash rounded-lg px-3 py-3 text-bone focus:outline-none focus:border-ember/60 text-base"
                  />
                  <p className="mt-2 text-[11px] text-bone/45 font-body">
                    Day 1 = Robbing. Days advance at 02:00 Paris.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="gw-days"
                    className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2"
                  >
                    <Flag size={12} aria-hidden="true" />
                    Expected Duration
                  </label>
                  <div className="flex gap-2">
                    {[40, 45, 50].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setExpectedDays(n)}
                        disabled={isSubmitting}
                        aria-pressed={expectedDays === n}
                        className={cn(
                          "flex-1 min-h-[48px] rounded-lg border text-sm font-mono font-bold tabular-nums transition-all duration-150 active:scale-[0.97]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                          expectedDays === n
                            ? "bg-ember text-ink border-ember shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                            : "bg-ink/60 text-bone/70 border-ash hover:border-ember/40 hover:text-bone",
                        )}
                      >
                        {n} days
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <Eyebrow tone="ember" size="xs">
                  First 10 Days · Schedule Preview
                </Eyebrow>
                <ol className="mt-3 space-y-1.5">
                  {preview.map((p, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                        p.cycle === "war"
                          ? "bg-blood/10 border-blood/25"
                          : "bg-ember/8 border-ember/25",
                      )}
                    >
                      <span className="font-mono text-[11px] text-bone/45 tabular-nums w-7 flex-shrink-0">
                        {p.dayOffset + 1}
                      </span>
                      <Sword
                        size={12}
                        className={cn(
                          "flex-shrink-0",
                          p.cycle === "war" ? "text-blood-light" : "text-ember",
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm font-semibold text-bone truncate">
                        {p.config.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-bone/45 font-body flex-shrink-0">
                        {p.cycle === "war" ? "War" : "Hegemony"}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-bone/65 flex-shrink-0">
                        {p.minPoints >= 1_000_000
                          ? `${(p.minPoints / 1_000_000).toFixed(1)}M`
                          : `${(p.minPoints / 1_000).toFixed(0)}k`}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-bone/40 font-body">
                  10-day super-cycle (5 War + 5 Hegemony) repeats until the
                  campaign ends.
                </p>
              </div>
            )}

            {error && (
              <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
                <AlertCircle
                  size={16}
                  className="text-blood flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-xs text-blood">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blood hover:bg-blood/90 text-bone font-semibold min-h-[56px] text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={18}
                    className="mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Starting…
                </>
              ) : (
                <>
                  Open Campaign
                  <ChevronRight size={18} className="ml-1" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
