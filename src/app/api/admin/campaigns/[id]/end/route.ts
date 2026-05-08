import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * End an active GW campaign.
 *
 * Sets `status = 'published'` (the campaign rolls into the archive) and writes
 * `meta_json.ended_at_iso = now`. Daily children are unaffected — they remain
 * in their own state.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Authenticate via SSR cookies.
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

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: profile } = await admin
      .from("profiles")
      .select("faction_id, platform_role")
      .eq("auth_user_id", user.id)
      .single()
    if (!profile || !["owner", "officer"].includes(profile.platform_role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify the campaign belongs to the faction.
    const { data: campaign, error: fetchErr } = await admin
      .from("events")
      .select("id, faction_id, event_type_code, meta_json, status")
      .eq("id", id)
      .single()
    if (fetchErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }
    if (campaign.faction_id !== profile.faction_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (campaign.event_type_code !== "gw_campaign") {
      return NextResponse.json({ error: "Not a GW campaign" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const meta = {
      ...((campaign.meta_json as Record<string, unknown>) ?? {}),
      ended_at_iso: now,
    }
    const { error: updErr } = await admin
      .from("events")
      .update({
        status: "published",
        ends_at: now,
        meta_json: meta,
      })
      .eq("id", id)
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
