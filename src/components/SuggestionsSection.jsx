import { useState } from 'react'
import { MessageSquarePlus, Trash2, X } from 'lucide-react'
import { formatLogTime } from '../utils/activityLog'
import {
  SUGGESTION_STATUSES,
  SUGGESTION_TYPES,
  createSuggestionPayload,
  deleteSuggestion,
  getSuggestionTypeLabel,
  updateSuggestionStatus,
} from '../utils/suggestions'

export default function SuggestionsSection({
  data,
  user,
  isGuest,
  canManageSuggestions,
  tierlists,
  smpPlayers,
  onSubmitSuggestion,
  onSave,
  onLog,
}) {
  const [form, setForm] = useState({
    type: 'general',
    playerName: '',
    targetPlayerName: '',
    tierlistName: '',
    message: '',
  })
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const suggestions = data.suggestions ?? []
  const tierlistNames = tierlists.filter((t) => !t.isCalculated).map((t) => t.name)
  const playerNames = smpPlayers.map((p) => p.name)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitMessage({ type: '', text: '' })

    if (!form.message.trim()) {
      setSubmitMessage({ type: 'error', text: 'Message is required.' })
      return
    }

    const suggestion = createSuggestionPayload({
      submittedBy: isGuest ? 'Guest' : user?.username,
      submittedByRole: user?.role ?? 'guest',
      type: form.type,
      playerName: form.playerName,
      targetPlayerName: form.targetPlayerName,
      tierlistName: form.tierlistName,
      message: form.message,
    })

    try {
      if (isGuest) {
        await onSubmitSuggestion(suggestion, onLog?.suggestionCreated?.(suggestion))
      } else {
        const next = { ...data, suggestions: [suggestion, ...(data.suggestions ?? [])] }
        await onSave(next, onLog?.suggestionCreated?.(suggestion))
      }
      setForm({
        type: 'general',
        playerName: '',
        targetPlayerName: '',
        tierlistName: '',
        message: '',
      })
      setSubmitMessage({ type: 'success', text: 'Suggestion submitted. Thank you!' })
    } catch {
      setSubmitMessage({ type: 'error', text: 'Failed to submit suggestion.' })
    }
  }

  const handleStatusChange = async (suggestion, status) => {
    const result = updateSuggestionStatus(data, suggestion.id, status)
    if (!result.success) return

    const actionMap = {
      reviewed: onLog?.suggestionReviewed,
      approved: onLog?.suggestionApproved,
      rejected: onLog?.suggestionRejected,
    }
    await onSave(result.data, actionMap[status]?.(result.suggestion, result.previousStatus))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = deleteSuggestion(data, deleteTarget.id)
    if (result.success) {
      await onSave(result.data, onLog?.suggestionDeleted?.(result.removed))
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <section className="dashboard-card dashboard-card--wide">
        <div className="section-header">
          <div>
            <h2>
              <MessageSquarePlus size={20} />
              Suggestions
            </h2>
            <p className="dashboard-card__hint">
              Submit ranking requests, fight requests, reports, or general feedback.
            </p>
          </div>
        </div>

        <form className="suggestion-form" onSubmit={handleSubmit}>
          {submitMessage.text && (
            <div
              className={`dashboard-message dashboard-message--${submitMessage.type}`}
              role="alert"
            >
              {submitMessage.text}
            </div>
          )}

          <div className="suggestion-form__grid">
            <div className="modal__field">
              <label htmlFor="sug-type">Type</label>
              <select
                id="sug-type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {SUGGESTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label htmlFor="sug-player">Your player name</label>
              <input
                id="sug-player"
                type="text"
                list="smp-player-names"
                value={form.playerName}
                onChange={(e) => setForm((prev) => ({ ...prev, playerName: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="modal__field">
              <label htmlFor="sug-target">Target player</label>
              <input
                id="sug-target"
                type="text"
                list="smp-player-names"
                value={form.targetPlayerName}
                onChange={(e) => setForm((prev) => ({ ...prev, targetPlayerName: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="modal__field">
              <label htmlFor="sug-tierlist">Tierlist</label>
              <input
                id="sug-tierlist"
                type="text"
                list="tierlist-names"
                value={form.tierlistName}
                onChange={(e) => setForm((prev) => ({ ...prev, tierlistName: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          <datalist id="smp-player-names">
            {playerNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="tierlist-names">
            {tierlistNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="modal__field">
            <label htmlFor="sug-message">Message</label>
            <textarea
              id="sug-message"
              rows={3}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Describe your suggestion..."
              required
            />
          </div>

          <button type="submit" className="modal-btn modal-btn--primary">
            Submit Suggestion
          </button>
        </form>
      </section>

      {canManageSuggestions && (
        <section className="dashboard-card dashboard-card--wide">
          <h2>Submitted Suggestions</h2>
          <p className="dashboard-card__hint">Owner and admin only — review incoming suggestions.</p>

          {suggestions.length === 0 ? (
            <p className="rankings-empty">No suggestions submitted yet.</p>
          ) : (
            <div className="suggestions-admin-list">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-admin-card">
                  <div className="suggestion-admin-card__header">
                    <span className="suggestion-type">{getSuggestionTypeLabel(suggestion.type)}</span>
                    <span className={`status-badge status-badge--${suggestion.status}`}>
                      {suggestion.status}
                    </span>
                  </div>
                  <p className="suggestion-admin-card__meta">
                    {suggestion.submittedBy} ({suggestion.submittedByRole}) ·{' '}
                    {formatLogTime(suggestion.createdAt)}
                  </p>
                  {(suggestion.playerName || suggestion.targetPlayerName || suggestion.tierlistName) && (
                    <p className="suggestion-admin-card__details">
                      {suggestion.playerName && <>Player: {suggestion.playerName} · </>}
                      {suggestion.targetPlayerName && <>Target: {suggestion.targetPlayerName} · </>}
                      {suggestion.tierlistName && <>Tierlist: {suggestion.tierlistName}</>}
                    </p>
                  )}
                  <p className="suggestion-admin-card__message">{suggestion.message}</p>
                  <div className="suggestion-admin-card__actions">
                    {SUGGESTION_STATUSES.filter((s) => s !== 'new').map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`suggestion-status-btn${suggestion.status === status ? ' suggestion-status-btn--active' : ''}`}
                        onClick={() => handleStatusChange(suggestion, status)}
                        disabled={suggestion.status === status}
                      >
                        {status}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="action-btn action-btn--danger"
                      title="Delete suggestion"
                      onClick={() => setDeleteTarget(suggestion)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal__header">
              <h3>Delete Suggestion</h3>
              <button type="button" className="modal__close" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal__text">Delete this suggestion permanently?</p>
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
    </>
  )
}
