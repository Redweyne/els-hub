import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await adminClient
      .from("account_requests")
      .select(
        `
        id,
        claimed_member_id,
        username_requested,
        extracted_player_id,
        extracted_name,
        extracted_vip_level,
        status,
        submitted_at,
        ip_address,
        recovery_email,
        members(canonical_name, rank_tier, influence)
      `
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to load requests" },
        { status: 500 }
      )
    }

    const requests = (data || []).map((r: any) => ({
      id: r.id,
      claimed_member_id: r.claimed_member_id,
      username_requested: r.username_requested,
      extracted_player_id: r.extracted_player_id,
      extracted_name: r.extracted_name,
      extracted_vip_level: r.extracted_vip_level,
      status: r.status,
      submitted_at: r.submitted_at,
      ip_address: r.ip_address,
      recovery_email: r.recovery_email,
      member: r.members?.[0] || null,
    }))

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
