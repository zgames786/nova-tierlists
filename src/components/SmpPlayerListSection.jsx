import { useState } from 'react'
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { formatLogTime } from '../utils/activityLog'
import { createSmpPlayer, deleteSmpPlayer, updateSmpPlayer } from '../utils/smpPlayers'

export default function SmpPlayerListSection({
  data,
  canManage,
  user,
  onSave,
  onLog,
}) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const players = (data.smpPlayers ?? []).filter((player) => player.status === 'active')

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    const result = createSmpPlayer(data, newName, user?.username)
    if (!result.success) {
      setError(result.error)
      return
    }

    await onSave(result.data, onLog?.playerCreated?.(result.player))
    setNewName('')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editModal) return
    setError('')
    const result = updateSmpPlayer(data, editModal.id, editModal.name)
    if (!result.success) {
      setEditModal((prev) => ({ ...prev, error: result.error }))
      return
    }
    await onSave(result.data, onLog?.playerUpdated?.(result.player, result.previousName))
    setEditModal(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = deleteSmpPlayer(data, deleteTarget.id)
    if (result.success) {
      await onSave(result.data, onLog?.playerDeleted?.(result.removed))
      setDeleteTarget(null)
    }
  }

  return (
    <section className="dashboard-card dashboard-card--wide">
      <div className="section-header">
        <div>
          <h2>
            <Users size={20} />
            SMP Player List
          </h2>
          <p className="dashboard-card__hint">
            Global player roster — every player appears in all tierlists automatically.
          </p>
        </div>
      </div>

      {canManage && (
        <form className="smp-player-form" onSubmit={handleAdd}>
          {error && (
            <div className="dashboard-message dashboard-message--error" role="alert">
              {error}
            </div>
          )}
          <div className="smp-player-form__row">
            <input
              type="text"
              placeholder="Add SMP player name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn-add-player">
              <Plus size={16} />
              Add Player
            </button>
          </div>
        </form>
      )}

      {players.length === 0 ? (
        <p className="rankings-empty">
          {canManage
            ? 'No SMP players yet. Add players above to populate all tierlists.'
            : 'No SMP players listed yet.'}
        </p>
      ) : (
        <div className="smp-player-table">
          <div className="smp-player-row smp-player-row--head">
            <span>Player</span>
            <span>Status</span>
            <span>Added</span>
            <span>Added By</span>
            {canManage && <span>Actions</span>}
          </div>
          {players.map((player) => (
            <div key={player.id} className="smp-player-row">
              <span className="rankings-player">{player.name}</span>
              <span>
                <span className="status-badge status-badge--active">{player.status}</span>
              </span>
              <span>{formatLogTime(player.createdAt)}</span>
              <span>{player.createdBy}</span>
              {canManage && (
                <span className="rankings-actions">
                  <button
                    type="button"
                    className="action-btn"
                    title="Edit name"
                    onClick={() => setEditModal({ id: player.id, name: player.name, error: '' })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="action-btn action-btn--danger"
                    title="Delete player"
                    onClick={() => setDeleteTarget(player)}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal__header">
              <h3>Edit SMP Player</h3>
              <button type="button" className="modal__close" onClick={() => setEditModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              {editModal.error && (
                <div className="dashboard-message dashboard-message--error" role="alert">
                  {editModal.error}
                </div>
              )}
              <div className="modal__field">
                <label htmlFor="edit-smp-name">Player name</label>
                <input
                  id="edit-smp-name"
                  type="text"
                  value={editModal.name}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, name: e.target.value, error: '' }))
                  }
                  autoFocus
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setEditModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn--primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal__header">
              <h3>Delete SMP Player</h3>
              <button type="button" className="modal__close" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal__text">
              Remove <strong>{deleteTarget.name}</strong> from the global player list? They will be
              removed from every tierlist. This cannot be undone.
            </p>
            <div className="modal__actions">
              <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="modal-btn modal-btn--danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
