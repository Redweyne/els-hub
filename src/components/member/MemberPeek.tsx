"use client"

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ChevronRight, X } from "lucide-react"
import { MemberAvatar } from "./MemberAvatar"
import { SparkLine, DeltaArrow } from "@/components/dataviz"
import { Eyebrow, Numeric } from "@/components/typography"
import { cn } from "@/lib/cn"

interface PeekData {
  id: string
  name: string
  tier: string | null
  familyRole: string | null
  influence: number | null
  recentRanks: number[]
  rankDelta: number | null
  active: boolean
  lastEventTitle?: string
  lastEventId?: string
}

interface PeekContextValue {
  open: (memberId: string, fallbackName?: string, fallbackTier?: string | null) => void
  close: () => void
}

import { createContext, useContext } from "react"
const PeekContext = createContext<PeekContextValue | null>(null)

/**
 * Provider wraps the app and exposes `useMemberPeek().open(memberId)` to any
 * descendant. The peek sheet renders at the bottom of the screen on mobile,
 * springs in over 220ms, and auto-fetches member data on first open.
 *
 * Mobile: bottom sheet, swipe-down to dismiss. Tablet+: same sheet anchored
 * to the bottom. No external deps.
 */
export function MemberPeekProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [fallback, setFallback] = useState<{ name?: string; tier?: string | null }>({})
  const [data, setData] = useState<PeekData | null>(null)
  const [loading, setLoading] = useState(false)
  const cache = useRef(new Map<string, PeekData>())
  const reducedMotion = useReducedMotion()
  const dragStart = useRef(0)

  const open = useCallback(
    (memberId: string, fallbackName?: string, fallbackTier?: string | null) => {
      setOpenId(memberId)
      setFallback({ name: fallbackName, tier: fallbackTier })
      setData(cache.current.get(memberId) ?? null)
    },
    [],
  )

  const close = useCallback(() => {
    setOpenId(null)
  }, [])

  // Lock body scroll when sheet is open.
  useEffect(() => {
    if (!openId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [openId])

  // Escape key dismisses.
  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openId, close])

  // Lazy-load on first open.
  useEffect(() => {
    if (!openId) return
    if (cache.current.has(openId)) {
      setData(cache.current.get(openId)!)
      return
    }
    let cancelled = false
    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    Promise.all([
      supabase
        .from("members")
        .select("id, canonical_name, rank_tier, family_role, influence")
        .eq("id", openId)
        .single(),
      supabase
        .from("event_scores")
        .select(
          "rank_value, points, created_at, events:event_id(id, title, event_type_code)",
        )
        .eq("member_id", openId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]).then(([memberRes, scoresRes]) => {
      if (cancelled) return
      if (!memberRes.data) {
        setLoading(false)
        return
      }
      const m = memberRes.data
      const recent = (scoresRes.data ?? []) as Array<{
        rank_value: number
        points: number
        created_at: string
        events:
          | { id: string; title: string; event_type_code: string | null }
          | Array<{ id: string; title: string; event_type_code: string | null }>
          | null
      }>
      const recentRanks = recent.map((r) => r.rank_value).reverse()
      let rankDelta: number | null = null
      if (recent.length >= 2) {
        const latest = recent[0]
        const ev0 = Array.isArray(latest.events) ? latest.events[0] : latest.events
        const prior = recent.find((r, i) => {
          if (i === 0) return false
          const evi = Array.isArray(r.events) ? r.events[0] : r.events
          return evi?.event_type_code === ev0?.event_type_code
        })
        if (prior) rankDelta = prior.rank_value - latest.rank_value
      }
      const now = Date.now()
      const active = recent.some(
        (r) => now - new Date(r.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
      )
      const ev0 = recent[0]
        ? Array.isArray(recent[0].events)
          ? recent[0].events[0]
          : recent[0].events
        : null
      const built: PeekData = {
        id: m.id,
        name: m.canonical_name,
        tier: m.rank_tier,
        familyRole: m.family_role,
        influence: m.influence,
        recentRanks,
        rankDelta,
        active,
        lastEventTitle: ev0?.title,
        lastEventId: ev0?.id,
      }
      cache.current.set(openId, built)
      setData(built)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [openId])

  const value: PeekContextValue = { open, close }

  return (
    <PeekContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {openId && (
          <motion.div
            key="peek-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] bg-ink/65 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden="true"
          />
        )}
        {openId && (
          <motion.div
            key="peek-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Member quick preview"
            initial={reducedMotion ? { y: 0, opacity: 0 } : { y: 320 }}
            animate={reducedMotion ? { y: 0, opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: 320 }}
            transition={
              reducedMotion
                ? { duration: 0.18 }
                : {
                    type: "spring",
                    damping: 32,
                    stiffness: 380,
                    mass: 0.8,
                  }
            }
            drag={reducedMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragStart={(_, info) => {
              dragStart.current = info.point.y
            }}
            onDragEnd={(_, info) => {
              const dy = info.point.y - dragStart.current
              if (dy > 100 || info.velocity.y > 600) close()
            }}
            className="fixed inset-x-0 bottom-0 z-[81] surface-3 rounded-t-2xl border-t border-ash"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            {/* Drag handle */}
            <div className="pt-2 pb-1 flex justify-center">
              <span className="block w-10 h-1 rounded-full bg-bone/30" aria-hidden="true" />
            </div>
            <div className="px-5 pb-2">
              <PeekContent
                data={data}
                fallbackName={fallback.name}
                fallbackTier={fallback.tier}
                loading={loading}
                onClose={close}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PeekContext.Provider>
  )
}

function PeekContent({
  data,
  fallbackName,
  fallbackTier,
  loading,
  onClose,
}: {
  data: PeekData | null
  fallbackName?: string
  fallbackTier?: string | null
  loading: boolean
  onClose: () => void
}) {
  const name = data?.name ?? fallbackName ?? "Loading…"
  const tier = data?.tier ?? fallbackTier ?? "frontliner"

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center gap-3">
        <MemberAvatar
          name={name}
          tier={tier}
          familyRole={data?.familyRole ?? null}
          size={56}
          active={data?.active ?? false}
          idScope="peek"
        />
        <div className="flex-1 min-w-0">
          <Eyebrow tone="ember" size="xs">
            {capitalize(tier ?? "")}
          </Eyebrow>
          <p
            className="font-display text-xl font-semibold text-bone truncate"
            title={name}
          >
            {name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-ink/60 border border-ash flex items-center justify-center text-bone/70 hover:text-bone hover:border-ember/40 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="h-16 rounded-lg bg-ash/30 animate-pulse" />
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <PeekStat label="Influence">
              {data.influence != null && data.influence > 0 ? (
                <Numeric
                  value={data.influence}
                  format="compact"
                  precision={1}
                  className="text-ember"
                  animateOnView={false}
                />
              ) : (
                <span className="text-bone/30">—</span>
              )}
            </PeekStat>
            <PeekStat label="Recent">
              {data.recentRanks.length > 0 ? (
                <SparkLine
                  data={data.recentRanks}
                  width={56}
                  height={22}
                  color="var(--ember-light)"
                  inverted
                  showLastDot
                  fill
                />
              ) : (
                <span className="text-bone/30">—</span>
              )}
            </PeekStat>
            <PeekStat label="Δ rank">
              {data.rankDelta != null && data.rankDelta !== 0 ? (
                <DeltaArrow
                  delta={data.rankDelta}
                  inverted
                  showValue
                  size={14}
                />
              ) : (
                <span className="text-bone/30">—</span>
              )}
            </PeekStat>
          </div>

          {data.lastEventTitle && data.lastEventId && (
            <Link
              href={`/events/${data.lastEventId}`}
              onClick={onClose}
              className="block surface-3 rounded-lg border border-ash px-3 py-2.5 hover:border-ember/40 transition-colors"
            >
              <Eyebrow tone="muted" size="xs">
                Last event
              </Eyebrow>
              <p className="text-sm text-bone font-semibold truncate mt-0.5">
                {data.lastEventTitle}
              </p>
            </Link>
          )}

          <Link
            href={`/members/${data.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-lg bg-ember text-ink font-bold text-sm uppercase tracking-[0.16em] active:scale-[0.98] transition-transform"
          >
            View profile
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </>
      ) : (
        <p className="text-bone/55 text-sm font-body py-4">
          Could not load member data.
        </p>
      )}
    </div>
  )
}

function PeekStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="surface-3 rounded-lg border border-ash p-2.5 text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-bone/45 font-body">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center font-mono font-bold text-base tabular-nums leading-none min-h-[24px]">
        {children}
      </div>
    </div>
  )
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/** Hook to call `open(memberId)` from anywhere inside <MemberPeekProvider>. */
export function useMemberPeek(): PeekContextValue {
  const ctx = useContext(PeekContext)
  // Provide a no-op fallback so consumers outside the provider don't crash.
  return (
    ctx ?? {
      open: () => {},
      close: () => {},
    }
  )
}

/**
 * Hook that wires long-press (mobile) + alt-click (desktop) to peek-open
 * a member. Returns spread-able event handlers for the target element.
 */
export function useLongPressPeek(
  memberId: string,
  fallbackName?: string,
  fallbackTier?: string | null,
  options?: { delay?: number },
): React.HTMLAttributes<HTMLElement> {
  const { open } = useMemberPeek()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const delay = options?.delay ?? 380

  const start = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    fired.current = false
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fired.current = true
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(8)
        }
      } catch {
        /* ignore */
      }
      open(memberId, fallbackName, fallbackTier)
      // Prevent the click that follows the long-press from navigating.
      if ("preventDefault" in e) {
        try {
          e.preventDefault()
        } catch {
          /* ignore */
        }
      }
    }, delay)
  }
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Allow alt+right-click to open peek on desktop; suppress browser menu.
      if (e.altKey || e.shiftKey) {
        e.preventDefault()
        open(memberId, fallbackName, fallbackTier)
      }
    },
    onClick: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
      }
    },
  }
}
