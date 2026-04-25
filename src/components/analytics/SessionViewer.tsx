"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Activity,
  BarChart3,
  Clock,
  Eye,
  Filter,
  Globe2,
  History,
  Laptop,
  MousePointer2,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  compactDuration,
  type AnalyticsReport,
  type SessionSummary,
  type VisitorSummary,
} from "@/lib/analytics/readable"
import { apiPath } from "@/lib/paths"
import { cn } from "@/lib/cn"

type ViewMode = "people" | "sessions"
type DeviceFilter = "all" | "Phone" | "Tablet" | "Desktop"

export function SessionViewer({ initialReport }: { initialReport: AnalyticsReport }) {
  const [report, setReport] = useState(initialReport)
  const [days, setDays] = useState(initialReport.range.days)
  const [mode, setMode] = useState<ViewMode>("people")
  const [query, setQuery] = useState("")
  const [device, setDevice] = useState<DeviceFilter>("all")
  const [source, setSource] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedVisitorKey, setSelectedVisitorKey] = useState(initialReport.visitors[0]?.visitorKey || "")
  const [selectedSessionId, setSelectedSessionId] = useState(initialReport.sessions[0]?.sessionId || "")

  const refresh = useCallback(
    async (nextDays = days) => {
      setIsRefreshing(true)
      try {
        const response = await fetch(`${apiPath("/sessions")}?days=${nextDays}`, { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as AnalyticsReport
        setReport(data)
        setDays(data.range.days)
        if (!selectedVisitorKey && data.visitors[0]) setSelectedVisitorKey(data.visitors[0].visitorKey)
        if (!selectedSessionId && data.sessions[0]) setSelectedSessionId(data.sessions[0].sessionId)
      } finally {
        setIsRefreshing(false)
      }
    },
    [days, selectedSessionId, selectedVisitorKey],
  )

  const sources = useMemo(() => ["all", ...report.breakdowns.sources.map((item) => item.label)], [report])

  const filteredSessions = useMemo(() => {
    return report.sessions.filter((session) => {
      if (device !== "all" && session.device.deviceType !== device) return false
      if (source !== "all" && session.source !== source) return false
      if (!query.trim()) return true
      const haystack = [
        visitorName(session),
        session.source,
        session.entryPage,
        session.lastPage,
        session.ip,
        session.geo?.city,
        session.geo?.country,
        session.device.browser,
        session.device.os,
        session.timeline.map((item) => item.sentence).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(query.toLowerCase())
    })
  }, [device, query, report.sessions, source])

  const filteredVisitors = useMemo(() => {
    const allowedSessionIds = new Set(filteredSessions.map((session) => session.sessionId))
    return report.visitors
      .map((visitor) => ({
        ...visitor,
        sessions: visitor.sessions.filter((session) => allowedSessionIds.has(session.sessionId)),
      }))
      .filter((visitor) => visitor.sessions.length > 0)
  }, [filteredSessions, report.visitors])

  const selectedVisitor =
    filteredVisitors.find((visitor) => visitor.visitorKey === selectedVisitorKey) || filteredVisitors[0]
  const selectedSession =
    filteredSessions.find((session) => session.sessionId === selectedSessionId) ||
    selectedVisitor?.sessions[0] ||
    filteredSessions[0]

  const selectedJourney = selectedVisitor?.journey.filter((item) =>
    selectedVisitor.sessions.some((session) => session.sessionId === item.sessionId),
  )

  return (
    <main id="main" className="min-h-screen bg-background pb-bottom-nav">
      <section className="px-4 pt-8 pb-5 md:px-8 md:pt-10 border-b border-ash bg-ink/75">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-ember font-semibold">Live Intelligence</p>
              <h1 className="font-display text-3xl md:text-5xl text-bone mt-1">Visitor Command Center</h1>
              <p className="text-sm text-bone/55 mt-2 max-w-2xl">
                Human visitors, full histories, device fingerprints, sources, and readable journeys across ELS.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isRefreshing} className="shrink-0">
              <RefreshCw size={15} className={cn(isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-6">
            <Metric icon={Activity} label="Live" value={report.totals.live.toLocaleString()} />
            <Metric icon={Users} label="People" value={report.totals.visitors.toLocaleString()} />
            <Metric icon={History} label="Sessions" value={report.totals.sessions.toLocaleString()} />
            <Metric icon={Eye} label="Views" value={report.totals.pageViews.toLocaleString()} />
            <Metric icon={MousePointer2} label="Actions" value={report.totals.clicks.toLocaleString()} />
            <Metric icon={ShieldCheck} label="Human" value={`${report.totals.averageHumanScore}%`} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-4 border-b border-ash/60">
        <div className="grid gap-2 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center">
          <Segmented value={mode} onChange={setMode} />

          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, pages, countries, actions"
              className="w-full h-11 rounded-md border border-ash bg-smoke/60 pl-9 pr-3 text-sm text-bone outline-none focus:border-ember"
            />
          </label>

          <Select
            label="Days"
            value={String(days)}
            onChange={(value) => refresh(Number(value))}
            options={[
              ["1", "Today"],
              ["7", "7 days"],
              ["14", "14 days"],
              ["30", "30 days"],
              ["90", "90 days"],
            ]}
          />
          <Select
            label="Device"
            value={device}
            onChange={(value) => setDevice(value as DeviceFilter)}
            options={[
              ["all", "All devices"],
              ["Phone", "Phones"],
              ["Tablet", "Tablets"],
              ["Desktop", "Desktop"],
            ]}
          />
          <Select
            label="Source"
            value={source}
            onChange={setSource}
            options={sources.map((item) => [item, item === "all" ? "All sources" : item])}
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-5">
        <div className="grid xl:grid-cols-[360px_1fr_320px] gap-4">
          <aside className="space-y-3">
            <PanelTitle icon={Filter} title={mode === "people" ? "People" : "Sessions"} detail={`${mode === "people" ? filteredVisitors.length : filteredSessions.length} shown`} />

            {mode === "people" ? (
              filteredVisitors.length ? (
                filteredVisitors.map((visitor) => (
                  <VisitorButton
                    key={visitor.visitorKey}
                    visitor={visitor}
                    active={selectedVisitor?.visitorKey === visitor.visitorKey}
                    onClick={() => {
                      setSelectedVisitorKey(visitor.visitorKey)
                      setSelectedSessionId(visitor.sessions[0]?.sessionId || "")
                    }}
                    now={report.generatedAt}
                  />
                ))
              ) : (
                <EmptyState />
              )
            ) : filteredSessions.length ? (
              filteredSessions.map((session) => (
                <SessionButton
                  key={session.sessionId}
                  session={session}
                  active={selectedSession?.sessionId === session.sessionId}
                  onClick={() => {
                    setSelectedSessionId(session.sessionId)
                    setSelectedVisitorKey(session.visitorKey)
                  }}
                  now={report.generatedAt}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </aside>

          <section className="space-y-4">
            {selectedVisitor && (
              <article className="surface-1 border border-ash rounded-lg overflow-hidden">
                <div className="p-4 md:p-5 border-b border-ash bg-smoke/35">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-ember font-semibold">Person History</p>
                      <h2 className="font-display text-2xl text-bone mt-1">{selectedVisitor.name}</h2>
                      <p className="text-sm text-bone/55 mt-1">
                        {selectedVisitor.sessionCount} sessions over {compactDuration(selectedVisitor.totalDurationSeconds)}.
                      </p>
                    </div>
                    <Badge className="w-fit">
                      <ShieldCheck size={13} />
                      Human confidence {selectedVisitor.humanScore}%
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-5">
                    <Info icon={Smartphone} label="Device" value={`${selectedVisitor.device.deviceType} / ${selectedVisitor.device.os} / ${selectedVisitor.device.browser}`} />
                    <Info icon={Globe2} label="Location" value={locationLabel(selectedVisitor)} />
                    <Info icon={Clock} label="First seen" value={new Date(selectedVisitor.firstSeen).toLocaleString()} />
                    <Info icon={Activity} label="Total activity" value={`${selectedVisitor.pageViews} views / ${selectedVisitor.clicks} taps`} />
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_260px] gap-4 p-4 md:p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-bone mb-3">Whole history</h3>
                    <Timeline items={(selectedJourney || []).slice(0, 36)} />
                  </div>
                  <div className="space-y-3">
                    <Detail label="Sources" value={selectedVisitor.sources.join(", ")} />
                    <Detail label="Pages touched" value={selectedVisitor.pages.join(", ")} />
                    <Detail label="Network" value={selectedVisitor.geo?.isp || "Unknown network"} />
                    <Detail label="IP" value={selectedVisitor.ip} />
                    <Detail label="Human signals" value={selectedVisitor.humanSignals.join(", ")} />
                  </div>
                </div>
              </article>
            )}

            {selectedSession && (
              <article className="surface-2 border border-ash rounded-lg p-4 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-ember font-semibold">Selected Session</p>
                    <h3 className="font-display text-xl text-bone mt-1">
                      {selectedSession.entryPage} to {selectedSession.lastPage}
                    </h3>
                    <p className="text-sm text-bone/50 mt-1">
                      {new Date(selectedSession.firstSeen).toLocaleString()} / {compactDuration(selectedSession.durationSeconds)}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {selectedSession.device.deviceType}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-2 mt-4">
                  <Detail label="Source" value={selectedSession.source} />
                  <Detail label="Activity" value={`${selectedSession.pageViews} page views, ${selectedSession.clicks} taps, ${selectedSession.eventCount} signals`} />
                  <Detail label="Browser" value={`${selectedSession.device.browser} on ${selectedSession.device.os}`} />
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-bone mb-3">Session steps</h4>
                  <Timeline
                    items={selectedSession.timeline.map((item) => ({
                      at: item.at,
                      sentence: item.sentence,
                      path: item.path,
                      sessionId: selectedSession.sessionId,
                    }))}
                  />
                </div>
              </article>
            )}
          </section>

          <aside className="space-y-4">
            <BreakdownPanel title="Top pages" icon={BarChart3} items={report.breakdowns.pages} />
            <BreakdownPanel title="Sources" icon={Globe2} items={report.breakdowns.sources} />
            <BreakdownPanel title="Devices" icon={Laptop} items={report.breakdowns.devices} />
            <DailyPanel days={report.breakdowns.days} />
          </aside>
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

function Segmented({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="grid grid-cols-2 h-11 rounded-md border border-ash bg-smoke/60 p-1">
      {(["people", "sessions"] as ViewMode[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "px-3 rounded text-xs uppercase tracking-[0.16em] transition-colors",
            value === item ? "bg-ember text-ink font-bold" : "text-bone/55 hover:text-bone",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[][]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full md:w-[150px] rounded-md border border-ash bg-smoke/60 px-3 text-sm text-bone outline-none focus:border-ember"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-ink text-bone">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function PanelTitle({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-ember" />
        <p className="text-xs uppercase tracking-[0.18em] text-bone/55">{title}</p>
      </div>
      <p className="text-[11px] text-bone/35">{detail}</p>
    </div>
  )
}

function VisitorButton({
  visitor,
  active,
  onClick,
  now,
}: {
  visitor: VisitorSummary
  active: boolean
  onClick: () => void
  now: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left surface-2 border rounded-lg p-3 transition-all",
        active ? "border-ember/70 bg-ember/8" : "border-ash hover:border-ember/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-bone truncate">{visitor.name}</p>
          <p className="text-xs text-bone/50 mt-0.5 truncate">
            {visitor.sessionCount} sessions / {visitor.sources[0] || "Unknown source"}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] px-2 py-0">
          {visitor.humanScore}%
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-bone/40">
        <span>{visitor.device.deviceType}</span>
        <span>{compactDuration(visitor.totalDurationSeconds)}</span>
        <span>{relativeTime(visitor.lastSeen, now)}</span>
      </div>
    </button>
  )
}

function SessionButton({
  session,
  active,
  onClick,
  now,
}: {
  session: SessionSummary
  active: boolean
  onClick: () => void
  now: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left surface-2 border rounded-lg p-3 transition-all",
        active ? "border-ember/70 bg-ember/8" : "border-ash hover:border-ember/35",
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
        <span>{relativeTime(session.lastSeen, now)}</span>
      </div>
    </button>
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

function Timeline({ items }: { items: Array<{ at: string; sentence: string; path: string; sessionId: string }> }) {
  if (!items.length) {
    return <p className="text-sm text-bone/45">No readable actions in this range yet.</p>
  }

  return (
    <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-ash">
      {items.map((item, index) => (
        <li key={`${item.at}-${item.sessionId}-${index}`} className="relative pl-6">
          <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-ink border border-ember/60" />
          <p className="text-sm text-bone">{item.sentence}</p>
          <p className="text-[11px] text-bone/40 mt-0.5">
            {new Date(item.at).toLocaleString()} / {item.path.replace(/^\/els/, "") || "/"}
          </p>
        </li>
      ))}
    </ol>
  )
}

function BreakdownPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: typeof Activity
  items: Array<{ label: string; count: number }>
}) {
  const max = Math.max(1, ...items.map((item) => item.count))

  return (
    <section className="surface-2 border border-ash rounded-lg p-4">
      <PanelTitle icon={Icon} title={title} detail={`${items.length} tracked`} />
      <div className="space-y-3 mt-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-bone/70 truncate">{item.label}</span>
                <span className="text-bone/40">{item.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ash overflow-hidden">
                <div className="h-full bg-ember" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-bone/45">No data in this range.</p>
        )}
      </div>
    </section>
  )
}

function DailyPanel({ days }: { days: Array<{ label: string; sessions: number; actions: number }> }) {
  const max = Math.max(1, ...days.map((day) => day.sessions + day.actions))

  return (
    <section className="surface-2 border border-ash rounded-lg p-4">
      <PanelTitle icon={Sparkles} title="Daily pulse" detail={`${days.length} days`} />
      <div className="mt-4 flex items-end gap-1 h-24">
        {days.map((day) => {
          const value = day.sessions + day.actions
          return (
            <div key={day.label} className="flex-1 min-w-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-ember/80"
                title={`${day.label}: ${day.sessions} sessions, ${day.actions} actions`}
                style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="surface-2 border border-ash rounded-lg p-5 text-sm text-bone/55">
      No matching human activity for these filters.
    </div>
  )
}

function visitorName(session: SessionSummary) {
  if (session.user?.displayName) return session.user.displayName
  if (session.user?.username) return session.user.username
  return `${session.device.deviceType} visitor from ${locationLabel(session)}`
}

function locationLabel(entity: SessionSummary | VisitorSummary) {
  const parts = [entity.geo?.city, entity.geo?.region, entity.geo?.country].filter(Boolean)
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
