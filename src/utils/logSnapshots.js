import { getPointSystem } from './tierlistsStorage'

export function snapshotPlayer(player) {
  if (!player) return null
  return {
    id: player.id,
    name: player.name,
    tierMode: player.tierMode ?? 'auto',
    autoTier: player.autoTier ?? null,
    manualTier: player.manualTier ?? null,
    points: player.points ?? 0,
  }
}

export function snapshotPlayers(players = []) {
  return players.map(snapshotPlayer)
}

export function snapshotPointSystem(tierlist) {
  return { ...getPointSystem(tierlist) }
}

export function snapshotTierlistForCreate(tierlist) {
  return {
    id: tierlist.id,
    name: tierlist.name,
    isDefault: Boolean(tierlist.isDefault),
    isCalculated: Boolean(tierlist.isCalculated),
    autoTierAssignment: tierlist.autoTierAssignment !== false,
    pointSystem: snapshotPointSystem(tierlist),
    icon: tierlist.icon ?? null,
    color: tierlist.color ?? null,
    description: tierlist.description ?? '',
    contributesToOverall: tierlist.contributesToOverall !== false,
    players: snapshotPlayers(tierlist.players),
  }
}
