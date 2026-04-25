import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Use admin client for all operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the account request
    const { data: request, error: requestError } = await adminClient
      .from("account_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (requestError || !request) {
      console.error("Request lookup error:", requestError, "ID:", id)
      return NextResponse.json(
        { error: `Request not found: ${requestError?.message || "no data"}` },
        { status: 404 }
      )
    }

    console.log("Found request:", request.id, request.username_requested)

    // Get faction to determine email domain
    const { data: faction } = await adminClient
      .from("factions")
      .select("tag")
      .eq("id", request.faction_id)
      .single()

    // Generate email based on faction (lowercase, no spaces)
    const emailDomain = faction?.tag === "ELS" ? "els.com" : "guest.com"
    const email = `${request.username_requested}@${emailDomain}`.toLowerCase()

    // Create auth user with username and password (password_hash contains the plain password temporarily)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: request.password_hash,
      user_metadata: {
        username: request.username_requested,
      },
    })

    if (authError) {
      console.error("Auth creation error:", authError)
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      )
    }

    // Create profile row linking to member
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        auth_user_id: authData.user.id,
        faction_id: request.faction_id,
        username: request.username_requested,
        platform_role: "member",
        status: "active",
        linked_member_id: request.claimed_member_id,
      })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json(
        { error: "Failed to create member profile" },
        { status: 500 }
      )
    }

    // Update member to mark as claimed
    await adminClient
      .from("members")
      .update({ claimed_by_profile_id: authData.user.id })
      .eq("id", request.claimed_member_id)

    // Mark account request as approved
    await adminClient
      .from("account_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)

    // Write audit log
    await adminClient.from("audit_log").insert({
      faction_id: request.faction_id,
      action: "approved_account_request",
      target_table: "account_requests",
      target_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approval error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
