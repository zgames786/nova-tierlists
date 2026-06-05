export const ACTION_TYPES = {
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  ADMIN_CREATED: 'ADMIN_CREATED',
  ADMIN_UPDATED: 'ADMIN_UPDATED',
  ADMIN_DELETED: 'ADMIN_DELETED',
  TIERLIST_CREATED: 'TIERLIST_CREATED',
  TIERLIST_RENAMED: 'TIERLIST_RENAMED',
  TIERLIST_POINT_SYSTEM_UPDATED: 'TIERLIST_POINT_SYSTEM_UPDATED',
  TIERLIST_POINTS_UPDATED: 'TIERLIST_POINTS_UPDATED',
  TIERLIST_DELETED: 'TIERLIST_DELETED',
  PLAYER_ADDED: 'PLAYER_ADDED',
  PLAYER_EDITED: 'PLAYER_EDITED',
  PLAYER_DELETED: 'PLAYER_DELETED',
  PLAYER_MOVED_UP: 'PLAYER_MOVED_UP',
  PLAYER_MOVED_DOWN: 'PLAYER_MOVED_DOWN',
  PLAYER_CREATED: 'PLAYER_CREATED',
  PLAYER_UPDATED: 'PLAYER_UPDATED',
  SUGGESTION_CREATED: 'SUGGESTION_CREATED',
  SUGGESTION_REVIEWED: 'SUGGESTION_REVIEWED',
  SUGGESTION_APPROVED: 'SUGGESTION_APPROVED',
  SUGGESTION_REJECTED: 'SUGGESTION_REJECTED',
  SUGGESTION_DELETED: 'SUGGESTION_DELETED',
  TIERLIST_PLAYER_RANK_UPDATED: 'TIERLIST_PLAYER_RANK_UPDATED',
  TIERLIST_PLAYER_MOVED: 'TIERLIST_PLAYER_MOVED',
  SNAPSHOT_RESTORED: 'SNAPSHOT_RESTORED',
  BACKUP_EXPORTED: 'BACKUP_EXPORTED',
  BACKUP_IMPORTED: 'BACKUP_IMPORTED',
  LOGS_CLEARED: 'LOGS_CLEARED',
  UNDO_ACTION: 'UNDO_ACTION',
}

export const UNDOABLE_ACTION_TYPES = new Set([
  ACTION_TYPES.PLAYER_ADDED,
  ACTION_TYPES.PLAYER_EDITED,
  ACTION_TYPES.PLAYER_DELETED,
  ACTION_TYPES.PLAYER_MOVED_UP,
  ACTION_TYPES.PLAYER_MOVED_DOWN,
  ACTION_TYPES.PLAYER_CREATED,
  ACTION_TYPES.PLAYER_UPDATED,
  ACTION_TYPES.TIERLIST_CREATED,
  ACTION_TYPES.TIERLIST_RENAMED,
  ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED,
  ACTION_TYPES.TIERLIST_POINTS_UPDATED,
  ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED,
  ACTION_TYPES.TIERLIST_PLAYER_MOVED,
  ACTION_TYPES.ADMIN_CREATED,
  ACTION_TYPES.ADMIN_UPDATED,
  ACTION_TYPES.ADMIN_DELETED,
])

export const LOG_FILTERS = {
  ALL: 'all',
  PLAYERS: 'players',
  TIERLISTS: 'tierlists',
  ADMINS: 'admins',
  SUGGESTIONS: 'suggestions',
  SNAPSHOTS: 'snapshots',
  BACKUP: 'backup',
  LOGIN: 'login',
}

const FILTER_ACTION_MAP = {
  [LOG_FILTERS.PLAYERS]: [
    ACTION_TYPES.PLAYER_ADDED,
    ACTION_TYPES.PLAYER_EDITED,
    ACTION_TYPES.PLAYER_DELETED,
    ACTION_TYPES.PLAYER_MOVED_UP,
    ACTION_TYPES.PLAYER_MOVED_DOWN,
    ACTION_TYPES.PLAYER_CREATED,
    ACTION_TYPES.PLAYER_UPDATED,
    ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED,
    ACTION_TYPES.TIERLIST_PLAYER_MOVED,
  ],
  [LOG_FILTERS.TIERLISTS]: [
    ACTION_TYPES.TIERLIST_CREATED,
    ACTION_TYPES.TIERLIST_RENAMED,
    ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED,
    ACTION_TYPES.TIERLIST_POINTS_UPDATED,
    ACTION_TYPES.TIERLIST_DELETED,
  ],
  [LOG_FILTERS.ADMINS]: [
    ACTION_TYPES.ADMIN_CREATED,
    ACTION_TYPES.ADMIN_UPDATED,
    ACTION_TYPES.ADMIN_DELETED,
    ACTION_TYPES.LOGS_CLEARED,
  ],
  [LOG_FILTERS.SUGGESTIONS]: [
    ACTION_TYPES.SUGGESTION_CREATED,
    ACTION_TYPES.SUGGESTION_REVIEWED,
    ACTION_TYPES.SUGGESTION_APPROVED,
    ACTION_TYPES.SUGGESTION_REJECTED,
    ACTION_TYPES.SUGGESTION_DELETED,
  ],
  [LOG_FILTERS.SNAPSHOTS]: [ACTION_TYPES.SNAPSHOT_RESTORED],
  [LOG_FILTERS.BACKUP]: [ACTION_TYPES.BACKUP_EXPORTED, ACTION_TYPES.BACKUP_IMPORTED],
  [LOG_FILTERS.LOGIN]: [ACTION_TYPES.ADMIN_LOGIN, ACTION_TYPES.ADMIN_LOGOUT],
}

export function createLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createLogEntry({
  adminUsername,
  adminRole,
  actionType,
  targetType,
  targetName,
  details,
  beforeState = null,
  afterState = null,
  canUndo = false,
  undone = false,
  undoneAt = null,
  undoneBy = null,
}) {
  const undoable =
    canUndo ||
    (UNDOABLE_ACTION_TYPES.has(actionType) &&
      (beforeState != null || afterState != null))

  return {
    id: createLogId(),
    timestamp: new Date().toISOString(),
    adminUsername: adminUsername ?? 'unknown',
    adminRole: adminRole ?? 'admin',
    actionType,
    targetType: targetType ?? '',
    targetName: targetName ?? '',
    details: details ?? '',
    beforeState,
    afterState,
    canUndo: Boolean(undoable),
    undone: Boolean(undone),
    undoneAt,
    undoneBy,
  }
}

export function isUndoableLog(log) {
  if (!log || log.undone) return false
  if (log.actionType === ACTION_TYPES.UNDO_ACTION) return false
  if (!UNDOABLE_ACTION_TYPES.has(log.actionType)) return false
  if (log.canUndo === false) return false
  if (log.beforeState == null && log.afterState == null) return false
  return true
}

export function appendLog(data, entry) {
  const logs = [entry, ...(data.logs ?? [])]
  return { ...data, logs }
}

export function filterLogs(logs, filter) {
  if (!logs?.length) return []
  if (filter === LOG_FILTERS.ALL) return logs

  const allowed = FILTER_ACTION_MAP[filter] ?? []
  return logs.filter((log) => allowed.includes(log.actionType))
}

export function formatLogTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function formatActionLabel(actionType) {
  return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export const SNAPSHOT_TRIGGERS = {
  ADMIN_CREATED: 'admin_created',
  ADMIN_UPDATED: 'admin_updated',
  ADMIN_DELETED: 'admin_deleted',
  TIERLIST_CREATED: 'tierlist_created',
  TIERLIST_RENAMED: 'tierlist_renamed',
  POINT_SYSTEM_UPDATED: 'point_system_updated',
  PLAYER_CREATED: 'player_created',
  PLAYER_UPDATED: 'player_updated',
  PLAYER_DELETED: 'player_deleted',
  TIERLIST_RANK_CHANGED: 'tierlist_rank_changed',
  PLAYER_MOVED: 'player_moved',
  SUGGESTION_STATUS_CHANGED: 'suggestion_status_changed',
  IMPORT_DATA: 'import_data',
  UNDO_ACTION: 'undo_action',
  MANUAL: 'manual',
}
