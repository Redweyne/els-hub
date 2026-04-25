"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight, Trophy } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import {
  ELSEmblemV2,
  TrophySVG,
  MedalSVG,
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
  OrnateDivider,
} from "@/components/heraldry"
import type { MedalTier } from "@/components/heraldry"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { Shimmer } from "@/components/motion/Shimmer"
import { Section } from "@/components/motion/Section"
import { NetworkError } from "@/components/ui/network-error"
import { cn } from "@/lib/cn"

interface HonorRow {
  id: string
  title: string
  event_type_code: string | null
  created_at: string
  faction_result_json: { placement?: number } | null
}

const EVENT_META: Record<
  string,
  {
    label: string
    Glyph: typeof FactionCallUpGlyph
    short: string
  }
> = {
  fcu: { label: "Faction Call-Up", Glyph: FactionCallUpGlyph, short: "FCU" },
  goa: {
    label: "Glory of Oakvale",
    Glyph: GloryOfOakvaleGlyph,
    short: "GoO",
  },
  sgoa: {
    label: "Supreme Glory",
    Glyph: GloryOfOakvaleGlyph,
    short: "SGoO",
  },
  "gw-sl": {
    label: "Governor's War · SL",
    Glyph: GovernorsWarGlyph,
    short: "GW",
  },
  "gw-fh": {
    label: "Governor's War · FH",
    Glyph: GovernorsWarGlyph,
    short: "GW",
  },
}

const FILTER_OPTIONS: { key: string; label: string; codes: string[] }[] = [
  { key: "all", label: "All", codes: [] },
  { key: "fcu", label: "FCU", codes: ["fcu"] },
  { key: "goa", label: "Oakvale", codes: ["goa", "sgoa"] },
  { key: "gw", label: "Governor's War", codes: ["gw-sl", "gw-fh"] },
]

export default function HonorWallPage() {
  const [honors, setHonors] = useState<HonorRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const loadHonors = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data, error: dbError } = await supabase
        .from("events")
        .select(
          "id, title, event_type_code, created_at, faction_result_json",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (dbError) throw dbError
      const filtered = ((data || []) as HonorRow[]).filter(
        (e) => e.faction_result_json?.placement,
      )
      setHonors(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHonors()
  }, [])

  const filtered = useMemo(() => {
    const codes = FILTER_OPTIONS.find((o) => o.key === filter)?.codes ?? []
    if (codes.length === 0) return honors
    return honors.filter((h) =>
      codes.includes(h.event_type_code ?? "fcu"),
    )
  }, [honors, filter])

  const totals = useMemo(() => {
    let gold = 0
    let silver = 0
    let bronze = 0
    let other = 0
    for (const h of honors) {
      const p = h.faction_result_json?.placement
      if (p === 1) gold++
      else if (p === 2) silver++
      else if (p === 3) bronze++
      else if (p) other++
    }
    return { gold, silver, bronze, other, total: honors.length }
  }, [honors])

  return (
    <>
      <Header title="Honor Wall" />

      <main id="main" className="min-h-screen pb-bottom-nav surface-1">
        <HonorHero totals={totals} isLoading={isLoading} />

        <div className="px-5 md:px-8 max-w-2xl mx-auto pt-4">
          {!isLoading && honors.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto -mx-5 md:-mx-8 px-5 md:px-8 pb-3 pt-2"
              style={{ scrollbarWidth: "none" }}
            >
              {FILTER_OPTIONS.map((opt) => {
                const isActive = filter === opt.key
                const count =
                  opt.codes.length === 0
                    ? honors.length
                    : honors.filter((h) =>
                        opt.codes.includes(h.event_type_code ?? "fcu"),
                      ).length
                if (count === 0 && opt.key !== "all") return null
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex-shrink-0 px-3.5 py-1.5 rounded-full border transition-all duration-200",
                      "text-[11px] md:text-xs font-body font-semibold uppercase tracking-[0.12em] whitespace-nowrap",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                      "active:scale-95",
                      isActive
                        ? "bg-ember text-ink border-ember shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                        : "bg-smoke/60 text-bone/70 border-ash hover:border-ember/40 hover:text-bone",
                    )}
                  >
                    {opt.label} · {count}
                  </button>
                )
              })}
            </div>
          )}

          {error ? (
            <NetworkError onRetry={loadHonors} />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Shimmer
                  key={i}
                  delay={i * 80}
                  className="h-[200px] rounded-xl"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyHonorWall hasFilter={filter !== "all"} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2">
              {filtered.map((honor, idx) => (
                <HonorCard key={honor.id} honor={honor} index={idx} />
              ))}
            </div>
          )}

          {!isLoading && honors.length > 0 && (
            <div className="pt-12">
              <OrnateDivider variant="fleur" label="A faction remembered" />
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  )
}

function HonorHero({
  totals,
  isLoading,
}: {
  totals: {
    gold: number
    silver: number
    bronze: number
    other: number
    total: number
  }
  isLoading: boolean
}) {
  return (
    <section className="relative overflow-hidden pt-20 pb-6 md:pb-8 surface-2 film-grain-drift">
      <div
        className="aurora-orb-ember pointer-events-none"
        style={{ top: "-30%", left: "50%", transform: "translateX(-50%)", opacity: 0.7 }}
        aria-hidden="true"
      />

      <div className="relative z-10 px-5 md:px-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="flex-shrink-0">
            <ELSEmblemV2
              size={70}
              glow
              starCount={5}
              idScope="honor-hero"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Eyebrow tone="ember" size="sm">
              Faction Trophies
            </Eyebrow>
            <DisplayHeading
              level={1}
              as="h1"
              className="mt-1.5 text-2xl md:text-4xl"
            >
              Honor Wall
            </DisplayHeading>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 md:gap-3">
          <HeroTile
            label="Total"
            value={totals.total}
            isLoading={isLoading}
            tone="ember"
          />
          <HeroTile
            label="Gold"
            value={totals.gold}
            isLoading={isLoading}
            tone="gold"
          />
          <HeroTile
            label="Silver"
            value={totals.silver}
            isLoading={isLoading}
            tone="silver"
          />
          <HeroTile
            label="Bronze"
            value={totals.bronze}
            isLoading={isLoading}
            tone="bronze"
          />
        </div>
      </div>
    </section>
  )
}

function HeroTile({
  label,
  value,
  isLoading,
  tone,
}: {
  label: string
  value: number
  isLoading: boolean
  tone: "ember" | "gold" | "silver" | "bronze"
}) {
  const colorClass =
    tone === "gold"
      ? "text-ember"
      : tone === "silver"
        ? "text-bone"
        : tone === "bronze"
          ? "text-[#d89a6c]"
          : "text-ember"

  return (
    <div className="surface-3 rounded-lg border border-ash p-2.5 md:p-3 text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 font-mono font-bold tabular-nums text-base md:text-lg",
          colorClass,
        )}
      >
        {isLoading ? (
          <Shimmer className="h-5 w-8 mx-auto rounded" />
        ) : (
          <Numeric value={value} format="raw" />
        )}
      </div>
    </div>
  )
}

function HonorCard({ honor, index }: { honor: HonorRow; index: number }) {
  const reducedMotion = useReducedMotion()
  const meta = EVENT_META[honor.event_type_code ?? "fcu"] ?? {
    label: "Event",
    Glyph: FactionCallUpGlyph,
    short: "EVT",
  }
  const placement = honor.faction_result_json?.placement ?? 0
  const tier: MedalTier | "slate" =
    placement === 1
      ? "gold"
      : placement === 2
        ? "silver"
        : placement === 3
          ? "bronze"
          : "slate"

  const placementLabel =
    placement === 1
      ? "1st"
      : placement === 2
        ? "2nd"
        : placement === 3
          ? "3rd"
          : `${placement}th`

  const dateStr = new Date(honor.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <Link
        href={`/events/${honor.id}`}
        className={cn(
          "block surface-3 rounded-xl border overflow-hidden h-full",
          "transition-all duration-300 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          tier === "gold"
            ? "border-ember/40 hover:border-ember/70 hover:shadow-[0_0_28px_-10px_color-mix(in_oklab,var(--ember)_70%,transparent)]"
            : tier === "silver"
              ? "border-bone/30 hover:border-bone/50"
              : tier === "bronze"
                ? "border-[#8c5a2c]/40 hover:border-[#8c5a2c]/70"
                : "border-ash hover:border-ember/30",
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center pt-4 pb-2 md:pt-5 md:pb-3",
            "bg-gradient-to-b",
            tier === "gold"
              ? "from-ember/10 to-transparent"
              : tier === "silver"
                ? "from-bone/8 to-transparent"
                : tier === "bronze"
                  ? "from-[#8c5a2c]/10 to-transparent"
                  : "from-smoke/30 to-transparent",
          )}
        >
          <meta.Glyph
            size={40}
            className="absolute top-2 right-2 opacity-20"
          />
          {tier === "slate" ? (
            <TrophySVG
              tier="slate"
              size={64}
              idScope={`honor-${honor.id}`}
            />
          ) : (
            <MedalSVG
              tier={tier}
              rank={placement}
              size={56}
              idScope={`honor-${honor.id}`}
            />
          )}
        </div>

        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className={cn(
                "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-[0.1em] border",
                tier === "gold"
                  ? "bg-ember/15 text-ember border-ember/40"
                  : tier === "silver"
                    ? "bg-bone/12 text-bone border-bone/30"
                    : tier === "bronze"
                      ? "bg-[#8c5a2c]/15 text-[#d89a6c] border-[#8c5a2c]/40"
                      : "bg-smoke text-bone/60 border-ash",
              )}
            >
              {placementLabel}
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-bone/40 font-body">
              {meta.short}
            </span>
          </div>
          <p
            className="text-[12px] md:text-sm text-bone font-semibold line-clamp-2 leading-tight"
            title={honor.title}
          >
            {honor.title}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-bone/45 font-body">
            <span>{dateStr}</span>
            <ChevronRight size={11} aria-hidden="true" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function EmptyHonorWall({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <Trophy size={36} className="text-bone/25 mb-3" aria-hidden="true" />
      <DisplayHeading level={3}>
        {hasFilter ? "No trophies in this category" : "Honor Wall is empty"}
      </DisplayHeading>
      <p className="mt-2 text-bone/55 text-sm max-w-xs font-body">
        {hasFilter
          ? "Try a different filter."
          : "When the faction places in an event, the trophy will be inscribed here."}
      </p>
    </div>
  )
}
