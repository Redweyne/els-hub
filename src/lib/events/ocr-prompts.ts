/**
 * Per-event-type OCR prompts for Gemini.
 *
 * Each prompt has been tuned to one specific in-game screenshot layout.
 * They all share the same hard rules:
 *   - Return ONLY a JSON object, never prose, never markdown fences.
 *   - Preserve player names byte-for-byte (Unicode, emoji, faction tags intact).
 *   - Use integers for rank and points.
 */

import type { EventTypeCode } from "./config"

/**
 * Shape returned by the OCR for a single screenshot.
 * Each event-type emits its own envelope keyed by `kind`.
 */
export type OcrPayload =
  | {
      kind: "fcu"
      rows: Array<{
        rank: number
        player_name: string
        points: number
        accept_current: number
        accept_max: number
      }>
    }
  | {
      kind: "oak"
      /** Set on screenshots that show the Battle Stats / Best of All card. */
      header?: {
        faction_tag?: string | null
        faction_name?: string | null
        placement?: number | null
        class_points?: number | null
        class_points_delta?: number | null
        battle_stats?: {
          total?: number | null
          kill?: number | null
          occupation?: number | null
        } | null
        best_of_all?: {
          total?: { name: string; value: number } | null
          kill?: { name: string; value: number } | null
          occupation?: { name: string; value: number } | null
        } | null
      } | null
      rows: Array<{ rank: number; player_name: string; points: number }>
    }
  | {
      kind: "gw_daily"
      rows: Array<{
        rank: number
        player_name: string
        points: number
      }>
    }

const FCU_PROMPT = `You are an OCR extractor for The Grand Mafia faction call-up ranking screenshots.

CRITICAL: Return ONLY a valid JSON object. No markdown, no code fences, no prose.

Schema:
{
  "kind": "fcu",
  "rows": [
    {"rank": <int>, "player_name": "<verbatim name with [ELS] tag>", "points": <int>, "accept_current": <int>, "accept_max": <int>}
  ]
}

Rules:
- Preserve player names EXACTLY — full Unicode, emoji, faction tags ([ELS] etc.), and decorative characters.
- Skip header rows, banners, ad strips, and chat bubbles at the bottom.
- If accept ratio is shown as "11/11" → accept_current=11, accept_max=11.
- Numbers may use thousands separators (commas, dots) — strip them and emit pure integers.
- If a row is partially cut off at the top or bottom of the screenshot, OMIT it.

Return the JSON object only, nothing else.`

const OAK_PROMPT = `You are an OCR extractor for The Grand Mafia "Glory of Oakvale Faction Results" screenshots.

CRITICAL: Return ONLY a valid JSON object. No markdown, no code fences, no prose.

Schema:
{
  "kind": "oak",
  "header": {
    "faction_tag": "<e.g. ELS>" | null,
    "faction_name": "<e.g. ELYSIUM>" | null,
    "placement": <1..5> | null,
    "class_points": <int> | null,
    "class_points_delta": <int — usually positive, e.g. 190> | null,
    "battle_stats": {
      "total": <int> | null,
      "kill": <int> | null,
      "occupation": <int> | null
    } | null,
    "best_of_all": {
      "total": {"name": "<player>", "value": <int>} | null,
      "kill": {"name": "<player>", "value": <int>} | null,
      "occupation": {"name": "<player>", "value": <int>} | null
    } | null
  } | null,
  "rows": [
    {"rank": <int>, "player_name": "<verbatim name>", "points": <int>}
  ]
}

Rules:
- A screenshot may show ONLY the header card, ONLY the leaderboard, or BOTH. Emit "header": null and rows=[] when neither is present.
- "No. 1" / "No.1" / "No 1" all mean placement=1.
- "Class Points: 5644(+190)" → class_points=5644, class_points_delta=190.
- Battle Stats and Best of All are SEPARATE columns side-by-side; the Best of All names belong to ELYSIUM members.
- Preserve player names verbatim including Unicode, emoji, decorative wrappers (e.g. "〜 MT 〜").
- Names in the Personal Points list never have the [ELS] tag — they're already faction-internal.
- Strip thousands separators from all numbers.
- If a row is partially cut off, OMIT it.

Return the JSON object only, nothing else.`

const GW_DAILY_PROMPT = `You are an OCR extractor for The Grand Mafia "Stage Ranking" screenshots from the Governor's War.

CRITICAL: Return ONLY a valid JSON object. No markdown, no code fences, no prose.

Schema:
{
  "kind": "gw_daily",
  "rows": [
    {"rank": <int — RANK SHOWN IN-FRAME>, "player_name": "<verbatim name with tag>", "points": <int>}
  ]
}

Rules:
- ONLY include rows whose player name starts with the "[ELS]" tag. Skip every other faction.
- The "rank" is the rank number printed beside that row. Some screenshots show the global server rank (28, 29, 30...) while others show the faction-only rank (1, 2, 3...). Either way, copy what you see.
- Preserve player names EXACTLY — Unicode, emoji, decorative wrappers, the literal "[ELS] " prefix included.
- "My Ranking: 52" / "Points: 2,490,700" header banner is NOT a leaderboard row — skip it.
- The "Boss, your Crew has begun the robbery" banner and chat bubbles are NOT rows.
- Strip thousands separators (commas, periods used as thousand separators) — emit pure integers.
- If a row is partially cut off, OMIT it.

Return the JSON object only, nothing else.`

export function getOcrPrompt(eventType: EventTypeCode): string {
  switch (eventType) {
    case "fcu":
      return FCU_PROMPT
    case "oak":
      return OAK_PROMPT
    case "gw_daily":
      return GW_DAILY_PROMPT
    case "gw_campaign":
      // Campaigns are created via a form, not an OCR upload.
      throw new Error(
        "gw_campaign has no OCR prompt — use the campaign creation form.",
      )
  }
}

/**
 * Strip Gemini's most common decorations from a response.
 *  - Removes ```json ... ``` fences.
 *  - Trims leading prose like "Here is the JSON:" (greedy match for outer braces).
 */
export function sanitizeOcrJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json|JSON)?\s*/g, "").replace(/```\s*$/g, "")
  // Extract the outermost JSON object.
  const objMatch = s.match(/\{[\s\S]*\}/)
  if (objMatch) s = objMatch[0]
  return s.trim()
}
