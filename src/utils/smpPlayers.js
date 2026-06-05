function uniqueId(base) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : suffix
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeSmpPlayers(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((player) => ({
    id: player.id,
    name: player.name?.trim() ?? '',
    createdAt: player.createdAt ?? new Date().toISOString(),
    createdBy: player.createdBy ?? 'unknown',
    status: player.status ?? 'active',
  }))
}

export function createSmpPlayer(data, name, createdBy) {
  const trimmed = name?.trim()
  if (!trimmed) {
    return { success: false, error: 'Player name is required.' }
  }

  const duplicate = (data.smpPlayers ?? []).some(
    (player) =>
      player.status === 'active' && player.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (duplicate) {
    return { success: false, error: 'A player with that name already exists.' }
  }

  const player = {
    id: uniqueId(slugify(trimmed) || 'smp'),
    name: trimmed,
    createdAt: new Date().toISOString(),
    createdBy: createdBy ?? 'unknown',
    status: 'active',
  }

  return {
    success: true,
    data: { ...data, smpPlayers: [...(data.smpPlayers ?? []), player] },
    player,
  }
}

export function updateSmpPlayer(data, playerId, name) {
  const trimmed = name?.trim()
  if (!trimmed) {
    return { success: false, error: 'Player name is required.' }
  }

  const existing = (data.smpPlayers ?? []).find((player) => player.id === playerId)
  if (!existing) {
    return { success: false, error: 'Player not found.' }
  }

  const duplicate = (data.smpPlayers ?? []).some(
    (player) =>
      player.id !== playerId &&
      player.status === 'active' &&
      player.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (duplicate) {
    return { success: false, error: 'A player with that name already exists.' }
  }

  const smpPlayers = (data.smpPlayers ?? []).map((player) =>
    player.id === playerId ? { ...player, name: trimmed } : player,
  )

  return {
    success: true,
    data: { ...data, smpPlayers },
    player: smpPlayers.find((player) => player.id === playerId),
    previousName: existing.name,
  }
}

export function deleteSmpPlayer(data, playerId) {
  const existing = (data.smpPlayers ?? []).find((player) => player.id === playerId)
  if (!existing) {
    return { success: false, error: 'Player not found.' }
  }

  const smpPlayers = (data.smpPlayers ?? []).filter((player) => player.id !== playerId)

  return {
    success: true,
    data: { ...data, smpPlayers },
    removed: existing,
  }
}
