export type SessionEventType =
  | "session_start"
  | "page_view"
  | "click"
  | "form_submit"
  | "scroll_depth"
  | "visibility"
  | "heartbeat"

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

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/members": "Members",
  "/events": "Events",
  "/honor": "Honor Wall",
  "/tracking": "Tracking",
  "/social": "Social",
  "/signup": "Sign Up",
  "/login": "Login",
  "/admin/roster": "Admin Roster",
  "/admin/requests": "Account Requests",
  "/view-sessions": "Session Viewer",
}

export function normalizePath(pathname: string) {
  if (!pathname) return "/"
  const clean = pathname.replace(/^\/els(?=\/|$)/, "") || "/"
  return clean.split("?")[0] || "/"
}

export function pageLabel(pathname: string) {
  const clean = normalizePath(pathname)
  if (pageNames[clean]) return pageNames[clean]
  if (clean.startsWith("/events/")) return "Event Details"
  if (clean.startsWith("/members/")) return "Member Profile"
  if (clean.startsWith("/admin/")) return "Admin Area"

  return clean
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ") || "Dashboard"
}

export function sourceLabel(referrer?: string | null) {
  if (!referrer) return "Direct visit"

  try {
    const url = new URL(referrer)
    const host = url.hostname.replace(/^www\./, "")
    if (host.includes("redweyne.com")) return "Internal navigation"
    if (host.includes("google.")) return "Google"
    if (host.includes("discord.")) return "Discord"
    if (host.includes("facebook.") || host.includes("messenger.")) return "Facebook"
    if (host.includes("instagram.")) return "Instagram"
    if (host.includes("t.co") || host.includes("x.com") || host.includes("twitter.")) return "X / Twitter"
    return host
  } catch {
    return "Unknown source"
  }
}

export function describeEvent(type: SessionEventType, data: Record<string, unknown> = {}) {
  const page = typeof data.page === "string" ? data.page : undefined
  const label = typeof data.label === "string" ? data.label : undefined
  const depth = typeof data.depth === "number" ? data.depth : undefined
  const seconds = typeof data.seconds === "number" ? data.seconds : undefined

  if (type === "session_start") return "Arrived on the website"
  if (type === "page_view") return `Opened ${page || "a page"}`
  if (type === "click") return `Tapped ${label || "an interactive control"}`
  if (type === "form_submit") return `Submitted ${label || "a form"}`
  if (type === "scroll_depth") return `Read about ${depth || 0}% of ${page || "the page"}`
  if (type === "visibility") {
    return seconds ? `Spent about ${seconds} seconds before leaving the tab` : "Left the tab"
  }
  if (type === "heartbeat") return "Stayed active on the page"
  return "Used the website"
}

export function compactDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.max(1, Math.round(totalSeconds))} sec`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
