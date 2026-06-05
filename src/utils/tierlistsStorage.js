import { getEffectiveTier, resolvePlayerDisplay } from './tierlistHelpers'
import { getActiveSmpPlayers } from './playerSync'
import { getDisplayRank } from './rankingDisplay'

export const DATA_VERSION = 5
export const OVERALL_ID = 'overall'
export const DEFAULT_TIER = 'Unranked'

export const TIERS = ['S+', 'S', 'A', 'B', 'C', 'D', 'F', 'Unranked']

export const DEFAULT_POINT_SYSTEM = {
  'S+': 50,
  S: 35,
  A: 20,
  B: 10,
  C: 5,
  D: 2,
  F: 1,
  Unranked: 0,
}

export const DEFAULT_TIER_POINTS = DEFAULT_POINT_SYSTEM

export const TIER_COLORS = {
  'S+': '#ffd700',
  S: '#e879f9',
  A: '#4ade80',
  B: '#60a5fa',
  C: '#fbbf24',
  D: '#fb923c',
  F: '#f87171',
  Unranked: '#94a3b8',
}

export function getAutoTierForPosition(position) {
  if (position === 1) return 'S+'
  if (position >= 2 && position <= 5) return 'S'
  if (position >= 6 && position <= 10) return 'A'
  if (position >= 11 && position <= 15) return 'B'
  if (position >= 16 && position <= 20) return 'C'
  if (position >= 21 && position <= 25) return 'D'
  return 'F'
}

export function isOverallTierlist(tierlist) {
  return tierlist?.id === OVERALL_ID || tierlist?.isCalculated === true
}

function createDefaultTierlist(overrides = {}) {
  const isOverall = overrides.id === OVERALL_ID || overrides.isCalculated
  return {
    id: OVERALL_ID,
    name: 'Overall',
    isDefault: true,
    isCalculated: true,
    autoTierAssignment: true,
    pointSystem: { ...DEFAULT_POINT_SYSTEM },
    icon: null,
    color: null,
    description: '',
    contributesToOverall: false,
    players: [],
    ...overrides,
    ...(isOverall
      ? { id: OVERALL_ID, isDefault: true, isCalculated: true, contributesToOverall: false }
      : { isDefault: false, isCalculated: false, contributesToOverall: true }),
  }
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueId(base) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : suffix
}

export function getPointSystem(tierlist) {
  return {
    ...DEFAULT_POINT_SYSTEM,
    ...(tierlist?.pointSystem ?? tierlist?.tierPoints ?? {}),
  }
}

export function getPointsForTier(tierlist, tier) {
  return getPointSystem(tierlist)[tier] ?? 0
}

export function getDefaultPoints(tierlist, tier) {
  return getPointsForTier(tierlist, tier)
}

export { getEffectiveTier, resolvePlayerDisplay } from './tierlistHelpers'

function normalizePlayer(player, position, tierlist) {
  const autoTier = getAutoTierForPosition(position)
  const pointSystem = getPointSystem(tierlist)

  if (player.tierMode === 'manual') {
    const manualTier = player.manualTier ?? player.tier ?? DEFAULT_TIER
    return {
      id: player.id,
      smpPlayerId: player.smpPlayerId ?? null,
      name: player.name,
      tierMode: 'manual',
      autoTier,
      manualTier,
      points:
        player.points != null ? Number(player.points) : pointSystem[manualTier] ?? 0,
    }
  }

  return {
    id: player.id,
    smpPlayerId: player.smpPlayerId ?? null,
    name: player.name,
    tierMode: 'auto',
    autoTier,
    manualTier: null,
    points: pointSystem[autoTier] ?? 0,
  }
}

export function applyAutoAssignment(tierlist) {
  if (isOverallTierlist(tierlist)) {
    return tierlist
  }

  const pointSystem = getPointSystem(tierlist)

  if (!tierlist.autoTierAssignment) {
    return {
      ...tierlist,
      players: tierlist.players.map((p, i) => {
        const manualTier = p.manualTier ?? getEffectiveTier(p)
        return {
          ...p,
          tierMode: 'manual',
          autoTier: getAutoTierForPosition(i + 1),
          manualTier,
          points:
            p.points != null ? Number(p.points) : getPointsForTier(tierlist, manualTier),
        }
      }),
    }
  }

  const players = tierlist.players.map((player, index) => {
    const position = index + 1
    const autoTier = getAutoTierForPosition(position)

    if (player.tierMode === 'manual') {
      const manualTier = player.manualTier ?? DEFAULT_TIER
      return {
        ...player,
        autoTier,
        manualTier,
        tierMode: 'manual',
        points:
          player.points != null ? Number(player.points) : pointSystem[manualTier] ?? 0,
      }
    }

    return {
      ...player,
      tierMode: 'auto',
      autoTier,
      manualTier: null,
      points: pointSystem[autoTier] ?? 0,
    }
  })

  return { ...tierlist, players }
}

/** Sum player points from all non-Overall tierlists; include all SMP players. */
export function calculateOverall(data) {
  const overallIndex = data.tierlists.findIndex((t) => t.id === OVERALL_ID)
  if (overallIndex === -1) {
    return data
  }

  const overallTemplate = data.tierlists[overallIndex]
  const sourceTierlists = data.tierlists.filter((t) => !isOverallTierlist(t))
  const smpPlayers = getActiveSmpPlayers(data)

  const totals = new Map(
    smpPlayers.map((player) => [
      player.id,
      { name: player.name, smpPlayerId: player.id, points: 0 },
    ]),
  )

  for (const tierlist of sourceTierlists) {
    for (const player of tierlist.players) {
      const smpId = player.smpPlayerId ?? player.id
      if (!totals.has(smpId)) continue
      const display = resolvePlayerDisplay(player, tierlist)
      totals.get(smpId).points += Number(display.points ?? 0)
    }
  }

  const sorted = smpPlayers
    .map((smp, order) => {
      const entry = totals.get(smp.id)
      return entry ? { ...entry, order } : null
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return a.order - b.order
    })

  const players = sorted.map((entry, index) => {
    const rank = getDisplayRank(sorted, index, (row) => row.points)
    const autoTier = getAutoTierForPosition(rank)
    const stableId = `overall-${slugify(entry.name) || entry.smpPlayerId}`

    return {
      id: stableId,
      smpPlayerId: entry.smpPlayerId,
      name: entry.name,
      tierMode: 'auto',
      autoTier,
      manualTier: null,
      points: entry.points,
    }
  })

  const overall = {
    ...overallTemplate,
    isDefault: true,
    isCalculated: true,
    autoTierAssignment: true,
    players,
  }

  const tierlists = [...data.tierlists]
  tierlists[overallIndex] = overall

  return { ...data, tierlists }
}

export function migrateTierlistFromRaw(tierlist) {
  const isOverall = tierlist.id === OVERALL_ID

  const pointSystem = {
    ...DEFAULT_POINT_SYSTEM,
    ...(tierlist.pointSystem || tierlist.tierPoints || {}),
  }

  const base = {
    id: tierlist.id,
    name: tierlist.name,
    isDefault: isOverall ? true : Boolean(tierlist.isDefault),
    isCalculated: isOverall ? true : Boolean(tierlist.isCalculated),
    autoTierAssignment: isOverall ? true : tierlist.autoTierAssignment === true,
    pointSystem,
    icon: tierlist.icon ?? null,
    color: tierlist.color ?? null,
    description: tierlist.description ?? '',
    contributesToOverall: isOverall ? false : tierlist.contributesToOverall !== false,
    players: isOverall ? [] : (tierlist.players ?? []),
  }

  if (isOverall) {
    return base
  }

  const migratedPlayers = base.players.map((p, i) => {
    if (p.tierMode) {
      return normalizePlayer(p, i + 1, base)
    }
    return normalizePlayer(
      {
        id: p.id,
        smpPlayerId: p.smpPlayerId,
        name: p.name,
        tierMode: 'manual',
        manualTier: p.tier ?? p.manualTier ?? DEFAULT_TIER,
        points: p.points,
      },
      i + 1,
      base,
    )
  })

  const withPlayers = { ...base, players: migratedPlayers }
  return base.autoTierAssignment ? applyAutoAssignment(withPlayers) : withPlayers
}

function mapTierlist(data, tierlistId, fn) {
  return {
    ...data,
    tierlists: data.tierlists.map((t) => (t.id === tierlistId ? fn(t) : t)),
  }
}

function finalizeTierlist(tierlist) {
  if (isOverallTierlist(tierlist)) {
    return tierlist
  }
  return tierlist.autoTierAssignment ? applyAutoAssignment(tierlist) : tierlist
}

function persist(data) {
  const calculated = calculateOverall({
    version: DATA_VERSION,
    settings: data.settings ?? {},
    logs: Array.isArray(data.logs) ? data.logs : [],
    smpPlayers: data.smpPlayers ?? [],
    suggestions: data.suggestions ?? [],
    tierlists: data.tierlists ?? [],
  })
  return {
    ...calculated,
    admins: data.admins ?? [],
    smpPlayers: data.smpPlayers ?? [],
    suggestions: data.suggestions ?? [],
  }
}

function rejectOverallMutation(tierlistId) {
  if (tierlistId === OVERALL_ID) {
    return { success: false, error: 'Overall is auto-calculated and cannot be edited manually.' }
  }
  return null
}

export function createTierlist(data, name) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Tierlist name is required.' }
  }

  if (data.tierlists.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'A tierlist with that name already exists.' }
  }

  const tierlist = {
    id: uniqueId(slugify(trimmed) || 'tierlist'),
    name: trimmed,
    isDefault: false,
    isCalculated: false,
    autoTierAssignment: false,
    pointSystem: { ...DEFAULT_POINT_SYSTEM },
    icon: null,
    color: null,
    description: '',
    contributesToOverall: true,
    players: [],
  }

  const next = persist({ ...data, tierlists: [...data.tierlists, tierlist] })
  return { success: true, data: next, tierlist }
}

export function deleteTierlist(data, tierlistId) {
  const rejected = rejectOverallMutation(tierlistId)
  if (rejected) {
    return { success: false, error: 'The Overall tierlist cannot be deleted.' }
  }

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  if (isOverallTierlist(tierlist)) {
    return { success: false, error: 'The Overall tierlist cannot be deleted.' }
  }

  const next = persist({
    ...data,
    tierlists: data.tierlists.filter((t) => t.id !== tierlistId),
  })

  return { success: true, data: next, tierlist }
}

export function updateTierlistSettings(data, tierlistId, settings) {
  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  if (isOverallTierlist(tierlist)) {
    return { success: false, error: 'Overall tierlist settings cannot be changed.' }
  }

  const trimmedName = settings.name?.trim()
  if (!trimmedName) {
    return { success: false, error: 'Tierlist name is required.' }
  }

  const duplicate = data.tierlists.some(
    (t) => t.id !== tierlistId && t.name.toLowerCase() === trimmedName.toLowerCase(),
  )
  if (duplicate) {
    return { success: false, error: 'A tierlist with that name already exists.' }
  }

  const oldName = tierlist.name
  let updated = {
    ...tierlist,
    name: trimmedName,
    autoTierAssignment: Boolean(settings.autoTierAssignment),
    description: settings.description ?? tierlist.description,
    icon: settings.icon ?? tierlist.icon,
    color: settings.color ?? tierlist.color,
  }

  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next, oldName }
}

export function updatePointSystem(data, tierlistId, pointSystem) {
  if (tierlistId === OVERALL_ID) {
    return { success: false, error: 'Overall uses calculated rankings only.' }
  }

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  const merged = { ...getPointSystem(tierlist), ...pointSystem }

  let updated = {
    ...tierlist,
    pointSystem: merged,
    players: tierlist.players.map((p) => {
      if (p.tierMode === 'manual') {
        const tier = getEffectiveTier(p)
        if (p.points == null || p.points === getPointsForTier(tierlist, tier)) {
          return { ...p, points: merged[tier] ?? p.points }
        }
        return p
      }
      const tier = getEffectiveTier(p)
      return { ...p, points: merged[tier] ?? p.points }
    }),
  }

  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next }
}

export function updateTierlistPlayerRank(data, tierlistId, playerId, payload) {
  const blocked = rejectOverallMutation(tierlistId)
  if (blocked) return blocked

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  const index = tierlist.players.findIndex((p) => p.id === playerId)
  if (index === -1) {
    return { success: false, error: 'Player not found.' }
  }

  const position = index + 1
  const autoTier = getAutoTierForPosition(position)
  const tierMode = tierlist.autoTierAssignment ? payload.tierMode ?? 'manual' : 'manual'
  const manualTier = tierMode === 'manual' ? payload.manualTier ?? DEFAULT_TIER : null
  const points =
    payload.points != null && payload.points !== ''
      ? Number(payload.points)
      : tierMode === 'manual'
        ? getPointsForTier(tierlist, manualTier)
        : getPointsForTier(tierlist, autoTier)

  const updatedPlayer = {
    ...tierlist.players[index],
    tierMode,
    autoTier,
    manualTier,
    points,
  }

  let updated = {
    ...tierlist,
    players: tierlist.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
  }
  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next, player: updatedPlayer }
}

export function movePlayer(data, tierlistId, playerId, direction) {
  const blocked = rejectOverallMutation(tierlistId)
  if (blocked) return blocked

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  const index = tierlist.players.findIndex((p) => p.id === playerId)
  if (index === -1) {
    return { success: false, error: 'Player not found.' }
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= tierlist.players.length) {
    return { success: false, error: 'Cannot move player further.' }
  }

  const players = [...tierlist.players]
  const moved = players[index]
  ;[players[index], players[targetIndex]] = [players[targetIndex], players[index]]

  let updated = { ...tierlist, players }
  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next, moved }
}

export function getAutoTierRangesLabel() {
  return '1=S+ · 2–5=S · 6–10=A · 11–15=B · 16–20=C · 21–25=D · 26+=F'
}
