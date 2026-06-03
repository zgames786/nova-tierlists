export function getEffectiveTier(player) {
  if (player.tierMode === 'manual' && player.manualTier) {
    return player.manualTier
  }
  return player.autoTier ?? player.manualTier ?? 'F'
}

export function resolvePlayerDisplay(player, tierlist) {
  const tier = getEffectiveTier(player)
  const pointSystem = {
    'S+': 50,
    S: 35,
    A: 20,
    B: 10,
    C: 5,
    D: 2,
    F: 1,
    ...(tierlist?.pointSystem ?? tierlist?.tierPoints ?? {}),
  }
  return {
    tier,
    points: player.points ?? pointSystem[tier] ?? 0,
    autoTier: player.autoTier,
    isManual: player.tierMode === 'manual',
  }
}
