import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { canonicalAlias } from "@/lib/match/fuzzy"

/**
 * Resolve a single review-queue item.
 *
 * Body shape:
 *   {
 *     event_id: string,
 *     member_id: string | null,    // null when officer picks "New Member" / "Skip"
 *     ocr_row?: { rank, points, accept_current?, accept_max?, player_name? },
 *     resolution?: "matched" | "new_member" | "ignored"
 *   }
 *
 * Three resolution paths:
 *   - matched      → write event_scores row + add member alias
 *   - new_member   → create a NEW members row (auto), then write event_scores
 *                    + alias against that new member
 *   - ignored      → just mark the queue item as resolved, no DB writes elsewhere
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await req.json()) as {
      event_id?: string
      member_id?: string | null
      ocr_row?: {
        rank?: number
        points?: number
        accept_current?: number | null
        accept_max?: number | null
        player_name?: string
      }
      resolution?: "matched" | "new_member" | "ignored"
    }
    const { event_id, ocr_row } = body
    let { member_id } = body
    const requestedResolution = body.resolution

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Pull the queue item up front. We use raw_name for alias creation +
    // for naming the auto-created member when "new_member" is selected.
    const { data: reviewItem } = await adminClient
      .from("review_queue")
      .select("raw_name, event_id")
      .eq("id", id)
      .maybeSingle()

    // Look up the event's faction so we can scope a new member to it.
    const { data: eventRow } = await adminClient
      .from("events")
      .select("faction_id")
      .eq("id", event_id)
      .maybeSingle()
    const factionId = eventRow?.faction_id ?? null

    // Decide resolution type. If the caller explicitly passed one, honor it;
    // otherwise infer from whether they sent a member_id.
    const resolutionType: "matched" | "new_member" | "ignored" =
      requestedResolution ?? (member_id ? "matched" : "new_member")

    // ── NEW MEMBER PATH ──────────────────────────────────────────────────
    // Officer indicates the OCR'd row belongs to a member who isn't on the
    // roster yet. We auto-create the members row, then proceed exactly as
    // the "matched" path would.
    if (resolutionType === "new_member" && !member_id) {
      if (!factionId) {
        return NextResponse.json(
          { error: "Could not derive faction for new member" },
          { status: 500 },
        )
      }
      // Use the OCR'd raw name verbatim — preserves Unicode, decorations,
      // tags, even all-whitespace invisible names.
      const rawName =
        reviewItem?.raw_name ?? ocr_row?.player_name ?? ""
      // Strip the [ELS] tag if present, keep everything else as-is.
      const canonical = rawName.replace(/^\[[^\]]+\]\s*/, "")

      const { data: newMember, error: newMemberErr } = await adminClient
        .from("members")
        .insert({
          faction_id: factionId,
          canonical_name: canonical,
          rank_tier: "frontliner",
          is_active: true,
          joined_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (newMemberErr || !newMember) {
        console.error("[review/resolve] new member insert error:", newMemberErr)
        return NextResponse.json(
          { error: newMemberErr?.message ?? "Failed to create member" },
          { status: 500 },
        )
      }
      member_id = newMember.id
      // Also seed the alias map with both the canonical and the raw name
      // (when they differ) so future OCR finds this member instantly.
      const aliasesToSeed = Array.from(
        new Set(
          [canonicalAlias(rawName), canonicalAlias(canonical)].filter(
            (a) => a && a.length > 0,
          ),
        ),
      )
      if (aliasesToSeed.length > 0) {
        await adminClient.from("member_aliases").upsert(
          aliasesToSeed.map((alias) => ({
            member_id,
            alias,
            source: "manual",
            confidence: 1,
          })),
          { onConflict: "member_id,alias" },
        )
      }
    }

    // Update the queue row to reflect the resolution. Even an "ignored" row
    // gets stamped so the queue clears.
    const { error: updateError } = await adminClient
      .from("review_queue")
      .update({
        resolution: resolutionType,
        resolved_member_id: member_id || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("[review/resolve] queue update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update review queue" },
        { status: 500 },
      )
    }

    // ── MATCHED + NEW_MEMBER (after creation) PATH ───────────────────────
    if (member_id) {
      // Check if event_score already exists for this (event, member). It
      // can happen when an officer re-uploads the same screenshot batch.
      const { data: existing } = await adminClient
        .from("event_scores")
        .select("id")
        .eq("event_id", event_id)
        .eq("member_id", member_id)
        .maybeSingle()

      if (!existing && ocr_row?.rank != null && ocr_row?.points != null) {
        const { error: scoreError } = await adminClient
          .from("event_scores")
          .insert({
            event_id,
            member_id,
            rank_value: ocr_row.rank,
            points: ocr_row.points,
            accept_current: ocr_row.accept_current,
            accept_max: ocr_row.accept_max,
            raw_ocr_row_json: ocr_row,
          })
        if (scoreError) {
          console.error("[review/resolve] score insert error:", scoreError)
          return NextResponse.json(
            { error: "Failed to create event score" },
            { status: 500 },
          )
        }
      }

      // Save the alias so the member is auto-resolved next time.
      const alias = canonicalAlias(
        reviewItem?.raw_name ?? ocr_row?.player_name ?? "",
      )
      if (alias) {
        const { error: aliasError } = await adminClient
          .from("member_aliases")
          .upsert(
            {
              member_id,
              alias,
              source: "manual",
              confidence: 1,
            },
            { onConflict: "member_id,alias" },
          )
        if (aliasError) {
          console.error("[review/resolve] alias save error:", aliasError)
        }
      }
    }

    return NextResponse.json({ success: true, member_id })
  } catch (error) {
    console.error("[review/resolve] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
