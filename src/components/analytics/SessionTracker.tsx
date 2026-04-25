"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { apiPath } from "@/lib/paths"
import { pageLabel, type SessionEventType } from "@/lib/analytics/readable"

const ignoredPaths = ["/view-sessions"]

export function SessionTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const started = useRef(false)
  const sessionId = useRef("")
  const maxScroll = useRef(0)
  const lastHeartbeat = useRef(0)

  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = getSessionId()
    }
    lastHeartbeat.current = Date.now()
  }, [])

  useEffect(() => {
    if (!pathname || shouldIgnore(pathname)) return
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`

    if (!started.current) {
      started.current = true
      sendEvent("session_start", path, {
        referrer: document.referrer,
        title: document.title,
        language: navigator.language,
        languages: navigator.languages,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        touch: navigator.maxTouchPoints > 0,
        pointer: window.matchMedia("(pointer: coarse)").matches ? "touch" : "fine",
        cookies: navigator.cookieEnabled,
        visibility: document.visibilityState,
        platform: navigator.platform,
        page: pageLabel(pathname),
      })
    }

    maxScroll.current = 0
    sendEvent("page_view", path, {
      title: document.title,
      page: pageLabel(pathname),
    })
  }, [pathname, searchParams])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const interactive = target?.closest("a, button, [role='button'], input, select, textarea") as HTMLElement | null
      if (!interactive || shouldIgnore(window.location.pathname)) return

      sendEvent("click", currentPath(), {
        label: getElementLabel(interactive),
        element: interactive.tagName.toLowerCase(),
        page: pageLabel(window.location.pathname),
        pointer: window.matchMedia("(pointer: coarse)").matches ? "touch" : "mouse",
      })
    }

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null
      if (!form || shouldIgnore(window.location.pathname)) return

      sendEvent("form_submit", currentPath(), {
        label: getElementLabel(form) || `${pageLabel(window.location.pathname)} form`,
        page: pageLabel(window.location.pathname),
      })
    }

    const onScroll = () => {
      if (shouldIgnore(window.location.pathname)) return
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100))
      const milestone = [25, 50, 75, 90].find((value) => depth >= value && maxScroll.current < value)
      if (!milestone) return
      maxScroll.current = milestone
      sendEvent("scroll_depth", currentPath(), {
        depth: milestone,
        page: pageLabel(window.location.pathname),
      })
    }

    const onVisibility = () => {
      if (document.visibilityState !== "hidden" || shouldIgnore(window.location.pathname)) return
      const seconds = Math.round((Date.now() - lastHeartbeat.current) / 1000)
      sendEvent("visibility", currentPath(), {
        seconds,
        page: pageLabel(window.location.pathname),
      }, true)
    }

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible" && !shouldIgnore(window.location.pathname)) {
        lastHeartbeat.current = Date.now()
        sendEvent("heartbeat", currentPath(), {
          page: pageLabel(window.location.pathname),
        }, true)
      }
    }, 30000)

    document.addEventListener("click", onClick, { capture: true })
    document.addEventListener("submit", onSubmit, { capture: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener("click", onClick, { capture: true })
      document.removeEventListener("submit", onSubmit, { capture: true })
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return null

  function sendEvent(
    type: SessionEventType,
    path: string,
    data: Record<string, unknown>,
    beacon = false,
  ) {
    const payload = JSON.stringify({
      sessionId: sessionId.current || getSessionId(),
      eventId: crypto.randomUUID(),
      type,
      path,
      title: document.title,
      referrer: document.referrer,
      occurredAt: new Date().toISOString(),
      data,
    })

    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(apiPath("/sessions"), new Blob([payload], { type: "application/json" }))
      return
    }

    fetch(apiPath("/sessions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined)
  }
}

function getSessionId() {
  const key = "els_session_id"
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  sessionStorage.setItem(key, created)
  return created
}

function shouldIgnore(pathname: string) {
  const clean = pathname.replace(/^\/els(?=\/|$)/, "") || "/"
  return ignoredPaths.some((path) => clean === path || clean.startsWith(`${path}/`))
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`
}

function getElementLabel(element: HTMLElement) {
  const explicit = element.getAttribute("data-analytics-label") || element.getAttribute("aria-label")
  if (explicit) return explicit.trim()

  if (element instanceof HTMLInputElement) {
    return element.name ? `${element.name} field` : "input field"
  }

  const text = element.textContent?.replace(/\s+/g, " ").trim()
  if (text) return text.slice(0, 90)

  if (element instanceof HTMLAnchorElement) {
    return `link to ${pageLabel(element.pathname)}`
  }

  return ""
}
