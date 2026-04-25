import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, player_id, player_name, faction_tag } = await req.json()

    if (!email || !username || !password || !player_id || !player_name || !faction_tag) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Get IP address
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown"

    // Get faction ID (use admin client to bypass RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ELS faction or GUEST faction
    const factionTag = faction_tag === "ELS" ? "ELS" : "GUEST"
    const { data: faction } = await adminClient
      .from("factions")
      .select("id")
      .eq("tag", factionTag)
      .single()

    if (!faction) {
      return NextResponse.json(
        { error: "Faction not found" },
        { status: 400 }
      )
    }

    // Determine role based on faction
    const platform_role = faction_tag === "ELS" ? "member" : "guest"

    // Create account request with status pending (password held temporarily for approval)
    const { error } = await adminClient.from("account_requests").insert({
      faction_id: faction.id,
      username_requested: username,
      password_hash: password,
      extracted_player_id: BigInt(player_id),
      extracted_name: player_name,
      ip_address: ip,
      status: "pending",
      submitted_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: `Failed to create account request: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
