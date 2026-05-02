"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { createBrowserClient } from "@supabase/ssr"
import { getDayTypeGlyph } from "@/components/heraldry"
import {
  type GWCampaignMeta,
  type GWDailyMeta,
  getGWDayConfig,
} from "@/lib/events/config"
import { getActiveGWDay, formatActiveDay } from "@/lib/gw/schedule"
import { cn } from "@/lib/cn"

/**
 * Compact "TODAY · DAY 2 · KINGPIN · 7h" pill for the global Header.
 *
 * Mobile-first:
 *   - Render position: bottom of fixed header (safe-area aware via parent).
 *   - Tap target: full pill is 36px tall; the parent gives at least 44px hit area.
 *   - Self-fetches; renders nothing while loading or when no campaign is active.
 *   - Glyph + day label only on tablet+; just glyph + countdown on phone to save width.
 *
 * The pill links to today's daily if uploaded, otherwise to the campaign page.
 */
export function GWLiveBadge() {
  const reducedMotion = useReducedMotion()
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [campaignMeta, setCampaignMeta] = useState<GWCampaignMeta | null>(null)
  const [todayDailyId, setTodayDailyId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: campaign } = await supabase
        .from("events")
        .select("id, meta_json")
        .eq("event_type_code", "gw_campaign")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (!campaign?.meta_json || !("start_date_iso" in campaign.meta_json)) {
        setCampaignId(null)
        setCampaignMeta(null)
        return
      }
      const meta = campaign.meta_json as GWCampaignMeta
      setCampaignId(campaign.id)
      setCampaignMeta(meta)

      // Determine which (if any) daily corresponds to today's auto-detected slot.
      const active = getActiveGWDay(meta.start_date_iso, meta.expected_days)
      const { data: dailies } = await supabase
        .from("events")
        .select("id, meta_json")
        .eq("event_type_code", "gw_daily")
        .contains("meta_json", { campaign_id: campaign.id })
      if (cancelled) return
      const today = (dailies ?? []).find((d) => {
        const m = d.meta_json as GWDailyMeta
        return (
          m?.cycle === active.cycle &&
          m?.super_cycle === active.superCycle &&
          m?.day_in_cycle === active.dayInCycle
        )
      })
      setTodayDailyId(today?.id ?? null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!campaignId || !campaignMeta) return null

  const active = getActiveGWDay(
    campaignMeta.start_date_iso,
    campaignMeta.expected_days,
    now,
  )
  const fmt = formatActiveDay(active, now)
  const cfg = getGWDayConfig(active.dayType)
  const Glyph = getDayTypeGlyph(active.dayType)
  const cycle = active.cycle
  const palette =
    cycle === "war"
      ? {
          border: "border-blood/40",
          bg: "bg-blood/15",
          accent: "text-blood-light",
          dotBg: "bg-blood-light",
        }
      : {
          border: "border-ember/40",
          bg: "bg-ember/15",
          accent: "text-ember",
          dotBg: "bg-ember",
        }

  const href = todayDailyId
    ? `/events/${todayDailyId}`
    : `/events/${campaignId}`

  return (
    <Link
      href={href}
      aria-label={`Today: Day ${active.dayInCycle} ${cfg.label}, ${fmt.cycleLabel}, closes in ${fmt.countdown}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2 py-1 min-h-[36px] max-w-[210px]",
        "transition-all duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        palette.border,
        palette.bg,
      )}
    >
      <motion.span
        className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", palette.dotBg)}
        animate={
          reducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }
        }
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <Glyph size={14} className={cn("flex-shrink-0", palette.accent)} />
      <span
        className={cn(
          // Hidden on very narrow phones (<360px); the glyph + countdown carry the meaning.
          "font-mono text-[10px] font-bold uppercase tracking-[0.14em] truncate hidden min-[360px]:inline",
          palette.accent,
        )}
      >
        D{active.dayInCycle} · {cfg.short}
      </span>
      <span
        className={cn(
          "font-mono text-[10px] font-bold tabular-nums flex-shrink-0",
          palette.accent,
        )}
      >
        {fmt.countdown}
      </span>
    </Link>
  )
}
