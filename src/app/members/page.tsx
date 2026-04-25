"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Search, X, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { MemberCardElite, TierDivider } from "@/components/member"
import { Shimmer } from "@/components/motion/Shimmer"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { NetworkError } from "@/components/ui/network-error"
import { cn } from "@/lib/cn"

interface Member {
  id: string
  canonical_name: string
  rank_tier: string
  family_role: string | null
  influence: number | null
  vip_level: number | null
  is_active: boolean
}

const RANK_TIERS = [
  "mastermind",
  "leaders",
  "frontliner",
  "production",
  "stranger",
] as const

const TIER_PILL: Record<
  string,
  { active: string; label: string }
> = {
  mastermind: {
    active: "bg-ember text-ink border-ember shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--ember)_70%,transparent)]",
    label: "Mastermind",
  },
  leaders: {
    active: "bg-blood text-bone border-blood",
    label: "Leaders",
  },
  frontliner: {
    active: "bg-bone text-ink border-bone",
    label: "Frontliner",
  },
  production: {
    active: "bg-smoke text-bone border-ember/40",
    label: "Production",
  },
  stranger: {
    active: "bg-smoke text-bone/70 border-ash",
    label: "Stranger",
  },
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMembers = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data, error: dbError } = await supabase
        .from("members")
        .select("*")
        .eq("is_active", true)
        .order("rank_tier", { ascending: true })
        .order("influence", { ascending: false, nullsFirst: false })

      if (dbError) throw dbError
      setMembers((data || []) as Member[])
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load members"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const filtered = useMemo(() => {
    let list = members
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter((m) =>
        m.canonical_name.toLowerCase().includes(q),
      )
    }
    if (selectedTier) {
      list = list.filter((m) => m.rank_tier === selectedTier)
    }
    return list
  }, [members, searchTerm, selectedTier])

  const grouped = useMemo(() => {
    const out: Record<string, Member[]> = {}
    for (const tier of RANK_TIERS) {
      out[tier] = filtered.filter((m) => m.rank_tier === tier)
    }
    return out
  }, [filtered])

  const totalActive = members.length
  const totalInfluence = members.reduce(
    (s, m) => s + (m.influence || 0),
    0,
  )

  return (
    <>
      <Header title="Roster" />

      <main
        id="main"
        className="min-h-screen pb-bottom-nav surface-1"
      >
        <div className="fixed top-16 left-0 right-0 z-30 bg-ink/90 backdrop-blur-xl border-b border-ash/70">
          <div className="px-5 md:px-8 pt-3 pb-3 space-y-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-bone/50 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search members…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-9 py-2.5 rounded-full text-sm",
                  "bg-smoke/80 border border-ash text-bone placeholder:text-bone/35",
                  "focus-visible:outline-none focus-visible:border-ember/60 focus-visible:ring-1 focus-visible:ring-ember/30",
                  "transition-all duration-200",
                )}
                aria-label="Search members"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-bone/50 hover:text-bone hover:bg-ash transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div
              className="flex gap-2 overflow-x-auto -mx-5 md:-mx-8 px-5 md:px-8 pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              <TierPill
                label={`All · ${totalActive}`}
                isActive={selectedTier === null}
                onClick={() => setSelectedTier(null)}
                tier={null}
              />
              {RANK_TIERS.map((tier) => {
                const count = members.filter(
                  (m) => m.rank_tier === tier,
                ).length
                if (count === 0) return null
                return (
                  <TierPill
                    key={tier}
                    label={`${TIER_PILL[tier].label} · ${count}`}
                    isActive={selectedTier === tier}
                    onClick={() =>
                      setSelectedTier(selectedTier === tier ? null : tier)
                    }
                    tier={tier}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="pt-40 md:pt-40 px-5 md:px-8">
          {!isLoading && !error && (
            <div className="mb-6 flex items-baseline gap-4 justify-between">
              <div>
                <Eyebrow tone="ember" size="sm">
                  ELYSIUM Roster
                </Eyebrow>
                <DisplayHeading level={2} className="mt-1">
                  Our Family
                </DisplayHeading>
              </div>
              <div className="text-right">
                <Eyebrow tone="muted" size="xs">
                  Combined Influence
                </Eyebrow>
                <Numeric
                  value={totalInfluence}
                  format="compact"
                  precision={1}
                  className="text-ember font-mono font-bold text-lg md:text-xl"
                />
              </div>
            </div>
          )}

          {error ? (
            <NetworkError
              onRetry={loadMembers}
              message="Failed to load roster. Please check your connection."
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Shimmer
                  key={i}
                  delay={i * 70}
                  className="h-[72px] w-full rounded-xl"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyRoster
              hasQuery={!!searchTerm || !!selectedTier}
              onClear={() => {
                setSearchTerm("")
                setSelectedTier(null)
              }}
            />
          ) : (
            <div className="space-y-10">
              <AnimatePresence mode="popLayout">
                {RANK_TIERS.map((tier) => {
                  const tierMembers = grouped[tier]
                  if (!tierMembers || tierMembers.length === 0) return null

                  return (
                    <motion.section
                      key={tier}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                      className="space-y-3"
                    >
                      <TierDivider
                        tier={tier}
                        count={tierMembers.length}
                      />
                      <div className="space-y-2">
                        {tierMembers.map((member, idx) => (
                          <MemberCardElite
                            key={member.id}
                            id={member.id}
                            name={member.canonical_name}
                            tier={member.rank_tier}
                            familyRole={member.family_role}
                            influence={member.influence}
                            vipLevel={member.vip_level}
                            delay={Math.min(idx * 0.025, 0.3)}
                          />
                        ))}
                      </div>
                    </motion.section>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  )
}

function TierPill({
  label,
  isActive,
  onClick,
  tier,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  tier: string | null
}) {
  const activeClass = tier
    ? TIER_PILL[tier]?.active
    : "bg-ember text-ink border-ember shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--ember)_70%,transparent)]"

  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "flex-shrink-0 px-3 py-1.5 rounded-full border transition-all duration-200",
        "text-[11px] md:text-xs font-body font-semibold uppercase tracking-[0.12em] whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        "active:scale-95",
        isActive
          ? activeClass
          : "bg-smoke/60 text-bone/70 border-ash hover:border-ember/40 hover:text-bone",
      )}
    >
      {label}
    </button>
  )
}

function EmptyRoster({
  hasQuery,
  onClear,
}: {
  hasQuery: boolean
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-smoke/60 border border-ash flex items-center justify-center text-bone/40 mb-4">
        <Users size={24} />
      </div>
      <DisplayHeading level={3} className="mb-2">
        {hasQuery ? "No matches" : "Roster is empty"}
      </DisplayHeading>
      <p className="text-bone/55 text-sm max-w-sm mb-4 font-body">
        {hasQuery
          ? "Try a different name or clear the filter."
          : "Members will appear here once the roster is seeded."}
      </p>
      {hasQuery && (
        <button
          onClick={onClear}
          className="text-xs uppercase tracking-[0.2em] text-ember hover:text-ember/80 font-body border border-ember/40 px-4 py-2 rounded-full"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
