/**
 * Achievement derivation — purely client-side, no schema change required.
 * Pass in a member's event_scores history (newest first) and get back a list
 * of unlocked achievement keys with metadata.
 */

import { getEventConfig, type EventTypeCode } from "@/lib/events/config"

export interface ScoreInput {
  eventId: string
  rank: number
  points: number
  createdAt: string
  eventTypeCode?: string | null
  /** GW Daily metadata if applicable — used to compute streaks. */
  gwMeta?: {
    campaign_id: string
    cycle: "war" | "hegemony"
    super_cycle: number
    day_in_cycle: 1 | 2 | 3 | 4 | 5
    day_type: "robbing" | "kingpin" | "influence" | "speedups" | "massacre"
    min_points: number
  } | null
  /** For Oak: faction placement (1-5). */
  oakPlacement?: number | null
  /** For Oak: this member's name in best_of_all categories. */
  oakBestOf?: Array<"total" | "kill" | "occupation"> | null
}

export interface Achievement {
  key: string
  label: string
  description: string
  tier: "gold" | "silver" | "bronze" | "ember"
  unlockedAt?: string
  progress?: { current: number; target: number }
}

const FOUNDATION_CUTOFF_ISO = "2026-04-15T00:00:00.000Z"

export function deriveAchievements(
  scores: ScoreInput[],
  member?: { joinedAt?: string | null; isSeeded?: boolean },
): Achievement[] {
  const out: Achievement[] = []

  if (!scores || scores.length === 0) {
    if (member?.isSeeded || isFoundationMember(member?.joinedAt)) {
      out.push(FOUNDATION_ACHIEVEMENT)
    }
    return out
  }

  const orderedNewToOld = [...scores].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const orderedOldToNew = [...scores].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  if (
    member?.isSeeded ||
    isFoundationMember(member?.joinedAt) ||
    isFoundationByAge(orderedOldToNew[0]?.createdAt)
  ) {
    out.push(FOUNDATION_ACHIEVEMENT)
  }

  if (scores.length >= 20) {
    out.push({
      key: "veteran",
      label: "Veteran",
      description: "20+ events recorded",
      tier: "silver",
      progress: { current: scores.length, target: 20 },
    })
  } else if (scores.length >= 10) {
    out.push({
      key: "tested",
      label: "Tested",
      description: "10+ events recorded",
      tier: "bronze",
      progress: { current: scores.length, target: 20 },
    })
  }

  let consecutiveTopTen = 0
  let bestConsecutiveTopTen = 0
  for (const s of orderedNewToOld) {
    if (s.rank <= 10) {
      consecutiveTopTen++
      bestConsecutiveTopTen = Math.max(
        bestConsecutiveTopTen,
        consecutiveTopTen,
      )
    } else {
      consecutiveTopTen = 0
    }
  }
  if (bestConsecutiveTopTen >= 5) {
    out.push({
      key: "consistency",
      label: "Consistency",
      description: `${bestConsecutiveTopTen} consecutive Top-10 finishes`,
      tier: "gold",
    })
  } else if (bestConsecutiveTopTen >= 3) {
    out.push({
      key: "steady",
      label: "Steady Hand",
      description: `${bestConsecutiveTopTen} consecutive Top-10 finishes`,
      tier: "bronze",
      progress: { current: bestConsecutiveTopTen, target: 5 },
    })
  }

  let consecutiveImproved = 0
  let bestConsecutiveImproved = 0
  for (let i = orderedOldToNew.length - 1; i >= 1; i--) {
    const newer = orderedOldToNew[i]
    const older = orderedOldToNew[i - 1]
    if (newer.rank < older.rank) {
      consecutiveImproved++
      bestConsecutiveImproved = Math.max(
        bestConsecutiveImproved,
        consecutiveImproved,
      )
    } else {
      consecutiveImproved = 0
    }
  }
  if (bestConsecutiveImproved >= 3) {
    out.push({
      key: "rising",
      label: "Rising",
      description: `${bestConsecutiveImproved} consecutive rank improvements`,
      tier: "ember",
    })
  }

  const bestRank = Math.min(...scores.map((s) => s.rank))
  if (bestRank === 1) {
    out.push({
      key: "first-place",
      label: "First Blood",
      description: "Earned a #1 finish",
      tier: "gold",
    })
  } else if (bestRank <= 3) {
    out.push({
      key: "legend",
      label: "Legend",
      description: `Best finish: #${bestRank}`,
      tier: "silver",
    })
  } else if (bestRank <= 10) {
    out.push({
      key: "frontline",
      label: "Frontline",
      description: `Best finish: #${bestRank}`,
      tier: "bronze",
      progress: { current: 11 - bestRank, target: 10 },
    })
  }

  // ── Oak achievements ──────────────────────────────────────────────────
  const oakScores = scores.filter((s) => normalizeCode(s.eventTypeCode) === "oak")
  if (oakScores.length > 0) {
    const oakWins = oakScores.filter((s) => s.oakPlacement === 1).length
    if (oakWins >= 3) {
      out.push({
        key: "oak-holder",
        label: "Oak Holder",
        description: `${oakWins} Oakvale victories`,
        tier: "gold",
        progress: { current: oakWins, target: oakWins },
      })
    } else if (oakWins >= 1) {
      out.push({
        key: "oak-podium",
        label: "Oak Champion",
        description: `${oakWins} Oakvale victor${oakWins === 1 ? "y" : "ies"}`,
        tier: "silver",
        progress: { current: oakWins, target: 3 },
      })
    }
    const heroAppearances = oakScores.reduce(
      (sum, s) => sum + (s.oakBestOf?.length ?? 0),
      0,
    )
    if (heroAppearances >= 3) {
      out.push({
        key: "oak-hero",
        label: "Oak Hero",
        description: `Named in ${heroAppearances} "Best of All" entries`,
        tier: "gold",
      })
    } else if (heroAppearances >= 1) {
      out.push({
        key: "oak-named",
        label: "Oak Named",
        description: `Named in ${heroAppearances} "Best of All" entr${heroAppearances === 1 ? "y" : "ies"}`,
        tier: "ember",
        progress: { current: heroAppearances, target: 3 },
      })
    }
  }

  // ── GW achievements ───────────────────────────────────────────────────
  const gwScores = scores.filter(
    (s) => normalizeCode(s.eventTypeCode) === "gw_daily" && s.gwMeta,
  )
  if (gwScores.length > 0) {
    const robbingHits = gwScores.filter(
      (s) => s.gwMeta?.day_type === "robbing" && s.points >= (s.gwMeta?.min_points ?? Infinity),
    )
    // "Robber Baron" — hit robbing across at least 3 super-cycles in any campaign.
    const robberSuperCycles = new Set<string>()
    for (const r of robbingHits) {
      if (r.gwMeta) {
        robberSuperCycles.add(`${r.gwMeta.campaign_id}:${r.gwMeta.super_cycle}`)
      }
    }
    if (robberSuperCycles.size >= 3) {
      out.push({
        key: "robber-baron",
        label: "Robber Baron",
        description: `Robbing threshold cleared across ${robberSuperCycles.size} super-cycles`,
        tier: "gold",
      })
    } else if (robberSuperCycles.size >= 1) {
      out.push({
        key: "robber",
        label: "Robber",
        description: `Robbing threshold cleared in ${robberSuperCycles.size} super-cycle${robberSuperCycles.size === 1 ? "" : "s"}`,
        tier: "bronze",
        progress: { current: robberSuperCycles.size, target: 3 },
      })
    }

    // "Iron Will" — every threshold hit in a single campaign.
    const byCampaign = new Map<string, ScoreInput[]>()
    for (const s of gwScores) {
      const cid = s.gwMeta?.campaign_id
      if (!cid) continue
      const list = byCampaign.get(cid) ?? []
      list.push(s)
      byCampaign.set(cid, list)
    }
    for (const [, campaignScores] of byCampaign) {
      const allHit = campaignScores.every(
        (s) => s.points >= (s.gwMeta?.min_points ?? Infinity),
      )
      if (campaignScores.length >= 10 && allHit) {
        out.push({
          key: "iron-will",
          label: "Iron Will",
          description: `Every threshold cleared across ${campaignScores.length} GW days`,
          tier: "gold",
        })
        break
      }
    }

    // "Soldier" — participated in 5+ GW dailies (any threshold).
    if (gwScores.length >= 20) {
      out.push({
        key: "war-veteran",
        label: "War Veteran",
        description: `${gwScores.length} GW dailies recorded`,
        tier: "silver",
      })
    } else if (gwScores.length >= 5) {
      out.push({
        key: "soldier",
        label: "Soldier",
        description: `${gwScores.length} GW dailies recorded`,
        tier: "bronze",
        progress: { current: gwScores.length, target: 20 },
      })
    }
  }

  const seen = new Set<string>()
  return out.filter((a) => {
    if (seen.has(a.key)) return false
    seen.add(a.key)
    return true
  })
}

function normalizeCode(raw: string | null | undefined): EventTypeCode | null {
  return getEventConfig(raw)?.code ?? null
}

function isFoundationMember(joinedAt?: string | null): boolean {
  if (!joinedAt) return false
  return new Date(joinedAt) <= new Date(FOUNDATION_CUTOFF_ISO)
}

function isFoundationByAge(firstScoreAt?: string): boolean {
  if (!firstScoreAt) return false
  return new Date(firstScoreAt) <= new Date(FOUNDATION_CUTOFF_ISO)
}

const FOUNDATION_ACHIEVEMENT: Achievement = {
  key: "foundation",
  label: "Foundation",
  description: "Day-One ELYSIUM member",
  tier: "ember",
}
