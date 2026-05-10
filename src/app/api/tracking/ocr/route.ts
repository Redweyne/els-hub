import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  autoResolveMatch,
  canonicalAlias,
  fuzzyMatch,
  isLikelyFactionMemberName,
  shouldSaveAlias,
  uniqueNameKey,
} from "@/lib/match/fuzzy"
import {
  isEventTypeCode,
  type EventTypeCode,
  type GWDailyMeta,
  type OakReportCard,
} from "@/lib/events/config"
import { formatGWDailyTitle } from "@/lib/gw/schedule"
import {
  getOcrPrompt,
  sanitizeOcrJson,
  type OcrPayload,
} from "@/lib/events/ocr-prompts"
import { ensureEventTypes } from "@/lib/events/seed"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * Tracking-OCR upload endpoint — fire-and-forget background processing.
 *
 * The client POSTs the screenshots, we synchronously:
 *   1. Validate inputs.
 *   2. Buffer the screenshot bytes (so we don't depend on the request body
 *      staying open).
 *   3. Create / reset the event row + pre-insert event_screenshots
 *      placeholders so the status endpoint can report total/done counts
 *      from the very first poll.
 *   4. Return `{ eventId, totalFiles }` to the client.
 *
 * The heavy work (Gemini OCR per screenshot, fuzzy match, score writes,
 * review-queue inserts, final publish) is dispatched as a detached promise
 * so that it CONTINUES even if the client disconnects — phone screen off,
 * tab switched, app backgrounded, network dropped. The DB is the source of
 * truth; the global UploadBanner + event detail page poll `/api/tracking/
 * status/[id]` to surface progress.
 *
 * This pattern relies on the Node process staying alive after the HTTP
 * response is returned, which the VPS deployment (persistent Node, not
 * serverless functions) guarantees.
 */
export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("[OCR] GEMINI_API_KEY is not set")
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      )
    }

    const formData = await req.formData()
    const screenshotFiles = formData.getAll("screenshots") as File[]
    const rawEventType = (formData.get("event_type") as string | null) ?? "fcu"
    const eventTitleInput = (formData.get("event_title") as string | null) ?? ""
    const factionId = formData.get("faction_id") as string
    const existingEventId = formData.get("event_id") as string | null

    const gwCampaignId = formData.get("gw_campaign_id") as string | null
    const gwCycle = formData.get("gw_cycle") as string | null
    const gwSuperCycle = formData.get("gw_super_cycle") as string | null
    const gwDayInCycle = formData.get("gw_day_in_cycle") as string | null
    const gwDayType = formData.get("gw_day_type") as string | null
    const gwMinPoints = formData.get("gw_min_points") as string | null
    const gwDeadlineIso = formData.get("gw_deadline_iso") as string | null

    if (!screenshotFiles || screenshotFiles.length === 0) {
      return NextResponse.json(
        { error: "No screenshots provided" },
        { status: 400 },
      )
    }
    if (!factionId) {
      return NextResponse.json({ error: "Missing faction_id" }, { status: 400 })
    }
    if (!existingEventId && !rawEventType) {
      return NextResponse.json(
        { error: "Missing event_type" },
        { status: 400 },
      )
    }
    if (!isEventTypeCode(rawEventType) || rawEventType === "gw_campaign") {
      return NextResponse.json(
        {
          error: `Invalid event_type: ${rawEventType}. Expected one of fcu, oak, gw_daily.`,
        },
        { status: 400 },
      )
    }
    const eventType: EventTypeCode = rawEventType

    // GW Daily requires campaign metadata for new events.
    let gwDailyMeta: GWDailyMeta | null = null
    if (eventType === "gw_daily" && !existingEventId) {
      if (
        !gwCampaignId ||
        !gwCycle ||
        !gwDayInCycle ||
        !gwDayType ||
        !gwMinPoints ||
        !gwDeadlineIso
      ) {
        return NextResponse.json(
          { error: "GW Daily requires campaign + day-type metadata." },
          { status: 400 },
        )
      }
      gwDailyMeta = {
        campaign_id: gwCampaignId,
        cycle: gwCycle as GWDailyMeta["cycle"],
        super_cycle: Number(gwSuperCycle) || 1,
        day_in_cycle: Number(gwDayInCycle) as GWDailyMeta["day_in_cycle"],
        day_type: gwDayType as GWDailyMeta["day_type"],
        min_points: Number(gwMinPoints),
        deadline_iso: gwDeadlineIso,
      }
    }

    // Buffer screenshots upfront so the background worker doesn't depend on
    // the request body staying open after we respond.
    const screenshots = await Promise.all(
      screenshotFiles.map(async (file, index) => ({
        index,
        name: file.name,
        type: file.type || "image/png",
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    )

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    let eventId: string

    if (existingEventId) {
      const { data: existingEvent, error: validateError } = await adminClient
        .from("events")
        .select("id, faction_id")
        .eq("id", existingEventId)
        .single()

      if (validateError || !existingEvent) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }
      if (existingEvent.faction_id !== factionId) {
        return NextResponse.json(
          { error: "Event does not belong to this faction" },
          { status: 403 },
        )
      }

      await adminClient.from("event_scores").delete().eq("event_id", existingEventId)
      await adminClient
        .from("review_queue")
        .delete()
        .eq("event_id", existingEventId)
        .is("resolution", null)
      // Wipe old screenshot placeholders too; we re-insert fresh ones below.
      await adminClient
        .from("event_screenshots")
        .delete()
        .eq("event_id", existingEventId)

      await adminClient
        .from("events")
        .update({ status: "processing" })
        .eq("id", existingEventId)

      eventId = existingEventId
    } else {
      const seed = await ensureEventTypes(adminClient)
      if (!seed.ok) {
        console.error("[OCR] event_types seed error:", seed.error)
        return NextResponse.json(
          { error: `Failed to ensure event_types: ${seed.error}` },
          { status: 500 },
        )
      }

      // GW Daily: enforce deterministic title + reject duplicates upfront so
      // officers can't accidentally create two "Massacre" rows for the same
      // (campaign, super-cycle, day-in-cycle).
      let resolvedTitle = eventTitleInput.trim()
      if (gwDailyMeta) {
        // Find any prior gw_daily for the same campaign + same slot.
        const { data: existingForSlot } = await adminClient
          .from("events")
          .select("id, title")
          .eq("faction_id", factionId)
          .eq("event_type_code", "gw_daily")
          .contains("meta_json", {
            campaign_id: gwDailyMeta.campaign_id,
            super_cycle: gwDailyMeta.super_cycle,
            day_in_cycle: gwDailyMeta.day_in_cycle,
            cycle: gwDailyMeta.cycle,
          })
          .limit(1)

        if (existingForSlot && existingForSlot.length > 0) {
          return NextResponse.json(
            {
              error: `A GW Daily for ${gwDailyMeta.cycle} day ${gwDailyMeta.day_in_cycle} (super-cycle ${gwDailyMeta.super_cycle}) already exists. Use "Update Existing" to replace it.`,
              code: "duplicate_gw_daily",
              existingEventId: existingForSlot[0].id,
            },
            { status: 409 },
          )
        }

        // Always overwrite the user-supplied title with the canonical one.
        resolvedTitle = formatGWDailyTitle(
          gwDailyMeta.day_type,
          gwDailyMeta.cycle,
          new Date(),
        )
      } else if (!resolvedTitle) {
        return NextResponse.json(
          { error: "Missing event_title" },
          { status: 400 },
        )
      }

      const newEventRow: Record<string, unknown> = {
        faction_id: factionId,
        event_type_code: eventType,
        title: resolvedTitle,
        status: "processing",
      }
      if (gwDailyMeta) {
        newEventRow.meta_json = gwDailyMeta
        newEventRow.starts_at = new Date().toISOString()
        newEventRow.ends_at = gwDailyMeta.deadline_iso
      }
      const { data: eventData, error: eventError } = await adminClient
        .from("events")
        .insert(newEventRow)
        .select("id")
        .single()

      if (eventError || !eventData) {
        console.error("[OCR] event insert error:", eventError)
        return NextResponse.json(
          { error: "Failed to create event" },
          { status: 500 },
        )
      }
      eventId = eventData.id
    }

    // Pre-insert event_screenshots placeholders so /status reports a real
    // "total" from the first poll. Status starts at "queued" and flips to
    // "done" or "failed" as the background worker chews through them.
    const placeholderRows = screenshots.map((s) => ({
      event_id: eventId,
      order_index: s.index,
      ocr_status: "queued" as const,
    }))
    const { data: placeholders, error: placeholderError } = await adminClient
      .from("event_screenshots")
      .insert(placeholderRows)
      .select("id, order_index")
    if (placeholderError) {
      console.error("[OCR] placeholder insert error:", placeholderError)
      return NextResponse.json(
        { error: "Failed to create screenshot placeholders" },
        { status: 500 },
      )
    }

    const idByIndex = new Map<number, string>()
    for (const p of placeholders ?? []) {
      idByIndex.set(p.order_index, p.id)
    }

    // Detached background work — survives client disconnect / phone sleep.
    // We `void` the promise: any error inside is caught + logged and the
    // worker marks failures in the DB so the UI can react.
    void processInBackground({
      adminClient,
      eventId,
      eventType,
      factionId,
      screenshots: screenshots.map((s) => ({
        ...s,
        screenshotId: idByIndex.get(s.index)!,
      })),
    }).catch((err) => {
      console.error("[OCR] background worker fatal error:", err)
    })

    return NextResponse.json({
      eventId,
      totalFiles: screenshots.length,
      status: "processing",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[OCR] handler error:", msg)
    return NextResponse.json(
      { error: `Server error: ${msg}` },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Background worker
// ─────────────────────────────────────────────────────────────────────────────

interface BufferedShot {
  index: number
  name: string
  type: string
  buffer: Buffer
  screenshotId: string
}

interface BackgroundJob {
  adminClient: SupabaseClient
  eventId: string
  eventType: EventTypeCode
  factionId: string
  screenshots: BufferedShot[]
}

async function processInBackground(job: BackgroundJob) {
  const { adminClient, eventId, eventType, factionId, screenshots } = job

  try {
    const { data: members, error: membersError } = await adminClient
      .from("members")
      .select("id, canonical_name, member_aliases(alias)")
      .eq("is_active", true)
      .eq("faction_id", factionId)

    if (membersError || !members) {
      console.error("[OCR/bg] members fetch error:", membersError)
      await adminClient
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId)
      return
    }

    const memberCandidates = members.map((m) => ({
      id: m.id,
      canonical_name: m.canonical_name,
      aliases: (m.member_aliases || []).map(
        (aliasRow: { alias: string }) => aliasRow.alias,
      ),
    }))
    const rosterHint = memberCandidates
      .map((member) => member.canonical_name)
      .join(", ")
    const ocrPrompt =
      getOcrPrompt(eventType) +
      `\n\nThe active ELS roster (use these exact spellings when a name clearly matches): ${rosterHint}`

    const allRows: Array<{
      rank: number
      player_name: string
      points: number
      accept_current: number | null
      accept_max: number | null
    }> = []
    const reviewQueueItems: Array<Record<string, unknown>> = []
    const autoAliasRows: Array<{
      member_id: string
      alias: string
      source: string
      confidence: number
    }> = []
    const seenRowKeys = new Set<string>()
    let oakHeaderAccumulator: OakReportCard | null = null

    for (const shot of screenshots) {
      await adminClient
        .from("event_screenshots")
        .update({ ocr_status: "processing" })
        .eq("id", shot.screenshotId)

      const base64 = shot.buffer.toString("base64")
      const url = new URL(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
      )
      url.searchParams.set("key", GEMINI_API_KEY!)

      const maxRetries = 3
      const baseDelay = 1000
      let geminiResponse: Response | null = null
      let lastErr: unknown = null

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          geminiResponse = await fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: ocrPrompt },
                    { inline_data: { mime_type: shot.type, data: base64 } },
                  ],
                },
              ],
            }),
          })
          if (geminiResponse.ok) break
          if (geminiResponse.status === 503 && attempt < maxRetries - 1) {
            await sleep(baseDelay * Math.pow(2, attempt))
            continue
          }
          const text = await geminiResponse.text()
          throw new Error(`Gemini ${geminiResponse.status}: ${text}`)
        } catch (err) {
          lastErr = err
          if (attempt < maxRetries - 1) {
            await sleep(baseDelay * Math.pow(2, attempt))
            continue
          }
        }
      }

      if (!geminiResponse || !geminiResponse.ok) {
        console.error(
          `[OCR/bg] Screenshot ${shot.index} failed permanently:`,
          lastErr,
        )
        await adminClient
          .from("event_screenshots")
          .update({ ocr_status: "failed" })
          .eq("id", shot.screenshotId)
        continue
      }

      const geminiData = await geminiResponse.json()
      const responseText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      const cleaned = sanitizeOcrJson(responseText)

      let payload: OcrPayload | null = null
      try {
        const sanitized = cleaned
          .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
          .replace(/([^\\])\\(?!["\\/bfnrtu])/g, "$1\\\\")
        payload = JSON.parse(sanitized) as OcrPayload
      } catch {
        try {
          const fallback = cleaned.replace(/\\[^"\\/bfnrtu]/g, "")
          payload = JSON.parse(fallback) as OcrPayload
        } catch (fallbackErr) {
          console.error("[OCR/bg] parse failed:", fallbackErr)
          await adminClient
            .from("event_screenshots")
            .update({ ocr_status: "failed" })
            .eq("id", shot.screenshotId)
          continue
        }
      }
      if (!payload || !Array.isArray(payload.rows)) {
        payload = {
          kind: eventType as Exclude<EventTypeCode, "gw_campaign">,
          rows: [],
        } as OcrPayload
      }

      // Oak header accumulation.
      if (eventType === "oak" && payload.kind === "oak" && payload.header) {
        const h = payload.header
        const prevCard: OakReportCard = oakHeaderAccumulator ?? {
          placement: 0,
          class_points: 0,
          class_points_delta: 0,
          battle_stats: { total: 0, kill: 0, occupation: 0 },
          best_of_all: {
            total: { name: "", value: 0 },
            kill: { name: "", value: 0 },
            occupation: { name: "", value: 0 },
          },
        }
        oakHeaderAccumulator = {
          placement: Number(h.placement) || prevCard.placement,
          class_points: Number(h.class_points) || prevCard.class_points,
          class_points_delta:
            Number(h.class_points_delta) || prevCard.class_points_delta,
          battle_stats: {
            total: Number(h.battle_stats?.total) || prevCard.battle_stats.total,
            kill: Number(h.battle_stats?.kill) || prevCard.battle_stats.kill,
            occupation:
              Number(h.battle_stats?.occupation) ||
              prevCard.battle_stats.occupation,
          },
          best_of_all: {
            total: h.best_of_all?.total
              ? {
                  name: String(h.best_of_all.total.name),
                  value: Number(h.best_of_all.total.value),
                }
              : prevCard.best_of_all.total,
            kill: h.best_of_all?.kill
              ? {
                  name: String(h.best_of_all.kill.name),
                  value: Number(h.best_of_all.kill.value),
                }
              : prevCard.best_of_all.kill,
            occupation: h.best_of_all?.occupation
              ? {
                  name: String(h.best_of_all.occupation.name),
                  value: Number(h.best_of_all.occupation.value),
                }
              : prevCard.best_of_all.occupation,
          },
        }
      }

      const rows = payload.rows.map((row) => {
        const r = row as Record<string, unknown>
        return {
          rank: Number(r.rank),
          player_name: String(r.player_name ?? ""),
          points: Number(r.points),
          accept_current:
            r.accept_current != null ? Number(r.accept_current) : null,
          accept_max: r.accept_max != null ? Number(r.accept_max) : null,
        }
      })

      await adminClient
        .from("event_screenshots")
        .update({ ocr_status: "done", ocr_result_json: rows })
        .eq("id", shot.screenshotId)

      // Match + write event_scores + queue ambiguous rows.
      for (const row of rows) {
        if (!isLikelyFactionMemberName(row.player_name)) continue

        const rowKey = `${row.rank}:${uniqueNameKey(row.player_name)}:${row.points}`
        if (seenRowKeys.has(rowKey)) continue
        seenRowKeys.add(rowKey)

        const candidates = fuzzyMatch(row.player_name, memberCandidates)
        const autoResolved = autoResolveMatch(candidates)

        if (autoResolved) {
          await adminClient.from("event_scores").upsert(
            {
              event_id: eventId,
              member_id: autoResolved.member_id,
              rank_value: row.rank,
              points: row.points,
              accept_current: row.accept_current,
              accept_max: row.accept_max,
              raw_ocr_row_json: row,
            },
            { onConflict: "event_id,member_id" },
          )
          if (shouldSaveAlias(row.player_name, autoResolved)) {
            autoAliasRows.push({
              member_id: autoResolved.member_id,
              alias: canonicalAlias(row.player_name),
              source: "ocr",
              confidence: Math.min(0.99, autoResolved.confidence),
            })
          }
        } else {
          reviewQueueItems.push({
            event_id: eventId,
            screenshot_id: shot.screenshotId,
            raw_name: row.player_name,
            candidates_json: candidates.slice(0, 3),
            raw_ocr_row_json: row,
          })
        }
      }
      allRows.push(...rows)
    }

    if (autoAliasRows.length > 0) {
      const uniqueAliases = Array.from(
        new Map(
          autoAliasRows.map((row) => [`${row.member_id}:${row.alias}`, row]),
        ).values(),
      )
      await adminClient
        .from("member_aliases")
        .upsert(uniqueAliases, { onConflict: "member_id,alias" })
    }

    if (reviewQueueItems.length > 0) {
      await adminClient.from("review_queue").insert(reviewQueueItems)
    }

    const publishUpdate: Record<string, unknown> = { status: "published" }
    if (eventType === "oak" && oakHeaderAccumulator) {
      publishUpdate.faction_result_json = oakHeaderAccumulator
    }
    await adminClient.from("events").update(publishUpdate).eq("id", eventId)
    console.log(
      `[OCR/bg] event ${eventId} published — ${allRows.length} rows, ${reviewQueueItems.length} queued`,
    )
  } catch (err) {
    console.error("[OCR/bg] worker error:", err)
    // Mark the event published anyway so the UI doesn't stay stuck on
    // "processing" forever. The status endpoint already exposes failed-shot
    // counts; the officer can choose to "Update Existing" and re-upload.
    try {
      await adminClient
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId)
    } catch (publishErr) {
      console.error("[OCR/bg] failed to publish after error:", publishErr)
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
