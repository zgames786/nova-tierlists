import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  ACTION_TYPES,
  LOG_FILTERS,
  createLogEntry,
  filterLogs,
  formatActionLabel,
  formatLogTime,
  isUndoableLog,
} from '../utils/activityLog'
import {
  applyUndo,
  getUndoConfirmationMessage,
  requiresUndoConfirmation,
} from '../utils/undoAction'

export default function AdminLogsModal({
  data,
  user,
  canUndoActions,
  onClose,
  saveAppData,
  onAdminsChange,
  onActiveTierlistChange,
}) {
  const [filter, setFilter] = useState(LOG_FILTERS.ALL)
  const [confirmClear, setConfirmClear] = useState(false)
  const [undoError, setUndoError] = useState('')

  const logs = useMemo(
    () => filterLogs(data.logs ?? [], filter),
    [data.logs, filter],
  )

  const handleClearLogs = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }

    const entry = createLogEntry({
      adminUsername: user.username,
      adminRole: user.role,
      actionType: ACTION_TYPES.LOGS_CLEARED,
      targetType: 'logs',
      targetName: 'Activity logs',
      details: `Logs cleared by ${user.username}`,
    })

    try {
      await saveAppData({ ...data, logs: [entry] })
      setConfirmClear(false)
      onClose()
    } catch {
      setUndoError('Failed to clear logs in Firestore.')
    }
  }

  const handleUndo = async (log) => {
    setUndoError('')

    if (requiresUndoConfirmation(log.actionType)) {
      const confirmed = window.confirm(getUndoConfirmationMessage(log))
      if (!confirmed) return
    }

    const result = applyUndo(data, log, user)
    if (!result.success) {
      setUndoError(result.error ?? 'Undo failed.')
      return
    }

    try {
      await saveAppData(result.data)
      if (result.adminsChanged) {
        onAdminsChange?.()
      }
      if (result.removedTierlistId) {
        onActiveTierlistChange?.(result.removedTierlistId, result.data)
      }
    } catch {
      setUndoError('Undo applied locally but failed to save to Firestore.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--logs"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <h3>Activity Logs</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="logs-filters">
          {Object.entries(LOG_FILTERS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={`logs-filter${filter === value ? ' logs-filter--active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {undoError && (
          <div className="logs-undo-error" role="alert">
            {undoError}
          </div>
        )}

        <div className="logs-table-wrap">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                {canUndoActions && <th>Undo</th>}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={canUndoActions ? 6 : 5} className="logs-empty">
                    No logs for this filter.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className={log.undone ? 'logs-row--undone' : ''}>
                  <td>{formatLogTime(log.timestamp)}</td>
                  <td>
                    <span className="logs-admin">{log.adminUsername}</span>
                    <span className="logs-role">{log.adminRole}</span>
                  </td>
                  <td>
                    {formatActionLabel(log.actionType)}
                    {log.undone && <span className="logs-undone-badge">Undone</span>}
                  </td>
                  <td>
                    {log.targetName || '—'}
                    {log.targetType && (
                      <span className="logs-target-type">{log.targetType}</span>
                    )}
                  </td>
                  <td>{log.details}</td>
                  {canUndoActions && (
                    <td>
                      {isUndoableLog(log) ? (
                        <button
                          type="button"
                          className="logs-undo-btn"
                          onClick={() => handleUndo(log)}
                        >
                          Undo
                        </button>
                      ) : log.undone ? (
                        <span className="logs-undone-label">Undone</span>
                      ) : (
                        <span className="logs-undo-na">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal__actions">
          {canUndoActions && (
            <button
              type="button"
              className={`modal-btn${confirmClear ? ' modal-btn--danger' : ' modal-btn--ghost'}`}
              onClick={handleClearLogs}
            >
              {confirmClear ? 'Confirm clear logs?' : 'Clear Logs'}
            </button>
          )}
          <button type="button" className="modal-btn modal-btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
