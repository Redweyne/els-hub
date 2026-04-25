"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Member {
  id: string
  canonical_name: string
  rank_tier: string
  family_role: string | null
  influence: number | null
  vip_level: number | null
  is_active: boolean
}

export default function RosterPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const rankTierColors: Record<string, string> = {
    mastermind: "bg-ember text-ink",
    leaders: "bg-blood text-bone",
    frontliner: "bg-smoke text-bone",
    production: "bg-ash text-bone",
    stranger: "bg-ink border border-ash text-bone/50",
  }

  const familyRoleLabels: Record<string, string> = {
    advisor: "Advisor",
    general: "General",
    diplomat: "Diplomat",
    coordinator: "Coordinator",
  }

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("is_active", true)
          .order("rank_tier", { ascending: true })
          .order("influence", { ascending: false })

        if (error) throw error
        setMembers(data as Member[])
      } catch (err) {
        console.error("Failed to load roster:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
  }, [])

  useEffect(() => {
    let filtered = members

    if (searchTerm) {
      filtered = filtered.filter((m) =>
        m.canonical_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedTier) {
      filtered = filtered.filter((m) => m.rank_tier === selectedTier)
    }

    setFilteredMembers(filtered)
  }, [members, searchTerm, selectedTier])

  const tiers = ["mastermind", "leaders", "frontliner", "production", "stranger"]
  const tierCounts = tiers.map(
    (tier) => members.filter((m) => m.rank_tier === tier).length
  )

  if (isLoading) {
    return (
      <main className="bg-ink min-h-screen px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-bone/50 text-sm">Loading roster...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="film-grain bg-ink min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-4xl text-bone mb-2 tracking-[0.3em]">
          Roster Review
        </h1>
        <p className="text-bone/50 text-xs mb-8 tracking-[0.15em]">
          {members.length} members · Verify names before lock-in
        </p>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 mb-8">
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-smoke border-ash text-bone placeholder:text-bone/30 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTier === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTier(null)}
              className={selectedTier === null ? "bg-blood hover:bg-blood/90" : "border-ember text-ember"}
            >
              All ({members.length})
            </Button>
            {tiers.map((tier, idx) => (
              <Button
                key={tier}
                variant={selectedTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTier(tier)}
                className={
                  selectedTier === tier
                    ? "bg-blood hover:bg-blood/90"
                    : "border-ember text-ember"
                }
              >
                {tier} ({tierCounts[idx]})
              </Button>
            ))}
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid gap-3">
          {filteredMembers.length === 0 ? (
            <p className="text-bone/50 text-sm">No members match your search.</p>
          ) : (
            filteredMembers.map((member) => (
              <Card
                key={member.id}
                className="bg-smoke border-ash hover:border-ember transition-colors"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-bone font-semibold">
                        {member.canonical_name}
                      </p>
                      <Badge className={rankTierColors[member.rank_tier]}>
                        {member.rank_tier}
                      </Badge>
                      {member.family_role && (
                        <Badge variant="outline" className="border-ember text-ember">
                          {familyRoleLabels[member.family_role]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-bone/50">
                      {member.influence && (
                        <span className="font-mono">
                          Influence: {member.influence.toLocaleString()}
                        </span>
                      )}
                      {member.vip_level && (
                        <span>VIP Level: {member.vip_level}</span>
                      )}
                      {!member.is_active && (
                        <span className="text-bone/30 line-through">inactive</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-ash text-bone/50 hover:border-ember hover:text-ember"
                  >
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="mt-12 pt-8 border-t border-ash">
          <p className="text-xs text-bone/30 tracking-[0.1em]">
            Phase 1 · M2 · Database schema locked. 9 flagged OCR names verified from
            source screenshots.
          </p>
        </div>
      </div>
    </main>
  )
}
