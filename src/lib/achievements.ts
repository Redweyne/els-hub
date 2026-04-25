/**
 * Achievement derivation — purely client-side, no schema change required.
 * Pass in a member's event_scores history (newest first) and get back a list
 * of unlocked achievement keys with metadata.
 */

export interface ScoreInput {
  eventId: string
  rank: number
  points: number
  createdAt: string
  eventTypeCode?: string | null
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

  const seen = new Set<string>()
  return out.filter((a) => {
    if (seen.has(a.key)) return false
    seen.add(a.key)
    return true
  })
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
