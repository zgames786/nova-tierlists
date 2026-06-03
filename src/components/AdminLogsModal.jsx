import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  ACTION_TYPES,
  LOG_FILTERS,
  createLogEntry,
  filterLogs,
  formatActionLabel,
  formatLogTime,
} from '../utils/activityLog'
import { saveTierlists } from '../utils/tierlistsStorage'

export default function AdminLogsModal({
  data,
  user,
  isOwner,
  onClose,
  onDataChange,
}) {
  const [filter, setFilter] = useState(LOG_FILTERS.ALL)
  const [confirmClear, setConfirmClear] = useState(false)

  const logs = useMemo(
    () => filterLogs(data.logs ?? [], filter),
    [data.logs, filter],
  )

  const handleClearLogs = () => {
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

    const cleared = { ...data, logs: [entry] }
    const saved = saveTierlists(cleared)
    onDataChange(saved)
    setConfirmClear(false)
    onClose()
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

        <div className="logs-table-wrap">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="logs-empty">
                    No logs for this filter.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatLogTime(log.timestamp)}</td>
                  <td>
                    <span className="logs-admin">{log.adminUsername}</span>
                    <span className="logs-role">{log.adminRole}</span>
                  </td>
                  <td>{formatActionLabel(log.actionType)}</td>
                  <td>
                    {log.targetName || '—'}
                    {log.targetType && (
                      <span className="logs-target-type">{log.targetType}</span>
                    )}
                  </td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal__actions">
          {isOwner && (
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
