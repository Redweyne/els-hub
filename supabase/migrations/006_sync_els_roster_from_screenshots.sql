-- Sync ELS roster with the exact in-game names visible in the April 22 member screenshots.
-- The screenshot roster contains 95 active members: 1 Mastermind, 21 Leaders,
-- 62 Frontliners, 10 Production accounts, and 1 Stranger.

CREATE TEMP TABLE els_screenshot_roster (
  canonical_name text PRIMARY KEY,
  influence bigint,
  rank_tier text NOT NULL,
  family_role text
) ON COMMIT DROP;

INSERT INTO els_screenshot_roster (canonical_name, influence, rank_tier, family_role)
SELECT canonical_name, influence, rank_tier, family_role
FROM jsonb_to_recordset('[
  {
    "canonical_name": "TopKnife",
    "influence": 4369404683,
    "rank_tier": "mastermind",
    "family_role": null
  },
  {
    "canonical_name": "unicorn",
    "influence": 8725547436,
    "rank_tier": "leaders",
    "family_role": "advisor"
  },
  {
    "canonical_name": "AIRSTRIKE",
    "influence": 4364470528,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "目jtaçhi",
    "influence": 3765782558,
    "rank_tier": "leaders",
    "family_role": "coordinator"
  },
  {
    "canonical_name": "道 atot",
    "influence": 3372038735,
    "rank_tier": "leaders",
    "family_role": "general"
  },
  {
    "canonical_name": "A R Sany",
    "influence": 3325604784,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "ღSunnyღ",
    "influence": 3200516695,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "S1mple丶",
    "influence": 3127765599,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "A Y Y",
    "influence": 2832778042,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Queen Kér",
    "influence": 2798825025,
    "rank_tier": "leaders",
    "family_role": "diplomat"
  },
  {
    "canonical_name": "༄ MT ༻",
    "influence": 2769148372,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "VΔŁ",
    "influence": 2413072311,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Scary Unicorn",
    "influence": 2285939800,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "4TH GENERATION",
    "influence": 2167492947,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "† shamp",
    "influence": 2165061385,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Miss Demeanor",
    "influence": 2103326426,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "探偵男王",
    "influence": 2022687402,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Alpharius",
    "influence": 1934090265,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Kensoccer",
    "influence": 1830945073,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Devirginizer",
    "influence": 1698873491,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "SĪCARĪØ",
    "influence": 1584784532,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "探偵公主 LEE",
    "influence": 1239952442,
    "rank_tier": "leaders",
    "family_role": null
  },
  {
    "canonical_name": "Atilla I",
    "influence": 6117369380,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "༄SNAKEEYES༄",
    "influence": 3717975861,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Killerbutter",
    "influence": 3559423939,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "thush",
    "influence": 3459501225,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "폭신한 앞발",
    "influence": 3281951715,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Bαndit",
    "influence": 3264720080,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Ĥâñî",
    "influence": 2939209908,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Baka",
    "influence": 2768729988,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "lilDragon",
    "influence": 2753368302,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "MANUDO",
    "influence": 2681566461,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "AbobableBob",
    "influence": 2625641149,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Ultra Noob",
    "influence": 2588987369,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "KillerJaimy",
    "influence": 2572753198,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Naughty Tecky",
    "influence": 2496310440,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Jakers6969",
    "influence": 2494832581,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "stööshÿ7",
    "influence": 2481187859,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Not All There",
    "influence": 2398352977,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Boss1052",
    "influence": 2397042640,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "pawelek mob",
    "influence": 2339759739,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Giacomo007",
    "influence": 2293687714,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "無惡不作 EVIL",
    "influence": 2287438693,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "ღSunshineღ",
    "influence": 2219879436,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Bully Døggo",
    "influence": 2201050634,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "❃❃kiji❃❃",
    "influence": 2159921049,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Makunouchi Mac",
    "influence": 2149720991,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "мσтнαƒυкιηнєωƒ",
    "influence": 2146298354,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Frangouli",
    "influence": 2140081761,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "三岁爱打架",
    "influence": 2117722141,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Carnagë",
    "influence": 2102592916,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Lamuche",
    "influence": 2097558622,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Múrðeř",
    "influence": 2024737829,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Doc Anatoly",
    "influence": 1999142702,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "ZerG",
    "influence": 1942897691,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "¥Dunkler König¥",
    "influence": 1938776832,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "S1yyy",
    "influence": 1886286459,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "kubat1994",
    "influence": 1878518117,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Ghost",
    "influence": 1876396117,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "ცųլցII",
    "influence": 1840503041,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Claríce",
    "influence": 1832012768,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "POLARI2",
    "influence": 1808268456,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Itz just DJ",
    "influence": 1805692427,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "ToKI",
    "influence": 1787921783,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Ayyyyy Papi Chuy",
    "influence": 1759694003,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Nêzuko",
    "influence": 1734124039,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Nıkaą",
    "influence": 1710901972,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "₩rath",
    "influence": 1709851662,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "DimViisel",
    "influence": 1674494713,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Glucose",
    "influence": 1671405152,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "BigDaddyJay27",
    "influence": 1652216105,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "FGD",
    "influence": 1642744075,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "FloridaMàn",
    "influence": 1607936307,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Diggman",
    "influence": 1545004775,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "VAL ℳ A Y Y",
    "influence": 1540346325,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Skyriver",
    "influence": 1514960022,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Deekz",
    "influence": 1514602820,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "poikatsuNOW",
    "influence": 1503800648,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Kongfue",
    "influence": 1350492998,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "MafiánkaB",
    "influence": 1307580739,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "PINK",
    "influence": 1297571203,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Redweyne",
    "influence": 1127393460,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "lirro",
    "influence": 978206148,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "Sexxy Mentality",
    "influence": 972155661,
    "rank_tier": "frontliner",
    "family_role": null
  },
  {
    "canonical_name": "SEA King",
    "influence": 2147968423,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "Ayys",
    "influence": 1628906670,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "愛eu",
    "influence": 963146708,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "MoodyAyy",
    "influence": 831225747,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "TopknifeCUBs8",
    "influence": 762982414,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "TopknifeCUBs6",
    "influence": 594117812,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "TopknifeCUBs3",
    "influence": 397986912,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "ELS CASH",
    "influence": 372362595,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "TopknifeCUBs10",
    "influence": 363334954,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "TopknifeCUBs11",
    "influence": 174754343,
    "rank_tier": "production",
    "family_role": null
  },
  {
    "canonical_name": "Dokun",
    "influence": 2484893529,
    "rank_tier": "stranger",
    "family_role": null
  }
]'::jsonb) AS roster(
  canonical_name text,
  influence bigint,
  rank_tier text,
  family_role text
);

UPDATE members
SET is_active = false,
    updated_at = now()
WHERE faction_id = (SELECT id FROM factions WHERE tag = 'ELS')
  AND canonical_name NOT IN (SELECT canonical_name FROM els_screenshot_roster);

INSERT INTO members (faction_id, canonical_name, influence, rank_tier, family_role, is_active)
SELECT
  (SELECT id FROM factions WHERE tag = 'ELS'),
  canonical_name,
  influence,
  rank_tier,
  family_role,
  true
FROM els_screenshot_roster
ON CONFLICT (faction_id, canonical_name) DO UPDATE
SET influence = EXCLUDED.influence,
    rank_tier = EXCLUDED.rank_tier,
    family_role = EXCLUDED.family_role,
    is_active = true,
    updated_at = now();
