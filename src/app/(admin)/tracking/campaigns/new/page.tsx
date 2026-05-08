"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sword,
} from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/typography"
import { GovernorsWarGlyph, getDayTypeGlyph } from "@/components/heraldry"
import {
  GW_DAY_SCHEDULE,
  type GWCycle,
  type GWDayType,
} from "@/lib/events/config"
import { apiPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

/**
 * Campaign creation flow (mobile-first).
 *
 * One question only: "What day-type is TODAY?" Officer picks a cycle (War or
 * Hegemony) and a day-type (Robbing/Kingpin/Influence/Speedups/Massacre).
 * The server back-solves the implicit Day-1 anchor, no fixed end date — the
 * campaign runs until the officer presses "End Campaign" later.
 *
 * UX guards:
 *  - Buttons are 56–64px tap targets.
 *  - Submit triggers a server route (created_by gets set there; RLS bypass via service role).
 *  - Errors surface in a clear blood-tinted card, never silently.
 */
export default function NewCampaignPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [factionId, setFactionId] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [cycle, setCycle] = useState<GWCycle>("war")
  const [dayInCycle, setDayInCycle] = useState<1 | 2 | 3 | 4 | 5>(1)

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
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("faction_id, platform_role")
          .eq("auth_user_id", session.user.id)
          .single()
        if (profileErr || !profile) {
          router.push("/")
          return
        }
        if (!["owner", "officer"].includes(profile.platform_role)) {
          router.push("/")
          return
        }
        setFactionId(profile.faction_id)
        setTitle(
          (current) =>
            current ||
            `Governor's War — ${new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`,
        )
      } catch {
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }
    check()
  }, [router])

  const selectedDay = useMemo(
    () => GW_DAY_SCHEDULE.find((d) => d.dayInCycle === dayInCycle)!,
    [dayInCycle],
  )
  const threshold =
    cycle === "war" ? selectedDay.warThreshold : selectedDay.hegemonyThreshold
  const Glyph = getDayTypeGlyph(selectedDay.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factionId) return
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      const res = await fetch(apiPath("/admin/campaigns/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          today_cycle: cycle,
          today_day_in_cycle: dayInCycle,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.id) {
        throw new Error(json.error ?? "Failed to start campaign")
      }
      router.push(`/events/${json.id}`)
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
          <div className="flex items-start gap-3 pt-2 pb-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ink/80 border border-ember/40 flex items-center justify-center shadow-[0_0_18px_-6px_color-mix(in_oklab,var(--ember)_60%,transparent)]">
              <GovernorsWarGlyph size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow tone="ember" size="sm">
                Start Campaign
              </Eyebrow>
              <h1 className="mt-1 font-display text-2xl font-semibold text-bone tracking-[-0.01em]">
                Governor&apos;s War
              </h1>
              <p className="mt-1.5 text-bone/60 text-[13px] font-body">
                Pick the day-type that matches <b className="text-bone">today</b> in-game.
                Daily uploads will rotate from there. End the campaign whenever GW finishes — no fixed length.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Cycle picker */}
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2 inline-flex items-center gap-1.5">
                    <Sword size={11} aria-hidden="true" />
                    Today is...
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Cycle"
                    className="grid grid-cols-2 gap-2"
                  >
                    {(
                      [
                        { v: "war", label: "War", caption: "high stakes" },
                        { v: "hegemony", label: "Hegemony", caption: "lower stakes" },
                      ] as const
                    ).map((c) => {
                      const active = cycle === c.v
                      return (
                        <button
                          key={c.v}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setCycle(c.v)}
                          disabled={isSubmitting}
                          className={cn(
                            "min-h-[64px] rounded-xl border transition-all duration-150 active:scale-[0.97]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                            "flex flex-col items-center justify-center px-3 py-2",
                            active
                              ? c.v === "war"
                                ? "bg-blood/25 text-bone border-blood/60 shadow-[0_0_14px_-6px_color-mix(in_oklab,var(--blood-light)_60%,transparent)]"
                                : "bg-ember/20 text-ink border-ember/60 shadow-[0_0_14px_-6px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                              : "bg-ink/60 text-bone/65 border-ash hover:border-ember/30 hover:text-bone",
                          )}
                        >
                          <span className="font-display text-base font-semibold uppercase tracking-[0.16em]">
                            {c.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-bone/55 mt-0.5">
                            {c.caption}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Day-type picker — 5 buttons with day glyphs */}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-bone/55 font-body mb-2">
                    Day-Type
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Day type"
                    className="grid grid-cols-5 gap-1.5"
                  >
                    {GW_DAY_SCHEDULE.map((dc) => {
                      const TypeGlyph = getDayTypeGlyph(dc.type)
                      const active = dayInCycle === dc.dayInCycle
                      return (
                        <button
                          key={dc.type}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setDayInCycle(dc.dayInCycle)}
                          disabled={isSubmitting}
                          className={cn(
                            "min-h-[68px] rounded-lg border transition-all duration-150 active:scale-[0.97]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                            "flex flex-col items-center justify-center px-1 py-1",
                            active
                              ? "bg-ember text-ink border-ember shadow-[0_0_14px_-6px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                              : "bg-ink/40 text-bone/65 border-ash hover:border-ember/30",
                          )}
                          aria-label={`Day ${dc.dayInCycle}, ${dc.label}`}
                        >
                          <TypeGlyph
                            size={22}
                            className={cn(active ? "text-ink" : "text-bone/70")}
                          />
                          <span
                            className={cn(
                              "mt-1 text-[9px] font-mono font-bold uppercase tracking-[0.08em] leading-none",
                              active ? "text-ink" : "text-bone/70",
                            )}
                          >
                            D{dc.dayInCycle}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-bone/45 font-body mt-2 text-center">
                    {selectedDay.label} → {selectedDay.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation summary */}
            <div
              className={cn(
                "rounded-xl border p-4",
                cycle === "war" ? "bg-blood/10 border-blood/30" : "bg-ember/10 border-ember/30",
              )}
            >
              <div className="flex items-center gap-3">
                <Glyph
                  size={36}
                  className={cycle === "war" ? "text-blood-light" : "text-ember"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-bone/55 font-body">
                    Today
                  </p>
                  <p className="font-display text-lg font-semibold text-bone leading-tight">
                    {cycle === "war" ? "War" : "Hegemony"} · Day {dayInCycle} · {selectedDay.label}
                  </p>
                  <p className="text-[11px] text-bone/55 font-mono mt-0.5">
                    Threshold: {threshold.toLocaleString()} pts
                  </p>
                </div>
                <CheckCircle2
                  size={18}
                  className={cycle === "war" ? "text-blood-light" : "text-ember"}
                  aria-hidden="true"
                />
              </div>
            </div>

            {error && (
              <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
                <AlertCircle
                  size={16}
                  className="text-blood-light flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-xs text-blood-light">{error}</p>
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
                  Start Campaign
                  <ChevronRight size={18} className="ml-1" aria-hidden="true" />
                </>
              )}
            </Button>

            <p className="text-[10px] text-bone/40 font-body text-center pt-1">
              You can end the campaign at any time from the campaign page.
            </p>
          </form>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
