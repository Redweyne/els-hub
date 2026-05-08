/**
 * Prompt builder for the AI event recap.
 *
 * The recap is intentionally a single Gemini call with hard structure:
 *   - 2 paragraphs, 4–6 sentences total
 *   - Mafia / Peaky-Blinders tone, never sports-broadcaster
 *   - Names matter: top 3, biggest mover, biggest threshold-clearer
 *   - No invented numbers — only what's in the input
 *   - Output is plain markdown, no code fences
 *
 * The result is cached in `events.meta_json.recap_md` so we never re-spend
 * a Gemini call on the same event unless an officer explicitly regenerates.
 */

import type { EventTypeCode } from "@/lib/events/config"

export interface RecapInput {
  eventTypeCode: EventTypeCode | string
  title: string
  /** Local-friendly date string for the prose, e.g. "May 1, 2026". */
  dateLabel: string
  totalScores: number
  totalPoints: number
  /** Top performers, already sorted by points desc. Up to 5 entries. */
  topPerformers: ReadonlyArray<{ name: string; rank: number; points: number }>
  /** Members with the largest positive rank delta vs prior event of same type. */
  topMovers: ReadonlyArray<{ name: string; deltaRanks: number }>
  /** GW Daily-specific. */
  gw?: {
    cycle: "war" | "hegemony"
    day_type: string
    day_in_cycle: number
    threshold: number
    thresholdHits: number
  } | null
  /** Oak-specific. */
  oak?: {
    placement: number
    classPoints: number
    classPointsDelta: number
    bestOfAll: ReadonlyArray<{ category: string; name: string; value: number }>
  } | null
}

export function buildRecapPrompt(input: RecapInput): string {
  const lines: string[] = []
  lines.push(
    "You are the chronicler of the ELYSIUM faction (tag [ELS]) in the mobile game *The Grand Mafia*.",
  )
  lines.push(
    "Write a SHORT recap of one event for ELS members and rivals to read.",
  )
  lines.push("")
  lines.push("HARD RULES — non-negotiable:")
  lines.push(
    "- Output exactly TWO paragraphs of plain markdown. No headers, no bullet lists, no code fences.",
  )
  lines.push(
    "- 4–6 sentences total. Tight. Cinematic. Peaky-Blinders cadence — present tense, mafia register.",
  )
  lines.push(
    "- NEVER invent numbers, names, or events. Use only what is given below.",
  )
  lines.push(
    "- Use the exact verbatim names provided (special characters and faction tags intact).",
  )
  lines.push(
    "- Do not address the reader as 'you' or 'we'. Third-person, observational.",
  )
  lines.push(
    '- Avoid sports-broadcaster phrases ("incredible performance", "stellar showing", etc.). Use mafia/noir vocabulary instead (the tower, the family, the cut, the run, the hour, the streets, etc.).',
  )
  lines.push("")
  lines.push("EVENT FACTS:")
  lines.push(`- Event type: ${eventTypeLabel(input.eventTypeCode)}`)
  lines.push(`- Title: ${input.title}`)
  lines.push(`- Date: ${input.dateLabel}`)
  lines.push(`- Members on the leaderboard: ${input.totalScores}`)
  lines.push(`- Faction total points: ${input.totalPoints.toLocaleString("en-US")}`)
  if (input.gw) {
    lines.push(
      `- GW Daily: ${capitalise(input.gw.cycle)} cycle · Day ${input.gw.day_in_cycle} · ${capitalise(input.gw.day_type)}`,
    )
    lines.push(
      `- Threshold: ${input.gw.threshold.toLocaleString("en-US")} pts (${input.gw.thresholdHits} of ${input.totalScores} cleared)`,
    )
  }
  if (input.oak) {
    lines.push(
      `- Oak placement: No. ${input.oak.placement} (Class points: ${input.oak.classPoints.toLocaleString("en-US")}, Δ ${input.oak.classPointsDelta >= 0 ? "+" : ""}${input.oak.classPointsDelta})`,
    )
    if (input.oak.bestOfAll.length > 0) {
      lines.push(
        `- "Best of All" categories: ${input.oak.bestOfAll
          .map(
            (b) =>
              `${capitalise(b.category)} → ${b.name} (${b.value.toLocaleString("en-US")})`,
          )
          .join("; ")}`,
      )
    }
  }
  if (input.topPerformers.length > 0) {
    lines.push("- Top performers (rank · name · points):")
    input.topPerformers.slice(0, 5).forEach((p) => {
      lines.push(
        `  - #${p.rank} ${p.name} — ${p.points.toLocaleString("en-US")}`,
      )
    })
  }
  if (input.topMovers.length > 0) {
    lines.push("- Biggest rank gainers since the previous event of this type:")
    input.topMovers.slice(0, 3).forEach((m) => {
      lines.push(`  - ${m.name} (climbed ${m.deltaRanks} ranks)`)
    })
  }
  lines.push("")
  lines.push("STRUCTURE:")
  lines.push(
    "- Paragraph 1 (2–3 sentences): set the scene of the event. Name the top performer (rank 1). If GW Daily, mention the day-type tone (Robbing = larceny, Massacre = bloodshed, Influence = territory, etc.). If Oak, lead with the placement.",
  )
  lines.push(
    "- Paragraph 2 (2–3 sentences): name a notable mover or category-hero. Close with one line that sounds like a quiet warning to rivals or a recognition to the faction.",
  )
  lines.push("")
  lines.push("Now write the recap:")
  return lines.join("\n")
}

// ─── helpers ────────────────────────────────────────────────────────────

function eventTypeLabel(code: string): string {
  if (code === "fcu") return "Faction Call-Up"
  if (code === "oak") return "Glory of Oakvale"
  if (code === "gw_daily") return "Governor's War — Daily"
  if (code === "gw_campaign") return "Governor's War — Campaign"
  return code
}

function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
