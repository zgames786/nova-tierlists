function toPointsNumber(value) {
  return Number(value ?? 0)
}

/**
 * Stable sort: points descending, preserve original order for ties.
 */
export function sortPlayersByPointsDesc(players, getPoints) {
  return players
    .map((player, originalIndex) => ({ player, originalIndex }))
    .sort((a, b) => {
      const diff =
        toPointsNumber(getPoints(b.player)) - toPointsNumber(getPoints(a.player))
      if (diff !== 0) return diff
      return a.originalIndex - b.originalIndex
    })
    .map(({ player }) => player)
}

/**
 * Competition ranking (1, 1, 3) for a list sorted by points descending.
 */
export function getDisplayRank(players, index, getPoints) {
  if (!players?.length || index < 0 || index >= players.length) {
    return index + 1
  }

  if (index === 0) {
    return 1
  }

  const current = toPointsNumber(getPoints(players[index]))
  const previous = toPointsNumber(getPoints(players[index - 1]))

  if (current === previous) {
    return getDisplayRank(players, index - 1, getPoints)
  }

  return index + 1
}

/**
 * @param {{ competition?: boolean }} options
 *   competition true (Overall): 1, 1, 3 for tied points
 *   competition false (custom tiers): 1, 2, 3, 4…
 */
export function buildRankedPlayerRows(players, getPoints, options = {}) {
  const { competition = true } = options
  const sorted = sortPlayersByPointsDesc(players, getPoints)
  return sorted.map((player, index) => ({
    player,
    displayRank: competition ? getDisplayRank(sorted, index, getPoints) : index + 1,
  }))
}
