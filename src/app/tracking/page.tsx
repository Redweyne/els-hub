"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/typography"
import {
  Upload,
  Lock,
  Sword,
  ClipboardCheck,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/cn"

interface TrackingCounts {
  pendingReview: number
  processingEvents: number
  hasActiveCampaign: boolean
}

export default function TrackingPage() {
  const [isOfficer, setIsOfficer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [counts, setCounts] = useState<TrackingCounts>({
    pendingReview: 0,
    processingEvents: 0,
    hasActiveCampaign: false,
  })

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setIsOfficer(false)
          setIsLoading(false)
          return
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("platform_role, faction_id")
          .eq("auth_user_id", user.id)
          .single()
        const role = profile?.platform_role
        const officer = role === "officer" || role === "owner"
        setIsOfficer(officer)
        if (!officer) {
          setIsLoading(false)
          return
        }

        // Fetch counts in parallel — pending review queue, processing events,
        // any active GW campaign for this faction.
        const [pending, processing, campaign] = await Promise.all([
          supabase
            .from("review_queue")
            .select("id", { count: "exact", head: true })
            .is("resolution", null),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("status", "processing"),
          profile?.faction_id
            ? supabase
                .from("events")
                .select("id", { count: "exact", head: true })
                .eq("faction_id", profile.faction_id)
                .eq("event_type_code", "gw_campaign")
                .eq("status", "processing")
            : Promise.resolve({ count: 0 } as { count: number }),
        ])
        setCounts({
          pendingReview: pending.count ?? 0,
          processingEvents: processing.count ?? 0,
          hasActiveCampaign: (campaign?.count ?? 0) > 0,
        })
      } catch (err) {
        console.error("[tracking] init error:", err)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  if (isLoading) {
    return (
      <>
        <Header title="Tracking" />
        <main className="min-h-screen bg-ink pt-32 pb-bottom-nav flex items-center justify-center">
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

  if (!isOfficer) {
    return (
      <>
        <Header title="Tracking" />
        <main className="min-h-screen bg-ink pt-24 pb-bottom-nav px-5">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-smoke/60 border-ash">
              <CardContent className="p-7 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full border border-blood/40 bg-blood/10 flex items-center justify-center">
                  <Lock size={20} className="text-blood-light" />
                </div>
                <Eyebrow tone="blood" size="sm">
                  Officer Tools
                </Eyebrow>
                <p className="mt-2 font-display text-lg text-bone">
                  Access reserved for officers
                </p>
                <p className="mt-2 text-bone/60 text-[13px] leading-relaxed">
                  Tracking handles event uploads, campaign setup, and the
                  review queue. Browse the rest of the app freely — anyone
                  can see events, members, and the honor wall.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Link href="/events">
                    <Button className="w-full bg-ember hover:bg-ember/90 text-ink">
                      Browse events
                    </Button>
                  </Link>
                  <Link href="/honor">
                    <Button
                      variant="outline"
                      className="w-full border-ash text-bone hover:bg-smoke/60"
                    >
                      View Honor Wall
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header title="Tracking" />
      <main
        id="main"
        className="min-h-screen bg-ink pt-20 pb-bottom-nav surface-1"
      >
        <div className="px-5 max-w-2xl mx-auto py-6 space-y-5">
          <div>
            <Eyebrow tone="ember" size="sm">
              Officer Console
            </Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-semibold text-bone tracking-[-0.01em]">
              Tracking
            </h1>
            <p className="mt-1 text-bone/55 text-[13px] font-body">
              Upload event screenshots, run campaigns, and resolve match
              ambiguities.
            </p>
          </div>

          {/* Inline status strip — shows what needs attention right now. */}
          <StatusStrip
            pendingReview={counts.pendingReview}
            processingEvents={counts.processingEvents}
          />

          <div className="space-y-3">
            <ActionCard
              href="/tracking/new"
              title="Upload Event"
              description="Drop FCU, Oak, or GW Daily screenshots — OCR handles the rest."
              icon={Upload}
              accent="ember"
              badge={
                counts.processingEvents > 0
                  ? `${counts.processingEvents} processing`
                  : null
              }
              badgeTone="ember"
            />
            <ActionCard
              href="/tracking/campaigns/new"
              title="Start GW Campaign"
              description="Anchor a Governor's War with auto-rotating dailies."
              icon={Sword}
              accent="blood"
              badge={counts.hasActiveCampaign ? "1 active" : null}
              badgeTone="blood"
            />
            <ActionCard
              href="/tracking/review"
              title="Review Queue"
              description="Resolve ambiguous member name matches."
              icon={ClipboardCheck}
              accent="bone"
              badge={
                counts.pendingReview > 0
                  ? `${counts.pendingReview} pending`
                  : null
              }
              badgeTone={counts.pendingReview > 0 ? "blood" : "muted"}
              urgent={counts.pendingReview > 5}
            />
          </div>

          <div className="pt-3 grid grid-cols-2 gap-3">
            <SecondaryLink
              href="/admin/requests"
              label="Account Requests"
              description="Approve member signups"
            />
            <SecondaryLink
              href="/admin/roster"
              label="Roster Editor"
              description="Manage members + aliases"
            />
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function StatusStrip({
  pendingReview,
  processingEvents,
}: {
  pendingReview: number
  processingEvents: number
}) {
  if (pendingReview === 0 && processingEvents === 0) {
    return (
      <div className="surface-3 rounded-xl border border-ember/30 bg-ember/5 px-4 py-3">
        <p className="text-[12px] text-bone/85 font-body">
          <span className="text-ember font-semibold">All clear.</span> No
          pending reviews, no in-flight uploads.
        </p>
      </div>
    )
  }
  return (
    <div className="surface-3 rounded-xl border border-blood/30 bg-blood/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-blood-light font-body">
        Needs attention
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {processingEvents > 0 && (
          <li className="text-[12px] text-bone/90 inline-flex items-center gap-1.5">
            <Loader2
              size={11}
              className="text-ember animate-spin"
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums text-ember font-bold">
              {processingEvents}
            </span>
            <span>
              event{processingEvents === 1 ? "" : "s"} still processing
            </span>
          </li>
        )}
        {pendingReview > 0 && (
          <li className="text-[12px] text-bone/90">
            <span className="font-mono tabular-nums text-blood-light font-bold">
              {pendingReview}
            </span>{" "}
            name match{pendingReview === 1 ? "" : "es"} awaiting review
          </li>
        )}
      </ul>
    </div>
  )
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  accent,
  badge,
  badgeTone,
  urgent,
}: {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: "ember" | "blood" | "bone"
  badge: string | null
  badgeTone: "ember" | "blood" | "muted"
  urgent?: boolean
}) {
  const accentStyles = {
    ember: {
      surface: "from-ember/15 to-blood/10 border-ember/40 hover:border-ember/60",
      iconBg: "bg-ember/20 border-ember/40",
      iconColor: "text-ember",
    },
    blood: {
      surface:
        "from-blood/15 to-blood-dark/10 border-blood/40 hover:border-blood/60",
      iconBg: "bg-blood/20 border-blood/40",
      iconColor: "text-blood-light",
    },
    bone: {
      surface: "from-bone/8 to-ash/8 border-ash hover:border-bone/30",
      iconBg: "bg-bone/10 border-ash",
      iconColor: "text-bone/80",
    },
  }[accent]
  const badgeStyles = {
    ember: "bg-ember/15 text-ember border-ember/35",
    blood: "bg-blood/15 text-blood-light border-blood/35",
    muted: "bg-ash/30 text-bone/55 border-ash",
  }[badgeTone]

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border bg-gradient-to-br transition-all duration-150 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        accentStyles.surface,
        urgent && "shadow-[0_0_0_1px_color-mix(in_oklab,var(--blood)_60%,transparent)]",
      )}
    >
      <div className="px-4 py-4 md:px-5 md:py-4 flex items-center gap-4 min-h-[88px]">
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center",
            accentStyles.iconBg,
          )}
        >
          <Icon size={22} className={accentStyles.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-bone text-[15px] leading-tight">
              {title}
            </p>
            {badge && (
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-0.5 rounded-full border",
                  badgeStyles,
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-bone/65 leading-snug font-body">
            {description}
          </p>
        </div>
        <ChevronRight
          size={16}
          className="text-bone/35 flex-shrink-0"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}

function SecondaryLink({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border border-ash bg-ink/40 px-3 py-2.5",
        "transition-all duration-150 active:scale-[0.98]",
        "hover:border-ember/40 hover:bg-ink/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
      )}
    >
      <p className="text-[12px] font-semibold text-bone leading-tight">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-bone/55 leading-snug">
        {description}
      </p>
    </Link>
  )
}
