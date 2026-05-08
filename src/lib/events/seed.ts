import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Idempotently ensure every event_type code the app uses today exists in the
 * `event_types` table.
 *
 * Why this lives in code, not just in a SQL migration:
 *  - The app evolves faster than migrations get applied. Anytime we ship a
 *    code that adds a new event type, the user could end up with code that
 *    inserts into `events` referencing an event_type_code that hasn't been
 *    seeded yet → foreign-key failure on insert.
 *  - Calling this from the server routes that create events guarantees the
 *    referenced row exists *before* the insert runs, regardless of whether
 *    a SQL migration was applied. It's a safety net, not a replacement for
 *    real schema management.
 *
 * Behaviour:
 *  - INSERT ... ON CONFLICT (code) DO NOTHING — if a row with the code is
 *    already present (e.g. seeded by an earlier migration), this is a no-op.
 *  - Uses the service-role client so it bypasses RLS. Callers should already
 *    have authenticated their request before hitting this.
 *
 * Cost: one round-trip per server route call. Cheap. Run it before any
 * `events` insert that uses one of the codes below.
 */

interface EventTypeSeed {
  code: string
  name: string
  columns_json: Record<string, string>
}

const SEED_ROWS: ReadonlyArray<EventTypeSeed> = [
  {
    code: "fcu",
    name: "Faction Call-Up",
    columns_json: {
      rank: "Rank",
      name: "Name",
      points: "Points",
      accept_current: "Accept Current",
      accept_max: "Accept Max",
    },
  },
  {
    code: "oak",
    name: "Glory of Oakvale",
    columns_json: {
      placement: "Faction Placement",
      class_points: "Class Points",
      class_points_delta: "Class Points Gain",
      battle_stats: "Faction Battle Stats (total/kill/occupation)",
      best_of_all: "Category Heroes",
      rank: "Personal Rank",
      name: "Player Name",
      points: "Personal Points",
    },
  },
  {
    code: "gw_campaign",
    name: "Governor's War — Campaign",
    columns_json: {
      start_date_iso: "Campaign Start (Paris time)",
      tz: "Timezone",
      ended_at_iso: "Ended-at timestamp (null while active)",
    },
  },
  {
    code: "gw_daily",
    name: "Governor's War — Daily",
    columns_json: {
      campaign_id: "Parent Campaign Event ID",
      cycle: "war | hegemony",
      super_cycle: "Super-cycle index (1-5)",
      day_in_cycle: "Day number 1-5",
      day_type: "robbing | kingpin | influence | speedups | massacre",
      min_points: "Minimum Threshold (points)",
      rank: "Faction Rank",
      name: "Player Name",
      points: "Personal Points",
    },
  },
]

/**
 * Ensure every event_type code in `SEED_ROWS` exists. Existing rows are not
 * modified — we only insert missing ones — so a hand-tuned `name` or
 * `ocr_prompt` set elsewhere is preserved.
 */
export async function ensureEventTypes(
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await admin.from("event_types").upsert(
      SEED_ROWS.map((row) => ({
        code: row.code,
        name: row.name,
        columns_json: row.columns_json,
      })),
      { onConflict: "code", ignoreDuplicates: true },
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
