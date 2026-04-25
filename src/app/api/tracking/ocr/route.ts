import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { fuzzyMatch, autoResolveMatch } from "@/lib/match/fuzzy"

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
        const eventType = formData.get("event_type") as string
        const eventTitle = formData.get("event_title") as string
        const factionId = formData.get("faction_id") as string
        const existingEventId = formData.get("event_id") as string | null

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

        if (!existingEventId && (!eventType || !eventTitle)) {
          sendProgress(encoder, controller, { type: "error", message: "Missing event_type or event_title" })
          controller.close()
          return
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
          const { data: eventData, error: eventError } = await adminClient
            .from("events")
            .insert({
              faction_id: factionId,
              event_type_code: eventType,
              title: eventTitle,
              status: "processing",
            })
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

        // Get all members for fuzzy matching
        const { data: members, error: membersError } = await adminClient
          .from("members")
          .select("id, canonical_name")
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
        }))

        const allRows: any[] = []
        const reviewQueueItems: any[] = []

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
                          text: `CRITICAL: Return ONLY a valid JSON array. Do not include any markdown, code blocks, explanations, or extra text. Return the JSON array as-is, nothing else.

Extract the Faction Call-Up ranking table from this screenshot. For each row, provide:
- rank: the ranking number (integer)
- player_name: complete player name with faction tag (e.g. "[ELS] Boss1052") - preserve ALL characters exactly as shown
- points: points value (integer)
- accept_current: current accepts (integer)
- accept_max: max accepts (integer)

RESPONSE FORMAT - RETURN ONLY THIS, NO EXTRA TEXT:
[
  {"rank": 1, "player_name": "[ELS] Boss1052", "points": 3760, "accept_current": 11, "accept_max": 11},
  {"rank": 2, "player_name": "[ELS] Atilla I", "points": 3625, "accept_current": 11, "accept_max": 11}
]`,
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
          let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]"

          // Clean up response: remove markdown code blocks, trim whitespace
          responseText = responseText
            .replace(/^```(?:json)?\n?/g, '')
            .replace(/\n?```$/g, '')
            .trim()

          // If response has text before/after JSON, try to extract just the JSON array
          const jsonMatch = responseText.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            responseText = jsonMatch[0]
          }

          let rows: any[] = []
          try {
            // Replace problematic escape sequences with Unicode escapes
            responseText = responseText
              .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u')
              .replace(/([^\\])\\(?!["\\/bfnrtu])/g, '$1\\\\')

            rows = JSON.parse(responseText)

            // Normalize numeric fields to ensure they're numbers, not strings
            rows = rows.map((row: any) => ({
              rank: Number(row.rank),
              player_name: String(row.player_name),
              points: Number(row.points),
              accept_current: Number(row.accept_current),
              accept_max: Number(row.accept_max),
            }))

            console.log(`[FCU-OCR] Screenshot ${i + 1} extracted ${rows.length} rows`)
          } catch (err) {
            console.error(`[FCU-OCR] Parse error on screenshot ${i + 1}`)
            console.error(`[FCU-OCR] Raw response text length:`, responseText.length)
            console.error(`[FCU-OCR] Parse error detail:`, err instanceof Error ? err.message : String(err))

            // Fallback: try parsing with more aggressive sanitization
            try {
              const sanitized = responseText.replace(/\\[^"\\/bfnrtu]/g, '')
              rows = JSON.parse(sanitized)
              console.log(`[FCU-OCR] Fallback parse succeeded for screenshot ${i + 1}: ${rows.length} rows`)
            } catch (fallbackErr) {
              sendProgress(encoder, controller, { type: "error", message: `Failed to parse screenshot ${i + 1}` })
              controller.close()
              return
            }
          }

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

          // Fuzzy match each row
          for (const row of rows) {
            const candidates = fuzzyMatch(row.player_name, memberCandidates)
            const autoResolved = autoResolveMatch(candidates)

            if (autoResolved) {
              await adminClient.from("event_scores").insert({
                event_id: eventId,
                member_id: autoResolved.member_id,
                rank_value: row.rank,
                points: row.points,
                accept_current: row.accept_current,
                accept_max: row.accept_max,
                raw_ocr_row_json: row,
              })
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

        // Update event status
        await adminClient
          .from("events")
          .update({ status: "published" })
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
