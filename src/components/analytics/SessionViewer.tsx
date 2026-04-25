"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Clock, Eye, Globe2, MousePointer2, RefreshCw, ShieldCheck, Smartphone, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { compactDuration, type SessionSummary } from "@/lib/analytics/readable"
import { apiPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

interface SessionsResponse {
  sessions: SessionSummary[]
  generatedAt: string
}

export function SessionViewer({ initialSessions }: { initialSessions: SessionSummary[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [updatedAt, setUpdatedAt] = useState(new Date().toISOString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState(initialSessions[0]?.sessionId || "")

  const selected = sessions.find((session) => session.sessionId === selectedId) || sessions[0]
  const stats = useMemo(() => {
    const currentTime = new Date(updatedAt).getTime()
    return {
      live: sessions.filter((session) => currentTime - new Date(session.lastSeen).getTime() < 2 * 60 * 1000).length,
      visitors: sessions.length,
      clicks: sessions.reduce((sum, session) => sum + session.clicks, 0),
      pageViews: sessions.reduce((sum, session) => sum + session.pageViews, 0),
    }
  }, [sessions, updatedAt])

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(apiPath("/sessions"), { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as SessionsResponse
      setSessions(data.sessions)
      setUpdatedAt(data.generatedAt)
      if (!selectedId && data.sessions[0]) setSelectedId(data.sessions[0].sessionId)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const timer = window.setInterval(refresh, 12000)
    return () => window.clearInterval(timer)
  })

  return (
    <main id="main" className="min-h-screen bg-background pb-bottom-nav">
      <section className="px-4 pt-8 pb-5 md:px-8 md:pt-10 border-b border-ash bg-ink/70">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-ember font-semibold">Live Intelligence</p>
              <h1 className="font-display text-3xl md:text-5xl text-bone mt-1">Website Sessions</h1>
              <p className="text-sm text-bone/55 mt-2 max-w-2xl">
                Human visitors, devices, sources, and plain-English activity across the ELS website.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing} className="shrink-0">
              <RefreshCw size={15} className={cn(isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
            <Metric icon={Activity} label="Live now" value={stats.live.toLocaleString()} />
            <Metric icon={UserRound} label="Humans" value={stats.visitors.toLocaleString()} />
            <Metric icon={Eye} label="Page views" value={stats.pageViews.toLocaleString()} />
            <Metric icon={MousePointer2} label="Actions" value={stats.clicks.toLocaleString()} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-5">
        <div className="grid lg:grid-cols-[390px_1fr] gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-bone/45">Recent humans</p>
              <p className="text-[11px] text-bone/35">{new Date(updatedAt).toLocaleTimeString()}</p>
            </div>

            {sessions.length === 0 ? (
              <div className="surface-2 border border-ash rounded-lg p-5 text-sm text-bone/55">
                No human sessions have been captured yet. Open the site from another browser or phone and this page will populate live.
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => setSelectedId(session.sessionId)}
                  className={cn(
                    "w-full text-left surface-2 border rounded-lg p-3 transition-all",
                    selected?.sessionId === session.sessionId
                      ? "border-ember/70 bg-ember/8"
                      : "border-ash hover:border-ember/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bone truncate">{visitorName(session)}</p>
                      <p className="text-xs text-bone/50 mt-0.5 truncate">
                        {session.entryPage} from {session.source}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-2 py-0">
                      {session.humanScore}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-bone/40">
                    <span>{session.device.deviceType}</span>
                    <span>{compactDuration(session.durationSeconds)}</span>
                    <span>{relativeTime(session.lastSeen, updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {selected && (
            <article className="surface-1 border border-ash rounded-lg overflow-hidden">
              <div className="p-4 md:p-5 border-b border-ash bg-smoke/35">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-ember font-semibold">Selected Session</p>
                    <h2 className="font-display text-2xl text-bone mt-1">{visitorName(selected)}</h2>
                    <p className="text-sm text-bone/55 mt-1">
                      Entered through {selected.entryPage}, last seen on {selected.lastPage}.
                    </p>
                  </div>
                  <Badge className="w-fit">
                    <ShieldCheck size={13} />
                    Human confidence {selected.humanScore}%
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-5">
                  <Info icon={Smartphone} label="Device" value={`${selected.device.deviceType} · ${selected.device.os} · ${selected.device.browser}`} />
                  <Info icon={Globe2} label="Location" value={locationLabel(selected)} />
                  <Info icon={Clock} label="Duration" value={compactDuration(selected.durationSeconds)} />
                  <Info icon={Activity} label="Activity" value={`${selected.pageViews} pages · ${selected.clicks} taps`} />
                </div>
              </div>

              <div className="p-4 md:p-5">
                <div className="grid md:grid-cols-2 gap-3 mb-5">
                  <Detail label="Source" value={selected.source} />
                  <Detail label="Network" value={selected.geo?.isp || "Unknown network"} />
                  <Detail label="IP" value={selected.ip} />
                  <Detail label="Human signals" value={selected.humanSignals.join(", ")} />
                </div>

                <h3 className="text-sm font-semibold text-bone mb-3">What they did</h3>
                <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-ash">
                  {selected.timeline.map((item, index) => (
                    <li key={`${item.at}-${index}`} className="relative pl-6">
                      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-ink border border-ember/60" />
                      <p className="text-sm text-bone">{item.sentence}</p>
                      <p className="text-[11px] text-bone/40 mt-0.5">
                        {new Date(item.at).toLocaleString()} · {item.path.replace(/^\/els/, "") || "/"}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="surface-2 border border-ash rounded-lg p-3">
      <Icon size={16} className="text-ember" />
      <p className="text-2xl font-mono text-bone mt-2">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-bone/40">{label}</p>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="surface-2 border border-ash rounded-lg p-3">
      <div className="flex items-center gap-2 text-bone/45">
        <Icon size={14} className="text-ember" />
        <span className="text-[10px] uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="text-sm text-bone mt-2 leading-snug">{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ash/70 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-bone/40">{label}</p>
      <p className="text-sm text-bone/80 mt-1 break-words">{value || "Unknown"}</p>
    </div>
  )
}

function visitorName(session: SessionSummary) {
  if (session.user?.displayName) return session.user.displayName
  if (session.user?.username) return session.user.username
  return `${session.device.deviceType} visitor from ${locationLabel(session)}`
}

function locationLabel(session: SessionSummary) {
  const parts = [session.geo?.city, session.geo?.region, session.geo?.country].filter(Boolean)
  return parts.join(", ") || "Unknown location"
}

function relativeTime(value: string, now: string) {
  const currentTime = new Date(now).getTime()
  const seconds = Math.max(1, Math.round((currentTime - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}
