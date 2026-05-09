import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Upload status endpoint.
 *
 * Anyone (not just officers) can poll this to see how an in-flight OCR
 * upload is going. The data is derived purely from existing tables:
 *   - `events.status` flips from 'processing' → 'published' when the OCR
 *     route finishes its loop.
 *   - `event_screenshots.ocr_status` is set per-screenshot as Gemini
 *     returns rows. We count `done` vs total to derive progress.
 *   - `review_queue` count surfaces how many ambiguous matches are waiting.
 *
 * The OCR route runs entirely server-side; whether the original uploader
 * is still on the page or not, processing continues, and the DB state is
 * the source of truth. The client uses this endpoint to recover from a
 * dropped streaming connection (phone screen sleep, app background, tab
 * switch, etc.) without any extra plumbing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, title, status, event_type_code, created_at, updated_at")
      .eq("id", eventId)
      .maybeSingle()
    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }
    if (!ev) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Screenshot progress — done vs total.
    const { data: shots } = await admin
      .from("event_screenshots")
      .select("ocr_status")
      .eq("event_id", eventId)
    const total = shots?.length ?? 0
    const done = (shots ?? []).filter((s) => s.ocr_status === "done").length
    const failed = (shots ?? []).filter((s) => s.ocr_status === "failed").length

    // Score count + review-queue depth.
    const [{ count: scoresCount }, { count: queueCount }] = await Promise.all([
      admin
        .from("event_scores")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      admin
        .from("review_queue")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .is("resolution", null),
    ])

    return NextResponse.json({
      eventId: ev.id,
      title: ev.title,
      status: ev.status,
      eventTypeCode: ev.event_type_code,
      screenshotsTotal: total,
      screenshotsDone: done,
      screenshotsFailed: failed,
      scoresWritten: scoresCount ?? 0,
      reviewQueuePending: queueCount ?? 0,
      createdAt: ev.created_at,
      updatedAt: ev.updated_at,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    )
  }
}
