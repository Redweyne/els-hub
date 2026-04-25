"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, ChevronRight } from "lucide-react"

export default function DashboardHome() {
  return (
    <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
      {/* Faction Hero — Full width, single column */}
      <section className="py-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full border-2 border-ember flex items-center justify-center bg-smoke/50">
            <span className="font-display text-xl font-bold text-ember">ELS</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-3xl font-bold text-bone tracking-[0.25em]">
              ELYSIUM
            </h2>
            <p className="text-xs text-bone/50 mt-1 tracking-[0.08em]">
              Class S · Server 78
            </p>
          </div>
        </div>

        {/* Stats — Stacked vertically on mobile */}
        <div className="space-y-2">
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-xs text-bone/50 uppercase tracking-[0.08em]">Members</span>
              <span className="text-2xl font-bold text-ember">83</span>
            </CardContent>
          </Card>
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-xs text-bone/50 uppercase tracking-[0.08em]">Influence</span>
              <span className="font-mono text-lg text-ember font-bold">487.3B</span>
            </CardContent>
          </Card>
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-xs text-bone/50 uppercase tracking-[0.08em]">Status</span>
              <span className="text-sm text-bone">🔴 Active</span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Active Event — Full width card */}
      <section className="py-6 space-y-3">
        <h3 className="font-display text-xl font-bold text-bone tracking-[0.15em]">
          Active Event
        </h3>
        <Card className="bg-gradient-to-b from-blood/15 to-blood/5 border-blood/40">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-xs text-blood uppercase tracking-[0.1em] font-bold mb-1">
                Faction Call-Up
              </p>
              <p className="font-semibold text-bone">Week of Apr 18–24</p>
              <p className="text-xs text-bone/60 mt-1">63 members participated</p>
            </div>
            <div className="flex items-center gap-2 text-blood pt-2 border-t border-blood/20">
              <Clock size={14} />
              <span className="text-xs font-mono">2d 14h remaining</span>
            </div>
            <Button className="w-full bg-blood hover:bg-blood/90 text-sm py-2">
              View Results
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Top Performers — Full width, stacked */}
      <section className="py-6 space-y-3">
        <h3 className="font-display text-xl font-bold text-bone tracking-[0.15em]">
          Top Performers
        </h3>
        <div className="space-y-2">
          {[
            { rank: 1, name: "Atilla I", points: "12.4M", badge: "gold", tier: "Frontliner" },
            { rank: 2, name: "TopKnife", points: "11.2M", badge: "silver", tier: "Mastermind" },
            { rank: 3, name: "AIRSTRIKE", points: "9.8M", badge: "bronze", tier: "Leader" },
          ].map((p, i) => (
            <Card key={i} className="bg-smoke/60 border-ash hover:border-ember/50 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ash/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-ember">#{p.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-bone text-sm">{p.name}</p>
                  <p className="text-xs text-bone/50">{p.tier}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-ember font-bold text-sm">{p.points}</p>
                  <Badge
                    className={`mt-0.5 text-[10px] ${
                      p.badge === "gold"
                        ? "bg-ember text-ink"
                        : p.badge === "silver"
                          ? "bg-bone/20 text-bone"
                          : "bg-blood/20 text-blood"
                    }`}
                  >
                    {p.badge}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Events — Full width */}
      <section className="py-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-bone tracking-[0.15em]">
            History
          </h3>
          <ChevronRight size={18} className="text-bone/50" />
        </div>
        <div className="space-y-2">
          {[
            { title: "Glory of Oakvale", date: "Apr 15", placement: "1st" },
            { title: "Faction Call-Up #3", date: "Apr 12", placement: "2nd" },
          ].map((e, i) => (
            <Card key={i} className="bg-smoke/60 border-ash cursor-pointer hover:border-ember/50 transition-colors">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-bone text-sm">{e.title}</p>
                  <p className="text-xs text-bone/50">{e.date}</p>
                </div>
                <Badge className="bg-ember/20 text-ember text-xs flex-shrink-0 ml-2">
                  {e.placement}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
