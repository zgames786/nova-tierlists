import { isOverallTierlist } from './tierlistsStorage'

export const DEFAULT_PLAYER_TIER = 'Unranked'
export const DEFAULT_PLAYER_POINTS = 0

function uniqueId(base) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : suffix
}

export function createDefaultTierlistEntry(smpPlayer) {
  return {
    id: `entry-${smpPlayer.id}`,
    smpPlayerId: smpPlayer.id,
    name: smpPlayer.name,
    tierMode: 'manual',
    manualTier: DEFAULT_PLAYER_TIER,
    autoTier: null,
    points: DEFAULT_PLAYER_POINTS,
  }
}

export function getActiveSmpPlayers(data) {
  return (data.smpPlayers ?? []).filter((player) => player.status === 'active')
}

export function migrateLegacyToGlobalPlayers(data) {
  if ((data.smpPlayers ?? []).length > 0) {
    return data
  }

  const nameToSmp = new Map()
  const smpPlayers = []

  for (const tierlist of data.tierlists ?? []) {
    if (isOverallTierlist(tierlist)) continue
    for (const player of tierlist.players ?? []) {
      const name = player.name?.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (nameToSmp.has(key)) continue
      const smp = {
        id: uniqueId('smp'),
        name,
        createdAt: new Date().toISOString(),
        createdBy: 'migration',
        status: 'active',
      }
      smpPlayers.push(smp)
      nameToSmp.set(key, smp)
    }
  }

  if (smpPlayers.length === 0) {
    return { ...data, smpPlayers: [] }
  }

  const tierlists = (data.tierlists ?? []).map((tierlist) => {
    if (isOverallTierlist(tierlist)) {
      return { ...tierlist, players: [] }
    }

    const players = (tierlist.players ?? []).map((player) => {
      const smp = nameToSmp.get(player.name?.trim()?.toLowerCase())
      if (!smp) return player
      return {
        ...player,
        smpPlayerId: smp.id,
        id: player.id ?? `entry-${smp.id}`,
      }
    })

    return { ...tierlist, players }
  })

  return { ...data, smpPlayers, tierlists }
}

function resolveSmpPlayerId(player) {
  if (player.smpPlayerId) return player.smpPlayerId
  if (player.id?.startsWith('entry-')) return player.id.slice('entry-'.length)
  return player.id ?? null
}

export function syncTierlistsWithSmpPlayers(data) {
  const smpPlayers = getActiveSmpPlayers(data)
  const smpById = new Map(smpPlayers.map((smp) => [smp.id, smp]))
  const smpByName = new Map(smpPlayers.map((smp) => [smp.name.toLowerCase(), smp]))

  const tierlists = (data.tierlists ?? []).map((tierlist) => {
    if (isOverallTierlist(tierlist)) {
      return { ...tierlist, players: [] }
    }

    const players = []
    const seenSmpIds = new Set()

    for (const player of tierlist.players ?? []) {
      let smpId = resolveSmpPlayerId(player)
      let smp = smpId ? smpById.get(smpId) : null

      if (!smp && player.name) {
        smp = smpByName.get(player.name.trim().toLowerCase())
        if (smp) smpId = smp.id
      }

      if (!smp) continue

      seenSmpIds.add(smp.id)
      players.push({
        ...player,
        id: player.id ?? `entry-${smp.id}`,
        smpPlayerId: smp.id,
        name: smp.name,
      })
    }

    for (const smp of smpPlayers) {
      if (!seenSmpIds.has(smp.id)) {
        players.push(createDefaultTierlistEntry(smp))
      }
    }

    return { ...tierlist, players }
  })

  return { ...data, tierlists }
}
