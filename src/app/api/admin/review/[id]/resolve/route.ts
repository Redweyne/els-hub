import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { event_id, member_id, ocr_row, resolution } = await req.json()

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine resolution type
    let resolutionType = resolution || (member_id ? "matched" : "new_member")

    // Update review queue item
    const { error: updateError } = await adminClient
      .from("review_queue")
      .update({
        resolution: resolutionType,
        resolved_member_id: member_id || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Review queue update error:", updateError)
      return NextResponse.json({ error: "Failed to update review queue" }, { status: 500 })
    }

    // If matched, create or update event_scores
    if (member_id) {
      // Check if event_score already exists
      const { data: existing } = await adminClient
        .from("event_scores")
        .select("id")
        .eq("event_id", event_id)
        .eq("member_id", member_id)
        .single()

      if (existing) {
        // Already exists (auto-resolved), skip
        console.log("Event score already exists, skipping insert")
      } else {
        const { error: scoreError } = await adminClient.from("event_scores").insert({
          event_id,
          member_id,
          rank_value: ocr_row.rank,
          points: ocr_row.points,
          accept_current: ocr_row.accept_current,
          accept_max: ocr_row.accept_max,
          raw_ocr_row_json: ocr_row,
        })

        if (scoreError) {
          console.error("Event scores creation error:", scoreError)
          return NextResponse.json({ error: "Failed to create event score" }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Review resolution error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
