import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { buildRecapPrompt, type RecapInput } from "@/lib/intelligence/recapPrompt"
import {
  getEventConfig,
  type EventTypeCode,
  type GWDailyMeta,
  type OakReportCard,
} from "@/lib/events/config"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * AI event recap.
 *
 * - GET  → returns the cached recap markdown (public read).
 * - POST → re-generates the recap via Gemini (officer/owner only).
 *
 * Result is cached in `events.meta_json.recap_md` so each call to GET is
 * a single Postgres lookup. POST always re-fetches the event's structured
 * data, calls Gemini, and overwrites the cache.
 */

interface RecapPayload {
  recap_md: string | null
  generated_at: string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params
    const admin = adminClient()
    const { data: ev, error } = await admin
      .from("events")
      .select("id, meta_json, status")
      .eq("id", eventId)
      .single()
    if (error || !ev) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    const meta = (ev.meta_json ?? {}) as Record<string, unknown>
    const payload: RecapPayload = {
      recap_md: typeof meta.recap_md === "string" ? meta.recap_md : null,
      generated_at:
        typeof meta.recap_generated_at === "string"
          ? meta.recap_generated_at
          : null,
    }
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 503 },
    )
  }
  try {
    const { eventId } = await params

    // Auth: officer/owner only — recap costs a Gemini call, gate it.
    const cookieStore = await cookies()
    const ssr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )
    const {
      data: { user },
    } = await ssr.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const admin = adminClient()
    const { data: profile } = await admin
      .from("profiles")
      .select("faction_id, platform_role")
      .eq("auth_user_id", user.id)
      .maybeSingle()
    if (!profile || !["owner", "officer"].includes(profile.platform_role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch event + scores + members.
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select(
        "id, faction_id, title, event_type_code, created_at, meta_json, faction_result_json",
      )
      .eq("id", eventId)
      .single()
    if (evErr || !ev) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    if (ev.faction_id !== profile.faction_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const cfg = getEventConfig(ev.event_type_code)
    if (!cfg) {
      return NextResponse.json(
        { error: `Unknown event type: ${ev.event_type_code}` },
        { status: 400 },
      )
    }
    if (cfg.code === "gw_campaign") {
      return NextResponse.json(
        { error: "Recap not supported for campaign rows; use individual dailies." },
        { status: 400 },
      )
    }

    const { data: scores } = await admin
      .from("event_scores")
      .select(
        "rank_value, points, member_id, members:member_id(canonical_name)",
      )
      .eq("event_id", eventId)
      .order("points", { ascending: false })
    const scoreList = (scores ?? []).map((s) => {
      const m = Array.isArray(s.members) ? s.members[0] : s.members
      return {
        rank: s.rank_value,
        points: s.points,
        memberId: s.member_id,
        name: m?.canonical_name ?? "Unknown",
      }
    })

    // Compute biggest movers — climbing ranks vs the prior event of same type.
    const { data: prior } = await admin
      .from("events")
      .select("id, created_at")
      .eq("faction_id", profile.faction_id)
      .eq("event_type_code", ev.event_type_code)
      .eq("status", "published")
      .lt("created_at", ev.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const movers: Array<{ name: string; deltaRanks: number }> = []
    if (prior?.id) {
      const { data: priorScores } = await admin
        .from("event_scores")
        .select("rank_value, member_id")
        .eq("event_id", prior.id)
      const priorMap = new Map<string, number>()
      for (const p of priorScores ?? []) {
        priorMap.set(p.member_id, p.rank_value)
      }
      for (const s of scoreList) {
        const priorRank = priorMap.get(s.memberId)
        if (priorRank == null) continue
        const climb = priorRank - s.rank
        if (climb > 0) movers.push({ name: s.name, deltaRanks: climb })
      }
      movers.sort((a, b) => b.deltaRanks - a.deltaRanks)
    }

    // Build the recap prompt input.
    const totalPoints = scoreList.reduce((acc, s) => acc + s.points, 0)
    const recapInput: RecapInput = {
      eventTypeCode: cfg.code as EventTypeCode,
      title: ev.title,
      dateLabel: new Date(ev.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      totalScores: scoreList.length,
      totalPoints,
      topPerformers: scoreList.slice(0, 5).map((s) => ({
        name: s.name,
        rank: s.rank,
        points: s.points,
      })),
      topMovers: movers.slice(0, 3),
      gw: null,
      oak: null,
    }

    if (cfg.code === "gw_daily") {
      const meta = ev.meta_json as GWDailyMeta | null
      if (meta?.day_type) {
        const hits = scoreList.filter((s) => s.points >= meta.min_points).length
        recapInput.gw = {
          cycle: meta.cycle,
          day_type: meta.day_type,
          day_in_cycle: meta.day_in_cycle,
          threshold: meta.min_points,
          thresholdHits: hits,
        }
      }
    }
    if (cfg.code === "oak") {
      const card = ev.faction_result_json as OakReportCard | null
      if (card) {
        const heroes: Array<{ category: string; name: string; value: number }> = []
        for (const cat of ["total", "kill", "occupation"] as const) {
          const h = card.best_of_all?.[cat]
          if (h?.name) {
            heroes.push({ category: cat, name: h.name, value: h.value })
          }
        }
        recapInput.oak = {
          placement: card.placement ?? 0,
          classPoints: card.class_points ?? 0,
          classPointsDelta: card.class_points_delta ?? 0,
          bestOfAll: heroes,
        }
      }
    }

    const prompt = buildRecapPrompt(recapInput)
    const recapMd = await callGemini(prompt)
    if (!recapMd) {
      return NextResponse.json(
        { error: "Recap generation failed (Gemini returned empty)" },
        { status: 502 },
      )
    }

    const nextMeta = {
      ...((ev.meta_json as Record<string, unknown>) ?? {}),
      recap_md: recapMd,
      recap_generated_at: new Date().toISOString(),
    }
    const { error: updErr } = await admin
      .from("events")
      .update({ meta_json: nextMeta })
      .eq("id", eventId)
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      recap_md: recapMd,
      generated_at: nextMeta.recap_generated_at,
    } satisfies RecapPayload)
  } catch (err) {
    console.error("[recap POST] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}

// ─── helpers ────────────────────────────────────────────────────────────

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function callGemini(prompt: string): Promise<string | null> {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
  )
  url.searchParams.set("key", GEMINI_API_KEY!)

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => "")
    console.error("[recap] Gemini error", res.status, errorText)
    return null
  }
  const json = await res.json()
  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!text) return null
  return text.trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "")
}
