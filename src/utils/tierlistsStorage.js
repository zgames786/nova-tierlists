import { getEffectiveTier, resolvePlayerDisplay } from './tierlistHelpers'

export const STORAGE_KEY = 'novaTierlists'
export const DATA_VERSION = 4
export const OVERALL_ID = 'overall'

export const TIERS = ['S+', 'S', 'A', 'B', 'C', 'D', 'F']

export const DEFAULT_POINT_SYSTEM = {
  'S+': 50,
  S: 35,
  A: 20,
  B: 10,
  C: 5,
  D: 2,
  F: 1,
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
}

const LEGACY_ACCOUNTS_KEY = 'novasmp_admin_accounts'

const DEFAULT_OWNER = {
  username: 'ZGames786',
  password: 'NovaAdmin786',
  role: 'owner',
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

const DEFAULT_DATA = {
  version: DATA_VERSION,
  settings: {},
  admins: [DEFAULT_OWNER],
  logs: [],
  tierlists: [createDefaultTierlist()],
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
    const manualTier = player.manualTier ?? player.tier ?? 'F'
    return {
      id: player.id,
      name: player.name,
      tierMode: 'manual',
      autoTier,
      manualTier,
      points: player.points != null ? Number(player.points) : pointSystem[manualTier] ?? 0,
    }
  }

  return {
    id: player.id,
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
      const manualTier = player.manualTier ?? 'F'
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

/** Sum player points from all non-Overall tierlists; sort and assign position tiers. */
export function calculateOverall(data) {
  const overallIndex = data.tierlists.findIndex((t) => t.id === OVERALL_ID)
  if (overallIndex === -1) {
    return data
  }

  const overallTemplate = data.tierlists[overallIndex]
  const sourceTierlists = data.tierlists.filter((t) => !isOverallTierlist(t))

  const totals = new Map()

  for (const tierlist of sourceTierlists) {
    for (const player of tierlist.players) {
      const name = player.name.trim()
      if (!name) continue
      const display = resolvePlayerDisplay(player, tierlist)
      totals.set(name, (totals.get(name) ?? 0) + Number(display.points ?? 0))
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])

  const players = sorted.map(([name, totalPoints], index) => {
    const position = index + 1
    const autoTier = getAutoTierForPosition(position)
    const stableId = `overall-${slugify(name) || 'player'}`

    return {
      id: stableId,
      name,
      tierMode: 'auto',
      autoTier,
      manualTier: null,
      points: totalPoints,
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

function migrateTierlist(tierlist) {
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
    autoTierAssignment: tierlist.autoTierAssignment !== false,
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
        name: p.name,
        tierMode: 'auto',
        autoTier: p.tier ?? 'F',
        manualTier: null,
        points: p.points,
      },
      i + 1,
      base,
    )
  })

  const withPlayers = { ...base, players: migratedPlayers }
  return base.autoTierAssignment ? applyAutoAssignment(withPlayers) : withPlayers
}

function migrateAdmins(parsed) {
  if (parsed.admins?.length) {
    return parsed.admins
  }
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_ACCOUNTS_KEY) || '[]')
    if (legacy.length) return legacy
  } catch {
    /* ignore */
  }
  return [DEFAULT_OWNER]
}

function migrateData(parsed) {
  let tierlists = (parsed.tierlists ?? []).map(migrateTierlist)
  if (!tierlists.some((t) => t.id === OVERALL_ID)) {
    tierlists.unshift(createDefaultTierlist())
  }

  const data = {
    version: DATA_VERSION,
    settings: parsed.settings ?? {},
    admins: migrateAdmins(parsed),
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    tierlists,
  }

  return calculateOverall(data)
}

export function loadTierlists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const fresh = structuredClone(DEFAULT_DATA)
      saveTierlists(fresh)
      return fresh
    }
    const parsed = JSON.parse(raw)
    if (!parsed?.tierlists?.length) {
      const fresh = structuredClone(DEFAULT_DATA)
      saveTierlists(fresh)
      return fresh
    }
    const migrated = migrateData(parsed)
    saveTierlists(migrated)
    return migrated
  } catch {
    const fresh = structuredClone(DEFAULT_DATA)
    saveTierlists(fresh)
    return fresh
  }
}

export function saveTierlists(data) {
  const calculated = calculateOverall(data)
  const toSave = { ...calculated, version: DATA_VERSION }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  if (toSave.admins?.length) {
    localStorage.setItem(LEGACY_ACCOUNTS_KEY, JSON.stringify(toSave.admins))
  }
  return toSave
}

export function getAdminsFromData(data) {
  return data?.admins?.length ? data.admins : [DEFAULT_OWNER]
}

export function setAdminsInData(data, admins) {
  return { ...data, admins }
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
  return saveTierlists(data)
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
    autoTierAssignment: true,
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

export function addPlayer(data, tierlistId, payload) {
  const blocked = rejectOverallMutation(tierlistId)
  if (blocked) return blocked

  const trimmed = payload.name?.trim()
  if (!trimmed) {
    return { success: false, error: 'Player name is required.' }
  }

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  const position = tierlist.players.length + 1
  const selectedTier = payload.manualTier ?? 'F'
  const tierMode =
    payload.tierMode ??
    (tierlist.autoTierAssignment && !payload.manualTier ? 'auto' : 'manual')

  const player = {
    id: uniqueId('player'),
    name: trimmed,
    tierMode: tierMode === 'auto' ? 'auto' : 'manual',
    autoTier: getAutoTierForPosition(position),
    manualTier: tierMode === 'manual' ? selectedTier : null,
    points:
      payload.points != null && payload.points !== ''
        ? Number(payload.points)
        : getPointsForTier(
            tierlist,
            tierMode === 'manual' ? selectedTier : getAutoTierForPosition(position),
          ),
  }

  let updated = { ...tierlist, players: [...tierlist.players, player] }
  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next, player }
}

export function updatePlayer(data, tierlistId, playerId, payload) {
  const blocked = rejectOverallMutation(tierlistId)
  if (blocked) return blocked

  const trimmed = payload.name?.trim()
  if (!trimmed) {
    return { success: false, error: 'Player name is required.' }
  }

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
  const tierMode = tierlist.autoTierAssignment ? payload.tierMode ?? 'auto' : 'manual'
  const manualTier = tierMode === 'manual' ? payload.manualTier ?? 'F' : null
  const points =
    payload.points != null && payload.points !== ''
      ? Number(payload.points)
      : tierMode === 'manual'
        ? getPointsForTier(tierlist, manualTier)
        : getPointsForTier(tierlist, autoTier)

  const updatedPlayer = {
    ...tierlist.players[index],
    name: trimmed,
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
  return { success: true, data: next }
}

export function deletePlayer(data, tierlistId, playerId) {
  const blocked = rejectOverallMutation(tierlistId)
  if (blocked) return blocked

  const tierlist = data.tierlists.find((t) => t.id === tierlistId)
  if (!tierlist) {
    return { success: false, error: 'Tierlist not found.' }
  }

  const removed = tierlist.players.find((p) => p.id === playerId)

  let updated = {
    ...tierlist,
    players: tierlist.players.filter((p) => p.id !== playerId),
  }
  updated = finalizeTierlist(updated)
  const next = persist(mapTierlist(data, tierlistId, () => updated))
  return { success: true, data: next, removed }
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
