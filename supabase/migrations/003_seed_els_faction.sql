-- Seed ELYSIUM faction and 83-member roster
-- Extracted from user-provided screenshots, Day 0 roster

-- Insert ELYSIUM faction
INSERT INTO factions (tag, name, server_no, class_tier, class_points, public_slug, is_public)
VALUES ('ELS', 'ELYSIUM', 78, 'S', 5454, 'els', true)
ON CONFLICT (tag) DO NOTHING;

-- Get faction ID for use in member inserts
-- (This is done at application level in actual migration runner)

-- ========== MASTERMIND ==========
INSERT INTO members (faction_id, canonical_name, influence, rank_tier, vip_level, is_active)
SELECT id, 'TopKnife', 4360086583, 'mastermind', NULL, true FROM factions WHERE tag = 'ELS'
ON CONFLICT (faction_id, canonical_name) DO NOTHING;

-- ========== LEADERS (IV badge) ==========
INSERT INTO members (faction_id, canonical_name, influence, rank_tier, family_role, is_active)
SELECT id, '道 atot', 3372038735, 'leaders', 'general', true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Queen Kēr', 2798825025, 'leaders', 'diplomat', true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, '日jaqhi', 3765782558, 'leaders', 'coordinator', true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'unicorn', 8725647438, 'leaders', 'advisor', true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, '4TH GENERATION', 2167492947, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'A R Sany', 3325604784, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'A v v', 2832778042, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'AIRSTRIKE', 4364470528, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Alpharius', 1934000985, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Devirginizer', 1698873491, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Kensoccer', 1830943073, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, '〜 MT 〜', 2769148372, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Miss Demeanor', 2103326426, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'Scary Unicorn', 2285939800, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'SÍCARÍO', 1584784532, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'S1mple', 3187745918, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'VΛ†ɫ', 2413072311, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'qSunnyp', 3300516695, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, 'shamp', 2167492947, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, '探偵公主 LV8', 1238952442, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
UNION ALL
SELECT id, '探偵男王', 3625509376, 'leaders', NULL, true FROM factions WHERE tag = 'ELS'
ON CONFLICT (faction_id, canonical_name) DO NOTHING;

-- ========== FRONTLINERS ==========
INSERT INTO members (faction_id, canonical_name, influence, rank_tier, titles, is_active)
VALUES
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'AbobableBob', 2820641142, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Atilla I', 6117369380, 'frontliner', '{FMVP}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Ayyyyy Papi Chuy', 1799694003, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Baka', 2748729988, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'BigDaddyJay27', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Bondit', 3459501225, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Bully Deggo', 2201000634, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Carnagē', 2100329276, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Clarice', 1832019708, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Deekz', 1514502800, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'DimViisel', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Diggman', 1545054778, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Doc Anatoly', 1909142702, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'FGD', 1297671203, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'FloridaMän', 1607936307, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Frangouli', 2140081781, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Giacomo007', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Glucose', 2293681714, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Ĥâňî', 2169501049, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Jakers6969', 2484522591, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Killerbutter', 3259423999, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'KillerJaimy', 2763388362, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Kongfue', 1395491398, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Lamuche', 2097034934, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'MANUDO', 2681168641, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'MafiánkaB', 1387240758, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Makunouchi Mac', 2149733991, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Mürḑęf', 2054737829, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Naughty Tecky', 2455912385, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Nizuko', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Nikaą', 1734134039, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Nikas', 1710901972, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Not All There', 2328914971, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'POLARI2', 1808296458, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'PDW', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Redweyne', 1197399469, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'S1yyy', 1905286459, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Sexxy Mentality', 972156562, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'SNAKEEYES', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Skyriver', 2220314184, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'ToKI', 1787961783, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Ultra Noob', 2588987268, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'VΛ Ø Λ Y Y', 1540946325, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Wrath', 1710851682, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'ZerG', 1845897681, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'lilDragon', 978206148, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'pawelek', 1840509041, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'poikatsuNOW', 1503800648, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'thush', NULL, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '¥Dunkler König', 1819753281, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Ítz just DJ', 1690652257, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'kubat1994', 1878918157, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '☆☆kiji☆☆', 837631481, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'мотнαƒu¢kɛnpɛnƒ', 2146293354, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '三岁要打架', 2117725141, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '無惡不作', 2287483083, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '育身是 앨범', 3281501715, 'frontliner', '{}', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), '@Sunshine@', 2210879568, 'frontliner', '{}', true)
ON CONFLICT (faction_id, canonical_name) DO NOTHING;

-- ========== PRODUCTION ==========
INSERT INTO members (faction_id, canonical_name, influence, rank_tier, is_active)
VALUES
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'ELS CASH', 372382596, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Ayys', 1638206070, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'MoodyAyy', 1009784609, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Reu', 983446708, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'SEA King', 5147908423, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'TopknifeCUBs3', 782282414, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'TopknifeCUBs6', 554117812, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'TopknifeCUBs8', 397898019, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'TopknifeCUBs10', 383334054, 'production', true),
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'TopknifeCUBs11', 174754343, 'production', true)
ON CONFLICT (faction_id, canonical_name) DO NOTHING;

-- ========== STRANGER ==========
INSERT INTO members (faction_id, canonical_name, influence, rank_tier, is_active)
VALUES
  ((SELECT id FROM factions WHERE tag = 'ELS'), 'Dokun', 2844048039, 'stranger', true)
ON CONFLICT (faction_id, canonical_name) DO NOTHING;

-- ========== ADD ALIASES FOR OCR VARIANTS ==========
-- TopKnife (OCR sometimes says TopKnite)
INSERT INTO member_aliases (member_id, alias, source, confidence)
SELECT id, 'TopKnite', 'ocr', 0.85 FROM members
WHERE faction_id = (SELECT id FROM factions WHERE tag = 'ELS') AND canonical_name = 'TopKnife'
ON CONFLICT DO NOTHING;

-- 〜 MT 〜 (OCR might strip decorators)
INSERT INTO member_aliases (member_id, alias, source, confidence)
SELECT id, 'MT', 'ocr', 0.75 FROM members
WHERE faction_id = (SELECT id FROM factions WHERE tag = 'ELS') AND canonical_name = '〜 MT 〜'
ON CONFLICT DO NOTHING;

-- pawelek (OCR variations)
INSERT INTO member_aliases (member_id, alias, source, confidence)
SELECT id, 'paweIek mob', 'ocr', 0.80 FROM members
WHERE faction_id = (SELECT id FROM factions WHERE tag = 'ELS') AND canonical_name = 'pawelek'
ON CONFLICT DO NOTHING;

-- 無惡不作 (may have EVIL suffix in OCR)
INSERT INTO member_aliases (member_id, alias, source, confidence)
SELECT id, '無惡不作 EVIL', 'ocr', 0.90 FROM members
WHERE faction_id = (SELECT id FROM factions WHERE tag = 'ELS') AND canonical_name = '無惡不作'
ON CONFLICT DO NOTHING;

-- ========== SEED EVENT TYPES ==========
INSERT INTO event_types (code, name, columns_json, ocr_prompt)
VALUES
  ('fcu', 'Faction Call-Up', '{"rank": "Rank", "name": "Name", "points": "Points", "accept_current": "Accept Current", "accept_max": "Accept Max"}', 'Extract the Faction Call-Up rankings table with rank, player name, total points, accept current, and accept max columns.'),
  ('goa', 'Glory of Oakvale', '{"rank": "Rank", "faction": "Faction", "points": "Points"}', 'Extract the Glory of Oakvale faction rankings with rank, faction name, and total points.'),
  ('gw-sl', 'Governor''s War - Sandbox Lane', '{"rank": "Rank", "name": "Name", "points": "Points"}', 'Extract the Sandbox Lane Governor''s War player rankings.'),
  ('gw-fh', 'Governor''s War - Forgotten Haven', '{"rank": "Rank", "name": "Name", "points": "Points"}', 'Extract the Forgotten Haven Governor''s War player rankings.')
ON CONFLICT (code) DO NOTHING;
