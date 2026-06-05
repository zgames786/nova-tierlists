import { useEffect, useState } from 'react'
import { Camera, RotateCcw, X } from 'lucide-react'
import { formatLogTime } from '../utils/activityLog'
import {
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
} from '../utils/snapshotsFirestore'

export default function SnapshotsModal({ data, user, onClose, onRestore }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadSnapshots = async () => {
    setLoading(true)
    setError('')
    try {
      const items = await listSnapshots()
      setSnapshots(items)
    } catch (err) {
      setError(err?.message ?? 'Failed to load snapshots.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSnapshots()
  }, [])

  const handleCreateManual = async () => {
    setBusy(true)
    setError('')
    try {
      await createSnapshot(data, {
        createdBy: user?.username ?? 'owner',
        trigger: 'manual',
        label: 'Manual snapshot',
      })
      await loadSnapshots()
    } catch (err) {
      setError(err?.message ?? 'Failed to create snapshot.')
    } finally {
      setBusy(false)
    }
  }

  const handleRestore = async (snapshot) => {
    if (
      !window.confirm(
        `Restore snapshot from ${formatLogTime(snapshot.createdAt)}? This replaces all current app data.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError('')
    try {
      await onRestore(snapshot)
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Failed to restore snapshot.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--wide snapshots-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <h3>
            <Camera size={20} />
            Snapshots
          </h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="modal__hint">
          Owner only — automatic snapshots are saved before major changes. Newest 50 are kept.
        </p>

        {error && (
          <div className="dashboard-message dashboard-message--error" role="alert">
            {error}
          </div>
        )}

        <div className="snapshots-actions">
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={handleCreateManual}
            disabled={busy}
          >
            <Camera size={16} />
            Create Manual Snapshot
          </button>
        </div>

        {loading ? (
          <p className="rankings-empty">Loading snapshots…</p>
        ) : snapshots.length === 0 ? (
          <p className="rankings-empty">No snapshots yet.</p>
        ) : (
          <div className="snapshots-list">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="snapshot-row">
                <div className="snapshot-row__info">
                  <strong>{snapshot.label ?? snapshot.trigger}</strong>
                  <span>
                    {formatLogTime(snapshot.createdAt)} · {snapshot.createdBy} · {snapshot.trigger}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-btn modal-btn--ghost"
                  onClick={() => handleRestore(snapshot)}
                  disabled={busy}
                >
                  <RotateCcw size={16} />
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
