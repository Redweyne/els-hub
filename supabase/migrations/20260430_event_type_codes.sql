-- Phase 2 — rename event_type codes to match real abbreviations.
-- - "Oak" replaces "goa" for Glory of Oakvale (NEVER "GoO" or "goa").
-- - "gw_campaign" + "gw_daily" replace "gw-sl" / "gw-fh" with a parent/child model:
--     a campaign is the 40-50 day arc, dailies are individual days within it.
-- Safe to run because zero events reference these codes yet.

BEGIN;

-- 1. Insert the new codes (idempotent).

INSERT INTO event_types (code, name, columns_json, ocr_prompt, result_template)
VALUES
  (
    'oak',
    'Glory of Oakvale',
    '{
      "placement": "Faction Placement",
      "class_points": "Class Points",
      "class_points_delta": "Class Points Gain",
      "battle_stats": "Faction Battle Stats (total/kill/occupation)",
      "best_of_all": "Category Heroes",
      "rank": "Personal Rank",
      "name": "Player Name",
      "points": "Personal Points"
    }'::jsonb,
    NULL,
    '{}'::jsonb
  ),
  (
    'gw_campaign',
    'Governor''s War — Campaign',
    '{
      "start_date_paris": "Campaign Start (Paris time)",
      "expected_days": "Expected Duration",
      "current_super_cycle": "Current Super-Cycle (1-5)",
      "current_cycle": "war | hegemony",
      "current_day": "Day in cycle (1-5)",
      "current_day_type": "robbing | kingpin | influence | speedups | massacre"
    }'::jsonb,
    NULL,
    '{}'::jsonb
  ),
  (
    'gw_daily',
    'Governor''s War — Daily',
    '{
      "campaign_id": "Parent Campaign Event ID",
      "cycle": "war | hegemony",
      "super_cycle": "Super-cycle index (1-5)",
      "day_in_cycle": "Day number 1-5",
      "day_type": "robbing | kingpin | influence | speedups | massacre",
      "min_points": "Minimum Threshold (points)",
      "rank": "Faction Rank",
      "name": "Player Name",
      "points": "Personal Points"
    }'::jsonb,
    NULL,
    '{}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  columns_json = EXCLUDED.columns_json,
  result_template = EXCLUDED.result_template;

-- 2. Remove the legacy codes. Guard each with a NOT EXISTS check on `events`
--    so we never break referential integrity in unexpected environments.

DELETE FROM event_types
WHERE code = 'goa'
  AND NOT EXISTS (SELECT 1 FROM events WHERE event_type_code = 'goa');

DELETE FROM event_types
WHERE code = 'gw-sl'
  AND NOT EXISTS (SELECT 1 FROM events WHERE event_type_code = 'gw-sl');

DELETE FROM event_types
WHERE code = 'gw-fh'
  AND NOT EXISTS (SELECT 1 FROM events WHERE event_type_code = 'gw-fh');

COMMIT;
