import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
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
import {
  getOcrPrompt,
  sanitizeOcrJson,
  type OcrPayload,
} from "@/lib/events/ocr-prompts"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

function sendProgress(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  const line = JSON.stringify(data) + "\n"
  controller.enqueue(encoder.encode(line))
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[FCU-OCR] Starting FCU OCR request")

        if (!GEMINI_API_KEY) {
          console.error("[FCU-OCR] GEMINI_API_KEY is not set!")
          sendProgress(encoder, controller, { type: "error", message: "Gemini API key not configured" })
          controller.close()
          return
        }

        const formData = await req.formData()
        const screenshotFiles = formData.getAll("screenshots") as File[]
        const rawEventType = (formData.get("event_type") as string | null) ?? "fcu"
        const eventTitle = formData.get("event_title") as string
        const factionId = formData.get("faction_id") as string
        const existingEventId = formData.get("event_id") as string | null

        // GW Daily-only fields (officer-confirmed in the upload form)
        const gwCampaignId = formData.get("gw_campaign_id") as string | null
        const gwCycle = formData.get("gw_cycle") as string | null
        const gwSuperCycle = formData.get("gw_super_cycle") as string | null
        const gwDayInCycle = formData.get("gw_day_in_cycle") as string | null
        const gwDayType = formData.get("gw_day_type") as string | null
        const gwMinPoints = formData.get("gw_min_points") as string | null
        const gwDeadlineIso = formData.get("gw_deadline_iso") as string | null

        if (!screenshotFiles || screenshotFiles.length === 0) {
          sendProgress(encoder, controller, { type: "error", message: "No screenshots provided" })
          controller.close()
          return
        }

        // For new events, we need eventType, title, and factionId
        // For updates, we only need factionId and event_id
        if (!factionId) {
          sendProgress(encoder, controller, { type: "error", message: "Missing faction_id" })
          controller.close()
          return
        }

        if (!existingEventId && (!rawEventType || !eventTitle)) {
          sendProgress(encoder, controller, { type: "error", message: "Missing event_type or event_title" })
          controller.close()
          return
        }

        // Validate event_type. Anything unknown is a hard error — we can't pick a prompt.
        if (!isEventTypeCode(rawEventType) || rawEventType === "gw_campaign") {
          sendProgress(encoder, controller, {
            type: "error",
            message: `Invalid event_type: ${rawEventType}. Expected one of fcu, oak, gw_daily.`,
          })
          controller.close()
          return
        }
        const eventType: EventTypeCode = rawEventType

        // For GW Daily, the campaign + day-type metadata is required.
        let gwDailyMeta: GWDailyMeta | null = null
        if (eventType === "gw_daily" && !existingEventId) {
          if (!gwCampaignId || !gwCycle || !gwDayInCycle || !gwDayType || !gwMinPoints || !gwDeadlineIso) {
            sendProgress(encoder, controller, {
              type: "error",
              message: "GW Daily requires campaign + day-type metadata.",
            })
            controller.close()
            return
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

        sendProgress(encoder, controller, { type: "start", totalFiles: screenshotFiles.length })
        console.log(`[FCU-OCR] Processing ${screenshotFiles.length} screenshots ${existingEventId ? `(updating event ${existingEventId})` : `for ${eventTitle}`}`)

        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let eventId: string

        if (existingEventId) {
          // Validate event belongs to this faction
          const { data: existingEvent, error: validateError } = await adminClient
            .from("events")
            .select("id, faction_id")
            .eq("id", existingEventId)
            .single()

          if (validateError || !existingEvent) {
            console.error("[FCU-OCR] Event validation error:", validateError)
            sendProgress(encoder, controller, { type: "error", message: "Event not found" })
            controller.close()
            return
          }

          if (existingEvent.faction_id !== factionId) {
            sendProgress(encoder, controller, { type: "error", message: "Event does not belong to this faction" })
            controller.close()
            return
          }

          // Delete existing event_scores for this event (clean slate)
          const { error: deleteScoresError } = await adminClient
            .from("event_scores")
            .delete()
            .eq("event_id", existingEventId)

          if (deleteScoresError) {
            console.error("[FCU-OCR] Delete scores error:", deleteScoresError)
            sendProgress(encoder, controller, { type: "error", message: "Failed to clear existing scores" })
            controller.close()
            return
          }

          // Delete unresolved review queue items
          const { error: deleteQueueError } = await adminClient
            .from("review_queue")
            .delete()
            .eq("event_id", existingEventId)
            .is("resolution", null)

          if (deleteQueueError) {
            console.error("[FCU-OCR] Delete queue error:", deleteQueueError)
          }

          // Mark event as processing
          await adminClient
            .from("events")
            .update({ status: "processing" })
            .eq("id", existingEventId)

          eventId = existingEventId
          console.log(`[FCU-OCR] Reusing event ${eventId} (cleared old scores + queue)`)
          sendProgress(encoder, controller, { type: "event_reused", eventId })
        } else {
          // Create new event record
          const newEventRow: Record<string, unknown> = {
            faction_id: factionId,
            event_type_code: eventType,
            title: eventTitle,
            status: "processing",
          }
          if (gwDailyMeta) {
            // Stash the campaign + day-type metadata so the entire app can derive
            // schedule, threshold, and progress from this single source.
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
            console.error("[FCU-OCR] Event creation error:", JSON.stringify(eventError))
            sendProgress(encoder, controller, { type: "error", message: "Failed to create event" })
            controller.close()
            return
          }

          eventId = eventData.id
          console.log(`[FCU-OCR] Created event ${eventId}`)
          sendProgress(encoder, controller, { type: "event_created", eventId })
        }

        // Get all active members and known OCR aliases for matching.
        const { data: members, error: membersError } = await adminClient
          .from("members")
          .select("id, canonical_name, member_aliases(alias)")
          .eq("is_active", true)
          .eq("faction_id", factionId)

        if (membersError || !members) {
          console.error("[FCU-OCR] Members fetch error:", membersError)
          sendProgress(encoder, controller, { type: "error", message: "Failed to fetch members" })
          controller.close()
          return
        }

        const memberCandidates = members.map(m => ({
          id: m.id,
          canonical_name: m.canonical_name,
          aliases: (m.member_aliases || []).map((aliasRow: { alias: string }) => aliasRow.alias),
        }))
        const rosterHint = memberCandidates
          .map((member) => member.canonical_name)
          .join(", ")

        const allRows: any[] = []
        const reviewQueueItems: any[] = []
        const autoAliasRows: Array<{ member_id: string; alias: string; source: string; confidence: number }> = []
        const seenRowKeys = new Set<string>()
        // Oak: header data is harvested across multiple screenshots; whichever shot
        // shows the "Glory of Oakvale Faction Results" card supplies it.
        let oakHeaderAccumulator: OakReportCard | null = null

        // gw_campaign was already rejected at validation; this is always one of
        // the OCR-uploadable types (fcu | oak | gw_daily).
        const ocrPrompt =
          getOcrPrompt(eventType) +
          `\n\nThe active ELS roster (use these exact spellings when a name clearly matches): ${rosterHint}`

        // Process each screenshot with Gemini
        for (let i = 0; i < screenshotFiles.length; i++) {
          const file = screenshotFiles[i]
          sendProgress(encoder, controller, {
            type: "processing",
            fileNumber: i + 1,
            fileName: file.name,
            totalFiles: screenshotFiles.length,
          })
          console.log(`[FCU-OCR] Processing screenshot ${i + 1}/${screenshotFiles.length}: ${file.name}`)

          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")

          let geminiResponse = null
          const maxRetries = 3
          const baseDelay = 1000

          const url = new URL(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent"
          )
          url.searchParams.set("key", GEMINI_API_KEY!)

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              geminiResponse = await fetch(url.toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: ocrPrompt,
                        },
                        {
                          inline_data: {
                            mime_type: file.type || "image/png",
                            data: base64,
                          },
                        },
                      ],
                    },
                  ],
                }),
              })

              console.log(`[FCU-OCR] Screenshot ${i + 1} response: ${geminiResponse.status}`)

              if (geminiResponse.ok) {
                break
              }

              if (geminiResponse.status === 503) {
                if (attempt < maxRetries - 1) {
                  const delay = baseDelay * Math.pow(2, attempt)
                  console.log(`[FCU-OCR] Retrying in ${delay}ms...`)
                  await new Promise((resolve) => setTimeout(resolve, delay))
                  continue
                }
              }

              const errorText = await geminiResponse.text()
              console.error(`[FCU-OCR] Gemini error on screenshot ${i + 1}:`, geminiResponse.status, errorText)
              throw new Error(`Gemini failed: ${geminiResponse.status}`)
            } catch (err) {
              console.error(`[FCU-OCR] Fetch error on screenshot ${i + 1}, attempt ${attempt + 1}:`, err)
              if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt)
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
              }
              throw err
            }
          }

          if (!geminiResponse || !geminiResponse.ok) {
            sendProgress(encoder, controller, { type: "error", message: `Failed to process screenshot ${i + 1}` })
            controller.close()
            return
          }

          const geminiData = await geminiResponse.json()
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
          const cleaned = sanitizeOcrJson(responseText)

          let payload: OcrPayload | null = null
          try {
            const sanitized = cleaned
              .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
              .replace(/([^\\])\\(?!["\\/bfnrtu])/g, "$1\\\\")
            payload = JSON.parse(sanitized) as OcrPayload
          } catch (err) {
            console.error(`[FCU-OCR] Parse error on screenshot ${i + 1}`, err)
            try {
              const fallback = cleaned.replace(/\\[^"\\/bfnrtu]/g, "")
              payload = JSON.parse(fallback) as OcrPayload
            } catch (fallbackErr) {
              console.error(`[FCU-OCR] Fallback parse error:`, fallbackErr)
              sendProgress(encoder, controller, {
                type: "error",
                message: `Failed to parse screenshot ${i + 1}`,
              })
              controller.close()
              return
            }
          }

          if (!payload || !Array.isArray(payload.rows)) {
            payload = { kind: eventType as Exclude<EventTypeCode, "gw_campaign">, rows: [] } as OcrPayload
          }

          // For Oak: capture the report-card header. The same field appearing on
          // multiple shots is fine — last write wins, but Gemini only emits header
          // for screenshots that actually show the faction-results card.
          if (eventType === "oak" && payload.kind === "oak" && payload.header) {
            const h = payload.header
            const merged: OakReportCard = {
              placement: Number(h.placement) || oakHeaderAccumulator?.placement || 0,
              class_points:
                Number(h.class_points) || oakHeaderAccumulator?.class_points || 0,
              class_points_delta:
                Number(h.class_points_delta) || oakHeaderAccumulator?.class_points_delta || 0,
              battle_stats: {
                total: Number(h.battle_stats?.total) || oakHeaderAccumulator?.battle_stats.total || 0,
                kill: Number(h.battle_stats?.kill) || oakHeaderAccumulator?.battle_stats.kill || 0,
                occupation:
                  Number(h.battle_stats?.occupation) || oakHeaderAccumulator?.battle_stats.occupation || 0,
              },
              best_of_all: {
                total: h.best_of_all?.total
                  ? { name: String(h.best_of_all.total.name), value: Number(h.best_of_all.total.value) }
                  : oakHeaderAccumulator?.best_of_all.total || { name: "", value: 0 },
                kill: h.best_of_all?.kill
                  ? { name: String(h.best_of_all.kill.name), value: Number(h.best_of_all.kill.value) }
                  : oakHeaderAccumulator?.best_of_all.kill || { name: "", value: 0 },
                occupation: h.best_of_all?.occupation
                  ? {
                      name: String(h.best_of_all.occupation.name),
                      value: Number(h.best_of_all.occupation.value),
                    }
                  : oakHeaderAccumulator?.best_of_all.occupation || { name: "", value: 0 },
              },
            }
            oakHeaderAccumulator = merged
          }

          // Normalize the leaderboard rows. FCU has accept fields; Oak/GW Daily don't.
          const rows = payload.rows.map((row: any) => ({
            rank: Number(row.rank),
            player_name: String(row.player_name ?? ""),
            points: Number(row.points),
            accept_current: row.accept_current != null ? Number(row.accept_current) : null,
            accept_max: row.accept_max != null ? Number(row.accept_max) : null,
          }))

          console.log(`[FCU-OCR] Screenshot ${i + 1} extracted ${rows.length} rows (kind=${eventType})`)

          // Store screenshot + ocr result
          const { data: screenshotData, error: screenshotError } = await adminClient
            .from("event_screenshots")
            .insert({
              event_id: eventId,
              order_index: i,
              ocr_status: "done",
              ocr_result_json: rows,
            })
            .select("id")
            .single()

          if (screenshotError || !screenshotData) {
            console.error("[FCU-OCR] Screenshot record error:", screenshotError)
            sendProgress(encoder, controller, { type: "error", message: "Failed to store screenshot" })
            controller.close()
            return
          }

          // Match each row. Exact/alias/strong normalized matches are auto-resolved;
          // only genuinely ambiguous names are sent to officers.
          for (const row of rows) {
            if (!isLikelyFactionMemberName(row.player_name)) continue

            const rowKey = `${row.rank}:${uniqueNameKey(row.player_name)}:${row.points}`
            if (seenRowKeys.has(rowKey)) continue
            seenRowKeys.add(rowKey)

            const candidates = fuzzyMatch(row.player_name, memberCandidates)
            const autoResolved = autoResolveMatch(candidates)

            if (autoResolved) {
              await adminClient.from("event_scores").upsert({
                event_id: eventId,
                member_id: autoResolved.member_id,
                rank_value: row.rank,
                points: row.points,
                accept_current: row.accept_current,
                accept_max: row.accept_max,
                raw_ocr_row_json: row,
              }, {
                onConflict: "event_id,member_id",
              })

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
                screenshot_id: screenshotData.id,
                raw_name: row.player_name,
                candidates_json: candidates.slice(0, 3),
                raw_ocr_row_json: row,
              })
            }
          }

          allRows.push(...rows)

          sendProgress(encoder, controller, {
            type: "extracted",
            fileNumber: i + 1,
            fileName: file.name,
            rowCount: rows.length,
          })
        }

        if (autoAliasRows.length > 0) {
          const uniqueAliases = Array.from(
            new Map(autoAliasRows.map((row) => [`${row.member_id}:${row.alias}`, row])).values(),
          )
          const { error: aliasError } = await adminClient
            .from("member_aliases")
            .upsert(uniqueAliases, { onConflict: "member_id,alias" })

          if (aliasError) {
            console.error("[FCU-OCR] Alias upsert error:", aliasError)
          }
        }

        // Batch insert review queue items
        if (reviewQueueItems.length > 0) {
          const { error: reviewError } = await adminClient
            .from("review_queue")
            .insert(reviewQueueItems)

          if (reviewError) {
            console.error("[FCU-OCR] Review queue insert error:", reviewError)
            sendProgress(encoder, controller, { type: "error", message: "Failed to create review queue" })
            controller.close()
            return
          }
        }

        // For Oak: persist the report-card header (placement, battle stats,
        // best-of-all heroes) into faction_result_json. The Oak event detail
        // page reads from this column and renders the full report card.
        const publishUpdate: Record<string, unknown> = { status: "published" }
        if (eventType === "oak" && oakHeaderAccumulator) {
          publishUpdate.faction_result_json = oakHeaderAccumulator
        }
        await adminClient
          .from("events")
          .update(publishUpdate)
          .eq("id", eventId)

        console.log(`[FCU-OCR] Total rows extracted: ${allRows.length}, review queue: ${reviewQueueItems.length}`)

        sendProgress(encoder, controller, {
          type: "complete",
          eventId,
          totalRows: allRows.length,
          autoResolved: allRows.length - reviewQueueItems.length,
          reviewQueueCount: reviewQueueItems.length,
        })

        controller.close()
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : ""
        console.error("[FCU-OCR] Error:", errorMsg)
        console.error("[FCU-OCR] Stack:", errorStack)
        sendProgress(encoder, controller, { type: "error", message: `Internal server error: ${errorMsg}` })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  })
}
