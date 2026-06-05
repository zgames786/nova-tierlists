import {
  deleteAdminFromData,
  findAdminById,
  getManagedAdmins,
  restoreAdminInData,
} from './adminStorage'
import {
  ACTION_TYPES,
  appendLog,
  createLogEntry,
  isUndoableLog,
} from './activityLog'
import { snapshotPlayer } from './logSnapshots'
import { applyAutoAssignment, isOverallTierlist } from './tierlistsStorage'

const CONFIRM_UNDO_ACTIONS = new Set([
  ACTION_TYPES.TIERLIST_CREATED,
  ACTION_TYPES.ADMIN_CREATED,
  ACTION_TYPES.ADMIN_DELETED,
  ACTION_TYPES.PLAYER_DELETED,
])

export function requiresUndoConfirmation(actionType) {
  return CONFIRM_UNDO_ACTIONS.has(actionType)
}

export function getUndoConfirmationMessage(log) {
  switch (log.actionType) {
    case ACTION_TYPES.TIERLIST_CREATED:
      return 'This will delete the tierlist created by this action. Continue?'
    case ACTION_TYPES.ADMIN_CREATED:
      return 'This will delete the admin account created by this action. Continue?'
    case ACTION_TYPES.ADMIN_DELETED:
      return 'This will restore the deleted admin account. Continue?'
    case ACTION_TYPES.PLAYER_DELETED:
      return 'This will restore the deleted player. Continue?'
    default:
      return 'Undo this action?'
  }
}

function findTierlist(data, tierlistId) {
  return data.tierlists.find((tierlist) => tierlist.id === tierlistId) ?? null
}

function clonePlayer(player) {
  return snapshotPlayer(player)
}

function setTierlist(data, tierlistId, updater) {
  return {
    ...data,
    tierlists: data.tierlists.map((tierlist) =>
      tierlist.id === tierlistId ? updater(tierlist) : tierlist,
    ),
  }
}

function finalizeTierlistPlayers(tierlist) {
  if (isOverallTierlist(tierlist)) {
    return tierlist
  }
  return tierlist.autoTierAssignment ? applyAutoAssignment(tierlist) : tierlist
}

function replaceTierlistPlayers(data, tierlistId, players) {
  return setTierlist(data, tierlistId, (tierlist) =>
    finalizeTierlistPlayers({
      ...tierlist,
      players: players.map(clonePlayer),
    }),
  )
}

function validatePlayerUndo(log, data) {
  const tierlistId = log.beforeState?.tierlistId ?? log.afterState?.tierlistId
  const tierlist = findTierlist(data, tierlistId)
  if (!tierlist) {
    return { valid: false, error: 'Cannot undo because this tierlist no longer exists.' }
  }

  const playerId =
    log.beforeState?.player?.id ??
    log.afterState?.player?.id ??
    log.beforeState?.players?.find((player) => player?.name === log.targetName)?.id

  if (
    log.actionType === ACTION_TYPES.PLAYER_EDITED ||
    log.actionType === ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED ||
    log.actionType === ACTION_TYPES.PLAYER_MOVED_UP ||
    log.actionType === ACTION_TYPES.PLAYER_MOVED_DOWN ||
    log.actionType === ACTION_TYPES.TIERLIST_PLAYER_MOVED
  ) {
    if (!playerId || !tierlist.players.some((player) => player.id === playerId)) {
      return { valid: false, error: 'Cannot undo because this player no longer exists.' }
    }
  }

  if (log.actionType === ACTION_TYPES.PLAYER_ADDED) {
    const addedId = log.afterState?.player?.id
    if (!addedId || !tierlist.players.some((player) => player.id === addedId)) {
      return {
        valid: false,
        error: 'Cannot undo because this player no longer exists.',
      }
    }
  }

  if (log.actionType === ACTION_TYPES.PLAYER_DELETED) {
    const deletedId = log.beforeState?.player?.id
    if (deletedId && tierlist.players.some((player) => player.id === deletedId)) {
      return {
        valid: false,
        error: 'Cannot undo because this player already exists on the tierlist.',
      }
    }
  }

  return { valid: true }
}

function validateTierlistUndo(log, data) {
  const tierlistId =
    log.beforeState?.tierlistId ??
    log.afterState?.tierlistId ??
    log.afterState?.tierlist?.id

  if (log.actionType === ACTION_TYPES.TIERLIST_CREATED) {
    if (!findTierlist(data, tierlistId)) {
      return { valid: false, error: 'Cannot undo because this tierlist no longer exists.' }
    }
    return { valid: true }
  }

  if (!findTierlist(data, tierlistId)) {
    return { valid: false, error: 'Cannot undo because this tierlist no longer exists.' }
  }

  return { valid: true }
}

function validateAdminUndo(log, data) {
  if (log.actionType === ACTION_TYPES.ADMIN_CREATED) {
    const adminId = log.afterState?.admin?.id
    if (!adminId || !findAdminById(data, adminId)) {
      return { valid: false, error: 'Cannot undo because this admin no longer exists.' }
    }
    return { valid: true }
  }

  if (log.actionType === ACTION_TYPES.ADMIN_UPDATED) {
    const adminId = log.beforeState?.admin?.id
    if (!adminId || !findAdminById(data, adminId)) {
      return { valid: false, error: 'Cannot undo because this admin no longer exists.' }
    }
    return { valid: true }
  }

  if (log.actionType === ACTION_TYPES.ADMIN_DELETED) {
    const admin = log.beforeState?.admin
    if (!admin?.id) {
      return { valid: false, error: 'Cannot undo because admin data is missing.' }
    }
    const managed = getManagedAdmins(data)
    if (managed.find((account) => account.id === admin.id)) {
      return {
        valid: false,
        error: 'Cannot undo because an admin account with this id already exists.',
      }
    }
    if (
      managed.some(
        (account) =>
          account.username.toLowerCase() === admin.username.toLowerCase(),
      )
    ) {
      return {
        valid: false,
        error: 'Cannot undo because this username is already in use.',
      }
    }
    return { valid: true }
  }

  return { valid: true }
}

export function validateUndo(log, data) {
  if (!isUndoableLog(log)) {
    return { valid: false, error: 'This log entry cannot be undone.' }
  }

  switch (log.actionType) {
    case ACTION_TYPES.PLAYER_ADDED:
    case ACTION_TYPES.PLAYER_EDITED:
    case ACTION_TYPES.PLAYER_DELETED:
    case ACTION_TYPES.PLAYER_MOVED_UP:
    case ACTION_TYPES.PLAYER_MOVED_DOWN:
    case ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED:
    case ACTION_TYPES.TIERLIST_PLAYER_MOVED:
      return validatePlayerUndo(log, data)
    case ACTION_TYPES.TIERLIST_CREATED:
    case ACTION_TYPES.TIERLIST_RENAMED:
    case ACTION_TYPES.TIERLIST_POINTS_UPDATED:
    case ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED:
      return validateTierlistUndo(log, data)
    case ACTION_TYPES.ADMIN_CREATED:
    case ACTION_TYPES.ADMIN_UPDATED:
    case ACTION_TYPES.ADMIN_DELETED:
      return validateAdminUndo(log, data)
    default:
      return { valid: false, error: 'This action type does not support undo.' }
  }
}

function undoPlayerAction(data, log) {
  const tierlistId = log.beforeState?.tierlistId ?? log.afterState?.tierlistId

  switch (log.actionType) {
    case ACTION_TYPES.PLAYER_ADDED: {
      const playerId = log.afterState?.player?.id
      const tierlist = findTierlist(data, tierlistId)
      return replaceTierlistPlayers(
        data,
        tierlistId,
        tierlist.players.filter((player) => player.id !== playerId),
      )
    }
    case ACTION_TYPES.PLAYER_DELETED: {
      const tierlist = findTierlist(data, tierlistId)
      const restored = clonePlayer(log.beforeState.player)
      const players = [...tierlist.players]
      const index = Math.min(
        log.beforeState.playerIndex ?? players.length,
        players.length,
      )
      players.splice(index, 0, restored)
      return replaceTierlistPlayers(data, tierlistId, players)
    }
    case ACTION_TYPES.PLAYER_EDITED:
    case ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED: {
      const beforePlayer = log.beforeState.player
      const tierlist = findTierlist(data, tierlistId)
      return replaceTierlistPlayers(
        data,
        tierlistId,
        tierlist.players.map((player) =>
          player.id === beforePlayer.id ? clonePlayer(beforePlayer) : player,
        ),
      )
    }
    case ACTION_TYPES.PLAYER_MOVED_UP:
    case ACTION_TYPES.PLAYER_MOVED_DOWN:
    case ACTION_TYPES.TIERLIST_PLAYER_MOVED:
      return replaceTierlistPlayers(data, tierlistId, log.beforeState.players)
    default:
      return data
  }
}

function undoTierlistAction(data, log) {
  switch (log.actionType) {
    case ACTION_TYPES.TIERLIST_CREATED: {
      const tierlistId = log.afterState?.tierlist?.id ?? log.afterState?.tierlistId
      return {
        data: {
          ...data,
          tierlists: data.tierlists.filter((tierlist) => tierlist.id !== tierlistId),
        },
        removedTierlistId: tierlistId,
      }
    }
    case ACTION_TYPES.TIERLIST_RENAMED: {
      const tierlistId = log.beforeState.tierlistId
      return {
        data: setTierlist(data, tierlistId, (tierlist) => ({
          ...tierlist,
          name: log.beforeState.name,
        })),
      }
    }
    case ACTION_TYPES.TIERLIST_POINTS_UPDATED:
    case ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED: {
      const tierlistId = log.beforeState.tierlistId
      const previousPoints = log.beforeState.pointSystem
      return {
        data: setTierlist(data, tierlistId, (tierlist) => {
          const merged = { ...previousPoints }
          let updated = {
            ...tierlist,
            pointSystem: merged,
            players: tierlist.players.map((player) => {
              if (player.tierMode === 'manual') {
                return player
              }
              const tier = player.autoTier ?? player.manualTier ?? 'F'
              return { ...player, points: merged[tier] ?? player.points }
            }),
          }
          updated = finalizeTierlistPlayers(updated)
          return updated
        }),
      }
    }
    default:
      return { data }
  }
}

function undoAdminAction(data, log) {
  switch (log.actionType) {
    case ACTION_TYPES.ADMIN_CREATED:
      return deleteAdminFromData(data, log.afterState.admin.id)
    case ACTION_TYPES.ADMIN_UPDATED:
      return restoreAdminInData(data, log.beforeState.admin)
    case ACTION_TYPES.ADMIN_DELETED:
      return restoreAdminInData(data, log.beforeState.admin)
    default:
      return { success: false, error: 'Unsupported admin undo.' }
  }
}

function markLogUndone(logs, logId, user) {
  const now = new Date().toISOString()
  return logs.map((entry) =>
    entry.id === logId
      ? {
          ...entry,
          undone: true,
          undoneAt: now,
          undoneBy: user.username,
        }
      : entry,
  )
}

export function applyUndo(data, log, user) {
  const validation = validateUndo(log, data)
  if (!validation.valid) {
    return validation
  }

  let nextData = data
  let removedTierlistId = null
  let adminsChanged = false

  if (
    [
      ACTION_TYPES.PLAYER_ADDED,
      ACTION_TYPES.PLAYER_EDITED,
      ACTION_TYPES.PLAYER_DELETED,
      ACTION_TYPES.PLAYER_MOVED_UP,
      ACTION_TYPES.PLAYER_MOVED_DOWN,
      ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED,
      ACTION_TYPES.TIERLIST_PLAYER_MOVED,
    ].includes(log.actionType)
  ) {
    nextData = undoPlayerAction(data, log)
  } else if (
    [
      ACTION_TYPES.TIERLIST_CREATED,
      ACTION_TYPES.TIERLIST_RENAMED,
      ACTION_TYPES.TIERLIST_POINTS_UPDATED,
      ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED,
    ].includes(log.actionType)
  ) {
    const result = undoTierlistAction(data, log)
    nextData = result.data
    removedTierlistId = result.removedTierlistId ?? null
  } else if (
    [
      ACTION_TYPES.ADMIN_CREATED,
      ACTION_TYPES.ADMIN_UPDATED,
      ACTION_TYPES.ADMIN_DELETED,
    ].includes(log.actionType)
  ) {
    const result = undoAdminAction(nextData, log)
    if (!result.success) {
      return result
    }
    nextData = result.data
    adminsChanged = true
  }

  const updatedLogs = markLogUndone(data.logs ?? [], log.id, user)
  const undoLog = createLogEntry({
    adminUsername: user.username,
    adminRole: user.role,
    actionType: ACTION_TYPES.UNDO_ACTION,
    targetType: log.targetType,
    targetName: log.targetName,
    details: `Owner ${user.username} undid ${log.actionType} for ${log.targetName}`,
    canUndo: false,
  })

  const withLogs = appendLog({ ...nextData, logs: updatedLogs }, undoLog)

  return {
    success: true,
    data: withLogs,
    adminsChanged,
    removedTierlistId,
  }
}
