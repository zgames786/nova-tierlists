import { DEFAULT_POINT_SYSTEM } from './tierlistsStorage'

export function getEffectiveTier(player) {
  if (player.tierMode === 'manual' && player.manualTier) {
    return player.manualTier
  }
  return player.autoTier ?? player.manualTier ?? 'Unranked'
}

export function resolvePlayerDisplay(player, tierlist) {
  const tier = getEffectiveTier(player)
  const pointSystem = {
    ...DEFAULT_POINT_SYSTEM,
    ...(tierlist?.pointSystem ?? tierlist?.tierPoints ?? {}),
  }
  return {
    tier,
    points: player.points ?? pointSystem[tier] ?? 0,
    autoTier: player.autoTier,
    isManual: player.tierMode === 'manual',
  }
}
