export interface MatchCandidate {
  member_id: string
  canonical_name: string
  confidence: number
}

function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  const matrix: number[][] = []

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const cost = aLower[j - 1] === bLower[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[bLower.length][aLower.length]
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0)
  const tokensB = b.toLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0)

  if (tokensA.length === 0 || tokensB.length === 0) return 0

  let matchCount = 0
  for (const tokenA of tokensA) {
    for (const tokenB of tokensB) {
      if (tokenA === tokenB || levenshteinDistance(tokenA, tokenB) <= 1) {
        matchCount++
        break
      }
    }
  }

  return matchCount / Math.max(tokensA.length, tokensB.length)
}

function cleanName(name: string): string {
  // Remove faction tags like [ELS], [SPS], etc.
  return name.replace(/^\[\w+\]\s*/, "").trim()
}

export function fuzzyMatch(
  rawName: string,
  candidates: Array<{ id: string; canonical_name: string; aliases?: string[] }>
): MatchCandidate[] {
  const cleanedRaw = cleanName(rawName)

  const scored = candidates.map(candidate => {
    const canonical = candidate.canonical_name
    const allNames = [canonical, ...(candidate.aliases || [])]

    let bestScore = 0

    for (const name of allNames) {
      const cleaned = cleanName(name)

      // If exact match (ignoring case), max score
      if (cleaned.toLowerCase() === cleanedRaw.toLowerCase()) {
        bestScore = 1.0
        break
      }

      // Levenshtein-based score
      const maxLen = Math.max(cleaned.length, cleanedRaw.length)
      const distance = levenshteinDistance(cleaned, cleanedRaw)
      const levenScore = Math.max(0, 1 - distance / maxLen)

      // Token similarity bonus
      const tokenScore = tokenSimilarity(cleaned, cleanedRaw)

      // Weighted combination
      const combined = levenScore * 0.6 + tokenScore * 0.4

      bestScore = Math.max(bestScore, combined)
    }

    return {
      member_id: candidate.id,
      canonical_name: candidate.canonical_name,
      confidence: bestScore,
    }
  })

  return scored.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

export function autoResolveMatch(candidates: MatchCandidate[]): MatchCandidate | null {
  if (candidates.length === 0) return null
  if (candidates[0].confidence >= 0.92) {
    const secondScore = candidates[1]?.confidence ?? 0
    if (secondScore < 0.75) {
      return candidates[0]
    }
  }
  return null
}
