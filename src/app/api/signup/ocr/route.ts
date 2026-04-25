import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(req: NextRequest) {
  try {
    console.log("[OCR] Starting OCR request")
    const formData = await req.formData()
    const screenshot = formData.get("screenshot") as File

    if (!screenshot) {
      return NextResponse.json({ error: "No screenshot provided" }, { status: 400 })
    }

    console.log("[OCR] Screenshot received:", screenshot.name)

    // Convert file to base64
    const buffer = await screenshot.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")

    // Call Gemini Vision API
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")
    url.searchParams.set("key", GEMINI_API_KEY!)

    let geminiResponse: Response | null = null
    let lastError: string = ""
    const maxRetries = 3
    const baseDelay = 1000 // 1 second

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
                    text: `Extract ONLY these three pieces of information from the Account page header. Return ONLY a JSON object with no markdown:
{
  "player_name": "the full player name (everything after the faction tag in brackets, trimmed)",
  "player_id": "numeric player ID",
  "faction_tag": "faction abbreviation like ELS, SPS, etc"
}

Examples:
- If header shows "#78 [ELS] Redweyne", return: {"player_name": "Redweyne", "player_id": "6753106453", "faction_tag": "ELS"}
- If header shows "V8 (I) #78 [KTI] Lesser Red", return: {"player_name": "Lesser Red", "player_id": "67545229567", "faction_tag": "KTI"}`,
                  },
                  {
                    inline_data: {
                      mime_type: screenshot.type,
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        })

        console.log(`[OCR] Gemini response status (attempt ${attempt + 1}):`, geminiResponse.status)

        if (geminiResponse.ok) {
          break
        }

        if (geminiResponse.status === 503) {
          lastError = "Service overloaded"
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt)
            console.log(`[OCR] Retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
        }

        const errorText = await geminiResponse.text()
        console.error("[OCR] Gemini error:", geminiResponse.status, errorText)
        return NextResponse.json(
          { error: "Vision API failed", details: errorText },
          { status: 500 }
        )
      } catch (err) {
        console.error(`[OCR] Fetch error on attempt ${attempt + 1}:`, err)
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw err
      }
    }

    if (!geminiResponse) {
      return NextResponse.json(
        { error: "Vision API failed after retries", details: lastError },
        { status: 503 }
      )
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("[OCR] Gemini error:", geminiResponse.status, errorText)
      return NextResponse.json(
        { error: "Vision API failed", details: errorText },
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    let ocr: {
      player_id: string
      player_name: string
      faction_tag: string
    }

    try {
      ocr = JSON.parse(responseText)
      console.log("[OCR] Extracted:", ocr)
    } catch {
      console.error("[OCR] Parse error:", responseText)
      return NextResponse.json(
        { error: "Failed to extract information" },
        { status: 400 }
      )
    }

    return NextResponse.json({ ocr })
  } catch (error) {
    console.error("[OCR] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
