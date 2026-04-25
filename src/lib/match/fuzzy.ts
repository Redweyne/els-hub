export interface MatchCandidate {
  member_id: string
  canonical_name: string
  confidence: number
  reason?: string
  matched_on?: string
}

const lookalikes: Record<string, string> = {
  "Α": "A",
  "А": "A",
  "Ꭺ": "A",
  "Δ": "A",
  "α": "a",
  "а": "a",
  "Β": "B",
  "В": "B",
  "С": "C",
  "с": "c",
  "Ε": "E",
  "е": "e",
  "Ι": "I",
  "І": "I",
  "ı": "i",
  "Κ": "K",
  "О": "O",
  "ο": "o",
  "о": "o",
  "Ρ": "P",
  "р": "p",
  "Ѕ": "S",
  "Τ": "T",
  "Υ": "Y",
  "у": "y",
  "Χ": "X",
  "х": "x",
  "ω": "w",
  "Ł": "L",
  "ł": "l",
  "Ø": "O",
  "ø": "o",
  "₩": "W",
  "¥": "Y",
}

function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLocaleLowerCase()
  const bLower = b.toLocaleLowerCase()
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
  const tokensA = a.toLocaleLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0)
  const tokensB = b.toLocaleLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0)

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
  return name
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\bELS\b/gi, " ")
    .replace(/\bS78\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeLoose(name: string): string {
  return cleanName(name)
    .normalize("NFKC")
    .replace(/[^\S\r\n]+/g, " ")
    .split("")
    .map((char) => lookalikes[char] ?? char)
    .join("")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "")
    .toLocaleLowerCase()
}

function normalizeDecorated(name: string): string {
  return cleanName(name)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase()
}

function hasStrongSubstring(a: string, b: string) {
  if (a.length < 5 || b.length < 5) return false
  return a.includes(b) || b.includes(a)
}

function scoreName(rawName: string, candidateName: string) {
  const rawClean = cleanName(rawName)
  const candidateClean = cleanName(candidateName)
  const rawDecorated = normalizeDecorated(rawClean)
  const candidateDecorated = normalizeDecorated(candidateClean)
  const rawLoose = normalizeLoose(rawClean)
  const candidateLoose = normalizeLoose(candidateClean)

  if (!rawLoose || !candidateLoose) {
    return { score: 0, reason: "empty" }
  }

  if (rawClean === candidateClean) return { score: 1, reason: "exact" }
  if (rawDecorated === candidateDecorated) return { score: 0.995, reason: "case-normalized exact" }
  if (rawLoose === candidateLoose) return { score: 0.985, reason: "normalized exact" }

  const maxLen = Math.max(candidateLoose.length, rawLoose.length)
  const distance = levenshteinDistance(candidateLoose, rawLoose)
  const levenScore = Math.max(0, 1 - distance / maxLen)
  const tokenScore = tokenSimilarity(candidateDecorated, rawDecorated)
  const substringBonus = hasStrongSubstring(candidateLoose, rawLoose) ? 0.08 : 0
  const lengthPenalty = Math.abs(candidateLoose.length - rawLoose.length) / Math.max(candidateLoose.length, rawLoose.length)
  const combined = Math.max(0, Math.min(0.97, levenScore * 0.72 + tokenScore * 0.2 + substringBonus - lengthPenalty * 0.12))

  return { score: combined, reason: "fuzzy normalized" }
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
    let bestReason = "none"
    let bestMatchedName = canonical

    for (const name of allNames) {
      const { score, reason } = scoreName(cleanedRaw, name)
      if (score > bestScore) {
        bestScore = score
        bestReason = reason
        bestMatchedName = name
      }
    }

    return {
      member_id: candidate.id,
      canonical_name: candidate.canonical_name,
      confidence: bestScore,
      reason: bestReason,
      matched_on: bestMatchedName,
    }
  })

  return scored
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

export function autoResolveMatch(candidates: MatchCandidate[]): MatchCandidate | null {
  if (candidates.length === 0) return null
  const [best, second] = candidates
  const secondScore = second?.confidence ?? 0
  const gap = best.confidence - secondScore

  if (best.confidence >= 0.985) return best
  if (best.confidence >= 0.94 && gap >= 0.06) return best
  if (best.confidence >= 0.88 && gap >= 0.18) return best

  return null
}

export function shouldSaveAlias(rawName: string, candidate: MatchCandidate) {
  const cleanedRaw = cleanName(rawName)
  if (!cleanedRaw) return false
  if (cleanedRaw === candidate.canonical_name) return false
  if (candidate.matched_on === cleanedRaw) return false
  return candidate.confidence >= 0.94
}

export function canonicalAlias(rawName: string) {
  return cleanName(rawName)
}

export function isLikelyFactionMemberName(rawName: string) {
  const cleaned = cleanName(rawName)
  if (!cleaned) return false
  if (/^\d+$/.test(cleaned)) return false
  if (cleaned.length < 2) return false
  return true
}

export function uniqueNameKey(rawName: string) {
  const normalized = normalizeLoose(rawName)
  return normalized || normalizeDecorated(rawName)
}

export function normalizeForDebug(rawName: string) {
  return {
    clean: cleanName(rawName),
    loose: normalizeLoose(rawName),
  }
}
