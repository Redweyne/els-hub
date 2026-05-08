import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Start a Governor's War campaign.
 *
 * The officer picks the day-type of TODAY (not Day 1) — the server back-solves
 * the implicit Day-1 anchor so that the schedule utility lands on that
 * day-type for today's 02:00 Paris boundary. There is no fixed end date —
 * the campaign runs until the officer presses "End Campaign".
 *
 * Body: {
 *   title: string
 *   today_cycle: "war" | "hegemony"
 *   today_day_in_cycle: 1..5
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: string
      today_cycle?: "war" | "hegemony"
      today_day_in_cycle?: number
    }
    const title = (body.title ?? "").trim()
    const cycle = body.today_cycle
    const dayInCycle = body.today_day_in_cycle

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (cycle !== "war" && cycle !== "hegemony") {
      return NextResponse.json({ error: "today_cycle must be 'war' or 'hegemony'" }, { status: 400 })
    }
    if (
      typeof dayInCycle !== "number" ||
      dayInCycle < 1 ||
      dayInCycle > 5 ||
      !Number.isInteger(dayInCycle)
    ) {
      return NextResponse.json({ error: "today_day_in_cycle must be 1–5" }, { status: 400 })
    }

    // Authenticate the officer using the SSR cookie session.
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // No-op — this route doesn't refresh cookies.
          },
        },
      },
    )
    const {
      data: { user },
    } = await ssrClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Use the service-role client for everything below so RLS doesn't bite.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, faction_id, platform_role")
      .eq("auth_user_id", user.id)
      .single()
    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    }
    if (!["owner", "officer"].includes(profile.platform_role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Compute the implicit Day-1 anchor (02:00 Paris) such that today's
    // 02:00 Paris boundary lands on the picked (cycle, day_in_cycle).
    //
    // dayOffset_today = (cycle === 'war' ? 0 : 5) + (day_in_cycle - 1)
    // start_date_iso = todayAnchor - dayOffset_today days
    const todayAnchor = parisAnchorForToday()
    const dayOffsetToday =
      (cycle === "war" ? 0 : 5) + (dayInCycle - 1)
    const startDate = new Date(
      todayAnchor.getTime() - dayOffsetToday * 24 * 60 * 60 * 1000,
    )

    const meta = {
      start_date_iso: startDate.toISOString(),
      tz: "Europe/Paris" as const,
      ended_at_iso: null as string | null,
    }

    // Close any other ACTIVE campaign for the same faction first — we only
    // ever want one active campaign at a time. This silently no-ops when
    // there isn't one.
    await admin
      .from("events")
      .update({ status: "published" })
      .eq("faction_id", profile.faction_id)
      .eq("event_type_code", "gw_campaign")
      .eq("status", "processing")

    const { data: inserted, error: insertErr } = await admin
      .from("events")
      .insert({
        faction_id: profile.faction_id,
        event_type_code: "gw_campaign",
        title,
        status: "processing",
        starts_at: startDate.toISOString(),
        ends_at: null,
        meta_json: meta,
        created_by: profile.id,
      })
      .select("id")
      .single()
    if (insertErr || !inserted) {
      console.error("[campaigns/start] insert error:", insertErr)
      return NextResponse.json(
        { error: insertErr?.message ?? "Insert failed" },
        { status: 500 },
      )
    }

    return NextResponse.json({ id: inserted.id })
  } catch (err) {
    console.error("[campaigns/start] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}

/**
 * Compute the most recent 02:00 Paris boundary at-or-before "now".
 * If now is before 02:00 Paris of today, returns yesterday's 02:00.
 */
function parisAnchorForToday(): Date {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const y = Number(map.year)
  const mo = Number(map.month)
  const d = Number(map.day)
  const h = Number(map.hour === "24" ? "0" : map.hour)

  // Build a UTC instant that, when formatted in Paris, reads as `y-mo-d 02:00`.
  // Iterate to handle DST (≤ 3 iterations is plenty).
  let utc = new Date(Date.UTC(y, mo - 1, d, 2, 0, 0))
  for (let i = 0; i < 3; i++) {
    const f = fmt.formatToParts(utc)
    const m: Record<string, string> = {}
    for (const p of f) m[p.type] = p.value
    const yy = Number(m.year)
    const mm = Number(m.month)
    const dd = Number(m.day)
    const hh = Number(m.hour === "24" ? "0" : m.hour)
    const desired = y * 525600 + mo * 43200 + d * 1440 + 2 * 60
    const actual = yy * 525600 + mm * 43200 + dd * 1440 + hh * 60
    const diff = desired - actual
    if (diff === 0) break
    utc = new Date(utc.getTime() + diff * 60_000)
  }

  // If "now" is before today's 02:00 Paris → step back a day.
  if (h < 2) {
    utc = new Date(utc.getTime() - 24 * 60 * 60 * 1000)
  }
  return utc
}
