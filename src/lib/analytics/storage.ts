import "server-only"

import { promises as fs } from "fs"
import path from "path"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { describeEvent, pageLabel, sourceLabel, type SessionEventType } from "./readable"

export interface ClientAnalyticsEvent {
  sessionId: string
  eventId: string
  type: SessionEventType
  path: string
  title?: string
  occurredAt: string
  referrer?: string
  data?: Record<string, unknown>
}

export interface StoredAnalyticsEvent extends ClientAnalyticsEvent {
  receivedAt: string
  ip: string
  userAgent: string
  bot: boolean
  humanScore: number
  humanSignals: string[]
  device: DeviceInfo
  geo?: GeoInfo | null
  user?: SessionUser | null
  sentence: string
}

export interface DeviceInfo {
  browser: string
  os: string
  deviceType: "Phone" | "Tablet" | "Desktop"
  isTouch: boolean
}

export interface GeoInfo {
  city?: string
  region?: string
  country?: string
  isp?: string
  timezone?: string
  mobile?: boolean
  proxy?: boolean
  hosting?: boolean
}

export interface SessionUser {
  authUserId: string
  profileId?: string
  username?: string
  displayName?: string | null
  role?: string
}

export interface SessionSummary {
  sessionId: string
  firstSeen: string
  lastSeen: string
  durationSeconds: number
  eventCount: number
  pageViews: number
  clicks: number
  source: string
  entryPage: string
  lastPage: string
  ip: string
  geo?: GeoInfo | null
  userAgent: string
  device: DeviceInfo
  user?: SessionUser | null
  humanScore: number
  humanSignals: string[]
  bot: boolean
  timeline: Array<{
    at: string
    type: SessionEventType
    sentence: string
    path: string
  }>
}

const analyticsDir = process.env.ANALYTICS_DATA_DIR || path.join(process.cwd(), ".data")
const eventsFile = path.join(analyticsDir, "session-events.jsonl")

export async function storeAnalyticsEvent(event: ClientAnalyticsEvent) {
  const headerStore = await headers()
  const ip = getClientIp(headerStore)
  const userAgent = headerStore.get("user-agent") || "Unknown"
  const device = parseDevice(userAgent, event.data)
  const bot = isLikelyBot(userAgent)
  const humanSignals = getHumanSignals(event, device)
  const humanScore = getHumanScore(event, humanSignals, bot)
  const enrichedData = {
    ...(event.data || {}),
    page: pageLabel(event.path),
  }

  const stored: StoredAnalyticsEvent = {
    ...event,
    path: event.path || "/",
    data: enrichedData,
    receivedAt: new Date().toISOString(),
    ip,
    userAgent,
    bot,
    humanScore,
    humanSignals,
    device,
    geo: event.type === "session_start" ? await lookupGeo(ip) : null,
    user: await getCurrentUser(),
    sentence: describeEvent(event.type, enrichedData),
  }

  await fs.mkdir(analyticsDir, { recursive: true })
  await fs.appendFile(eventsFile, `${JSON.stringify(stored)}\n`, "utf8")
  return stored
}

export async function readSessionSummaries(limit = 80): Promise<SessionSummary[]> {
  const events = await readEvents()
  const sessions = new Map<string, SessionSummary>()

  for (const event of events) {
    const existing = sessions.get(event.sessionId)
    const at = event.occurredAt || event.receivedAt

    if (!existing) {
      sessions.set(event.sessionId, {
        sessionId: event.sessionId,
        firstSeen: at,
        lastSeen: at,
        durationSeconds: 0,
        eventCount: 0,
        pageViews: 0,
        clicks: 0,
        source: sourceLabel(event.referrer),
        entryPage: pageLabel(event.path),
        lastPage: pageLabel(event.path),
        ip: event.ip,
        geo: event.geo,
        userAgent: event.userAgent,
        device: event.device,
        user: event.user,
        humanScore: event.humanScore,
        humanSignals: event.humanSignals,
        bot: event.bot,
        timeline: [],
      })
    }

    const summary = sessions.get(event.sessionId)!
    summary.lastSeen = at > summary.lastSeen ? at : summary.lastSeen
    summary.firstSeen = at < summary.firstSeen ? at : summary.firstSeen
    summary.eventCount += 1
    summary.humanScore = Math.max(summary.humanScore, event.humanScore)
    summary.humanSignals = Array.from(new Set([...summary.humanSignals, ...event.humanSignals]))
    summary.bot = summary.bot && event.bot
    summary.geo = summary.geo || event.geo
    summary.user = summary.user || event.user
    summary.ip = event.ip || summary.ip
    summary.userAgent = event.userAgent || summary.userAgent
    summary.device = event.device || summary.device

    if (event.type === "page_view") {
      summary.pageViews += 1
      summary.lastPage = pageLabel(event.path)
    }
    if (event.type === "click") summary.clicks += 1

    if (event.type !== "heartbeat") {
      summary.timeline.push({
        at,
        type: event.type,
        sentence: event.sentence,
        path: event.path,
      })
    }
  }

  return Array.from(sessions.values())
    .map((session) => ({
      ...session,
      durationSeconds: Math.max(
        1,
        Math.round((new Date(session.lastSeen).getTime() - new Date(session.firstSeen).getTime()) / 1000),
      ),
      timeline: session.timeline
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 18),
    }))
    .filter((session) => !session.bot && session.humanScore >= 35)
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, limit)
}

async function readEvents() {
  try {
    const content = await fs.readFile(eventsFile, "utf8")
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as StoredAnalyticsEvent)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, platform_role")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    return {
      authUserId: user.id,
      profileId: profile?.id,
      username: profile?.username || user.email || undefined,
      displayName: profile?.display_name,
      role: profile?.platform_role,
    }
  } catch {
    return null
  }
}

async function lookupGeo(ip: string): Promise<GeoInfo | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return null
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,timezone,mobile,proxy,hosting`,
      { next: { revalidate: 60 * 60 * 24 } },
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== "success") return null
    return {
      city: data.city,
      region: data.regionName,
      country: data.country,
      isp: data.isp,
      timezone: data.timezone,
      mobile: data.mobile,
      proxy: data.proxy,
      hosting: data.hosting,
    }
  } catch {
    return null
  }
}

function getClientIp(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return headerStore.get("x-real-ip") || "Unknown"
}

function parseDevice(userAgent: string, data?: Record<string, unknown>): DeviceInfo {
  const ua = userAgent.toLowerCase()
  const isTablet = /ipad|tablet/.test(ua)
  const isPhone = /iphone|android.*mobile|mobile/.test(ua) && !isTablet
  const isTouch = Boolean(data?.touch) || isPhone || isTablet

  let browser = "Unknown browser"
  if (ua.includes("crios") || ua.includes("chrome")) browser = "Chrome"
  else if (ua.includes("safari")) browser = "Safari"
  else if (ua.includes("firefox")) browser = "Firefox"
  else if (ua.includes("edg")) browser = "Edge"

  let os = "Unknown OS"
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS"
  else if (ua.includes("android")) os = "Android"
  else if (ua.includes("windows")) os = "Windows"
  else if (ua.includes("mac os")) os = "macOS"
  else if (ua.includes("linux")) os = "Linux"

  return {
    browser,
    os,
    deviceType: isTablet ? "Tablet" : isPhone ? "Phone" : "Desktop",
    isTouch,
  }
}

function isLikelyBot(userAgent: string) {
  return /bot|crawler|spider|preview|facebookexternalhit|slurp|bing|curl|wget|python|headless|lighthouse/i.test(userAgent)
}

function getHumanSignals(event: ClientAnalyticsEvent, device: DeviceInfo) {
  const signals = ["JavaScript executed"]
  if (device.isTouch) signals.push("touch-capable device")
  if (event.data?.cookies) signals.push("cookies available")
  if (event.data?.visibility === "visible") signals.push("visible browser tab")
  if (typeof event.data?.pointer === "string") signals.push(`${event.data.pointer} pointer`)
  if (event.type === "click" || event.type === "form_submit") signals.push("direct interaction")
  if (event.type === "scroll_depth") signals.push("natural scrolling")
  return Array.from(new Set(signals))
}

function getHumanScore(event: ClientAnalyticsEvent, signals: string[], bot: boolean) {
  if (bot) return 0
  let score = 25 + signals.length * 10
  if (event.type === "click") score += 20
  if (event.type === "form_submit") score += 25
  if (event.type === "scroll_depth") score += 15
  return Math.min(100, score)
}
