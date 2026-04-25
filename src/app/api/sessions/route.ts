import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { readSessionSummaries, storeAnalyticsEvent, type ClientAnalyticsEvent } from "@/lib/analytics/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClientAnalyticsEvent
    if (!body.sessionId || !body.eventId || !body.type) {
      return NextResponse.json({ error: "Missing analytics fields" }, { status: 400 })
    }

    await storeAnalyticsEvent({
      ...body,
      occurredAt: body.occurredAt || new Date().toISOString(),
      path: body.path || "/",
      data: sanitizeData(body.data),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Session analytics write failed:", error)
    return NextResponse.json({ error: "Failed to record session" }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!profile || !["owner", "officer"].includes(profile.platform_role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sessions = await readSessionSummaries()
  return NextResponse.json({ sessions, generatedAt: new Date().toISOString() })
}

function sanitizeData(data?: Record<string, unknown>) {
  if (!data) return {}
  const blocked = new Set(["password", "token", "secret", "value", "email"])
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !blocked.has(key.toLowerCase())),
  )
}
