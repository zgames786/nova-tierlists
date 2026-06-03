import { useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  LogOut,
  Pencil,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AdminLogsModal from '../components/AdminLogsModal'
import { useAuth } from '../context/AuthContext'
import { ACTION_TYPES, appendLog, createLogEntry } from '../utils/activityLog'
import {
  BACKUP_FILENAME,
  applyImportedBackup,
  buildBackupPayload,
  downloadBackupJson,
  parseBackupFile,
  validateBackupPayload,
} from '../utils/backup'
import {
  TIERS,
  TIER_COLORS,
  addPlayer,
  createTierlist,
  deletePlayer,
  getAutoTierForPosition,
  getAutoTierRangesLabel,
  getDefaultPoints,
  getEffectiveTier,
  getPointSystem,
  isOverallTierlist,
  loadTierlists,
  movePlayer,
  resolvePlayerDisplay,
  saveTierlists,
  updatePlayer,
  updatePointSystem,
  updateTierlistSettings,
} from '../utils/tierlistsStorage'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout, canCreateAdmins, createAdmin, isOwner } = useAuth()
  const importInputRef = useRef(null)

  const [data, setData] = useState(() => loadTierlists())
  const [activeId, setActiveId] = useState(() => loadTierlists().tierlists[0]?.id ?? 'overall')

  const [showCreateTierlist, setShowCreateTierlist] = useState(false)
  const [newTierlistName, setNewTierlistName] = useState('')
  const [tierlistError, setTierlistError] = useState('')

  const [settingsModal, setSettingsModal] = useState(null)
  const [settingsError, setSettingsError] = useState('')
  const [tierSettingsModal, setTierSettingsModal] = useState(null)

  const [playerModal, setPlayerModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const [importError, setImportError] = useState('')

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createMessage, setCreateMessage] = useState({ type: '', text: '' })

  const activeTierlist = data.tierlists.find((t) => t.id === activeId) ?? data.tierlists[0]
  const activePointSystem = activeTierlist ? getPointSystem(activeTierlist) : {}
  const isOverallView = activeTierlist ? isOverallTierlist(activeTierlist) : false

  const makeLog = (actionType, targetType, targetName, details) =>
    createLogEntry({
      adminUsername: user?.username,
      adminRole: user?.role,
      actionType,
      targetType,
      targetName,
      details,
    })

  const logAndSave = (newData, entry) => {
    const withLog = entry ? appendLog(newData, entry) : newData
    const saved = saveTierlists(withLog)
    setData(saved)
    return saved
  }

  const handleLogout = () => {
    const entry = makeLog(
      ACTION_TYPES.ADMIN_LOGOUT,
      'session',
      user?.username ?? '',
      `${user?.username ?? 'Admin'} logged out`,
    )
    logAndSave(data, entry)
    logout()
    navigate('/')
  }

  const handleExport = () => {
    const payload = buildBackupPayload(data, user)
    downloadBackupJson(payload)
    logAndSave(
      data,
      makeLog(
        ACTION_TYPES.BACKUP_EXPORTED,
        'backup',
        BACKUP_FILENAME,
        'Exported full local app data backup',
      ),
    )
  }

  const handleImportClick = () => {
    setImportError('')
    importInputRef.current?.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError('')
    try {
      const payload = await parseBackupFile(file)
      const validation = validateBackupPayload(payload)
      if (!validation.valid) {
        setImportError(validation.error)
        return
      }

      if (
        !window.confirm('Importing will replace current local data. Continue?')
      ) {
        return
      }

      const imported = applyImportedBackup(payload)
      const saved = logAndSave(
        imported,
        makeLog(
          ACTION_TYPES.BACKUP_IMPORTED,
          'backup',
          file.name,
          'Imported backup and replaced local app data',
        ),
      )
      if (saved.tierlists.some((t) => t.id === activeId)) {
        setActiveId(activeId)
      } else {
        setActiveId(saved.tierlists[0]?.id ?? 'overall')
      }
    } catch (err) {
      setImportError(err.message ?? 'Import failed.')
    }
  }

  const handleCreateTierlist = (e) => {
    e.preventDefault()
    setTierlistError('')
    const result = createTierlist(data, newTierlistName)
    if (result.success) {
      logAndSave(
        result.data,
        makeLog(
          ACTION_TYPES.TIERLIST_CREATED,
          'tierlist',
          result.tierlist.name,
          `Created tierlist "${result.tierlist.name}"`,
        ),
      )
      setActiveId(result.tierlist.id)
      setNewTierlistName('')
      setShowCreateTierlist(false)
    } else {
      setTierlistError(result.error)
    }
  }

  const openSettings = () => {
    if (!activeTierlist || isOverallView) return
    setSettingsError('')
    setSettingsModal({
      name: activeTierlist.name,
      autoTierAssignment: activeTierlist.autoTierAssignment,
      description: activeTierlist.description ?? '',
    })
  }

  const openTierSettings = () => {
    if (!activeTierlist || isOverallView) return
    setTierSettingsModal({ ...getPointSystem(activeTierlist) })
  }

  const handleSaveTierSettings = (e) => {
    e.preventDefault()
    if (!tierSettingsModal || !activeTierlist) return
    const result = updatePointSystem(data, activeTierlist.id, tierSettingsModal)
    if (result.success) {
      logAndSave(
        result.data,
        makeLog(
          ACTION_TYPES.TIERLIST_POINTS_UPDATED,
          'tierlist',
          activeTierlist.name,
          `Updated point system for "${activeTierlist.name}"`,
        ),
      )
      setTierSettingsModal(null)
    }
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    if (!settingsModal || !activeTierlist) return
    setSettingsError('')

    const result = updateTierlistSettings(data, activeTierlist.id, settingsModal)
    if (result.success) {
      const newName = settingsModal.name.trim()
      const renamed = result.oldName && result.oldName !== newName
      if (renamed) {
        logAndSave(
          result.data,
          makeLog(
            ACTION_TYPES.TIERLIST_RENAMED,
            'tierlist',
            newName,
            `Renamed tierlist from "${result.oldName}" to "${newName}"`,
          ),
        )
      } else {
        logAndSave(result.data)
      }
      setSettingsModal(null)
    } else {
      setSettingsError(result.error)
    }
  }

  const openAddPlayer = () => {
    const nextPos = (activeTierlist?.players.length ?? 0) + 1
    const autoTier = getAutoTierForPosition(nextPos)
    setPlayerModal({
      mode: 'add',
      name: '',
      tierMode: 'manual',
      manualTier: 'F',
      points: getDefaultPoints(activeTierlist, 'F'),
      previewAutoTier: autoTier,
    })
  }

  const openEditPlayer = (player, index) => {
    const display = resolvePlayerDisplay(player, activeTierlist)
    setPlayerModal({
      mode: 'edit',
      playerId: player.id,
      name: player.name,
      tierMode: player.tierMode ?? 'auto',
      manualTier: player.manualTier ?? display.tier,
      points: player.points,
      previewAutoTier: getAutoTierForPosition(index + 1),
    })
  }

  const handleSavePlayer = (e) => {
    e.preventDefault()
    if (!playerModal || !activeTierlist) return

    const payload =
      playerModal.mode === 'add'
        ? {
            name: playerModal.name,
            tierMode: 'manual',
            manualTier: playerModal.manualTier,
            points: playerModal.points,
          }
        : {
            name: playerModal.name,
            tierMode: playerModal.tierMode,
            manualTier: playerModal.manualTier,
            points: playerModal.points,
          }

    const result =
      playerModal.mode === 'add'
        ? addPlayer(data, activeTierlist.id, payload)
        : updatePlayer(data, activeTierlist.id, playerModal.playerId, payload)

    if (result.success) {
      const tier = getEffectiveTier(
        playerModal.mode === 'add'
          ? { tierMode: 'manual', manualTier: playerModal.manualTier }
          : {
              tierMode: playerModal.tierMode,
              manualTier: playerModal.manualTier,
              autoTier: playerModal.previewAutoTier,
            },
      )
      const points = Number(playerModal.points)
      const playerName = playerModal.name.trim()
      const isAdd = playerModal.mode === 'add'

      logAndSave(
        result.data,
        makeLog(
          isAdd ? ACTION_TYPES.PLAYER_ADDED : ACTION_TYPES.PLAYER_EDITED,
          'player',
          playerName,
          isAdd
            ? `Added ${playerName} to ${activeTierlist.name} with tier ${tier} and ${points} points`
            : `Edited ${playerName} on ${activeTierlist.name} (tier ${tier}, ${points} points)`,
        ),
      )
      setPlayerModal(null)
    }
  }

  const handleDeletePlayer = () => {
    if (!deleteTarget || !activeTierlist) return
    const result = deletePlayer(data, activeTierlist.id, deleteTarget.id)
    if (result.success) {
      logAndSave(
        result.data,
        makeLog(
          ACTION_TYPES.PLAYER_DELETED,
          'player',
          deleteTarget.name,
          `Removed ${deleteTarget.name} from ${activeTierlist.name}`,
        ),
      )
      setDeleteTarget(null)
    }
  }

  const handleMove = (playerId, direction) => {
    const result = movePlayer(data, activeTierlist.id, playerId, direction)
    if (result.success) {
      const moved = result.moved
      logAndSave(
        result.data,
        makeLog(
          direction === 'up'
            ? ACTION_TYPES.PLAYER_MOVED_UP
            : ACTION_TYPES.PLAYER_MOVED_DOWN,
          'player',
          moved?.name ?? '',
          `Moved ${moved?.name ?? 'player'} ${direction} on ${activeTierlist.name}`,
        ),
      )
    }
  }

  const handleCreateAdmin = (e) => {
    e.preventDefault()
    setCreateMessage({ type: '', text: '' })
    const trimmed = newUsername.trim()
    const result = createAdmin(newUsername, newPassword)
    if (result.success) {
      logAndSave(
        result.data,
        makeLog(
          ACTION_TYPES.ADMIN_CREATED,
          'admin',
          trimmed,
          `Created admin account "${trimmed}"`,
        ),
      )
      setCreateMessage({ type: 'success', text: `Admin "${trimmed}" created.` })
      setNewUsername('')
      setNewPassword('')
    } else {
      setCreateMessage({ type: 'error', text: result.error })
    }
  }

  const setPlayerTierMode = (tierMode) => {
    setPlayerModal((prev) => {
      const manualTier = prev.manualTier ?? 'F'
      const tier = tierMode === 'manual' ? manualTier : prev.previewAutoTier
      return {
        ...prev,
        tierMode,
        points: getDefaultPoints(activeTierlist, tier),
      }
    })
  }

  const setPlayerManualTier = (manualTier) => {
    setPlayerModal((prev) => ({
      ...prev,
      manualTier,
      points: getDefaultPoints(activeTierlist, manualTier),
    }))
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="dashboard-nav__brand">
          <Shield size={22} className="dashboard-nav__icon" />
          <div>
            <span className="dashboard-nav__title">NovaSMP Tierlists</span>
            <span className="dashboard-nav__subtitle">Admin Dashboard</span>
          </div>
        </div>

        <div className="dashboard-nav__actions">
          <div className="dashboard-nav__user">
            <span className="dashboard-nav__username">
              {user?.role === 'owner' ? 'Owner: ' : ''}
              {user?.username}
            </span>
            <span className={`dashboard-nav__role dashboard-nav__role--${user?.role}`}>
              {user?.role}
            </span>
          </div>
          <button
            type="button"
            className="dashboard-nav__link dashboard-nav__btn"
            onClick={() => setShowLogs(true)}
          >
            <ScrollText size={16} />
            Logs
          </button>
          <button
            type="button"
            className="dashboard-nav__link dashboard-nav__btn"
            onClick={handleExport}
          >
            <Download size={16} />
            Export Data
          </button>
          <button
            type="button"
            className="dashboard-nav__link dashboard-nav__btn"
            onClick={handleImportClick}
          >
            <Upload size={16} />
            Import Data
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="dashboard-import-input"
            onChange={handleImportFile}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button type="button" className="dashboard-nav__logout" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {importError && (
        <div className="dashboard-import-error" role="alert">
          {importError}
        </div>
      )}

      <div className="dashboard-tabs">
        {data.tierlists.map((tl) => (
          <button
            key={tl.id}
            type="button"
            className={`dashboard-tab${activeId === tl.id ? ' dashboard-tab--active' : ''}`}
            onClick={() => setActiveId(tl.id)}
          >
            {tl.name}
          </button>
        ))}
        <button
          type="button"
          className="dashboard-tab-add"
          onClick={() => {
            setTierlistError('')
            setShowCreateTierlist(true)
          }}
          title="Create tierlist"
          aria-label="Create tierlist"
        >
          <Plus size={18} />
        </button>
      </div>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__row">
            <div>
              <h1>{activeTierlist?.name ?? 'Tierlist'} Rankings</h1>
              {isOverallView ? (
                <>
                  <p className="overall-auto-label">
                    Auto-calculated from all tierlists
                  </p>
                  <p className="overall-auto-hint">
                    Combined points from every tierlist · tiers by rank ·{' '}
                    {getAutoTierRangesLabel()}
                  </p>
                </>
              ) : (
                <p>
                  {activeTierlist?.autoTierAssignment
                    ? `Automatic tier assignment · ${getAutoTierRangesLabel()}`
                    : 'Manual tier assignment — tiers set per player'}
                </p>
              )}
            </div>
            {!isOverallView && (
              <button
                type="button"
                className="btn-settings"
                onClick={openSettings}
                title="Tierlist settings"
                aria-label="Tierlist settings"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-card--wide">
            <div className="rankings-header">
              <h2>Player Rankings</h2>
              {!isOverallView && (
                <div className="rankings-header__actions">
                  <button type="button" className="btn-tier-settings" onClick={openTierSettings}>
                    Tier Settings
                  </button>
                  <button type="button" className="btn-add-player" onClick={openAddPlayer}>
                    <Plus size={16} />
                    Add Player
                  </button>
                </div>
              )}
            </div>

            <div className="rankings-table">
              <div
                className={`rankings-row rankings-row--head${isOverallView ? ' rankings-row--overall' : ''}`}
              >
                <span>#</span>
                <span>Player</span>
                <span>Tier</span>
                <span>Points</span>
                {!isOverallView && <span>Mode</span>}
                {!isOverallView && <span>Actions</span>}
              </div>

              {activeTierlist?.players.length === 0 && (
                <div className="rankings-empty">
                  {isOverallView
                    ? 'No players yet. Add players to other tierlists to populate Overall.'
                    : 'No players yet. Add your first player.'}
                </div>
              )}

              {activeTierlist?.players.map((player, index) => {
                const display = resolvePlayerDisplay(player, activeTierlist)
                return (
                  <div
                    key={player.id}
                    className={`rankings-row${isOverallView ? ' rankings-row--overall' : ''}`}
                  >
                    <span>{index + 1}</span>
                    <span className="rankings-player">{player.name}</span>
                    <span className="rankings-tier-cell">
                      <span
                        className="tier-badge"
                        style={{ '--tier-color': TIER_COLORS[display.tier] ?? '#a78bfa' }}
                      >
                        {display.tier}
                      </span>
                      {!isOverallView &&
                        display.isManual &&
                        player.autoTier &&
                        player.autoTier !== display.tier && (
                          <span className="tier-auto-hint" title="Position-based auto tier">
                            auto: {player.autoTier}
                          </span>
                        )}
                    </span>
                    <span>{display.points}</span>
                    {!isOverallView && (
                      <span>
                        <span
                          className={`mode-badge mode-badge--${player.tierMode === 'manual' ? 'manual' : 'auto'}`}
                        >
                          {player.tierMode === 'manual' ? 'Manual' : 'Auto'}
                        </span>
                      </span>
                    )}
                    {!isOverallView && (
                      <span className="rankings-actions">
                        <button
                          type="button"
                          className="action-btn"
                          title="Edit"
                          onClick={() => openEditPlayer(player, index)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-btn--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(player)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => handleMove(player.id, 'up')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          title="Move down"
                          disabled={index === activeTierlist.players.length - 1}
                          onClick={() => handleMove(player.id, 'down')}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Points System</h2>
            <p className="dashboard-card__hint">Point values for this tierlist only.</p>
            <ul className="dashboard-points">
              {TIERS.map((tier) => (
                <li key={tier}>
                  <span>{tier}</span>
                  <span>{activePointSystem[tier] ?? 0} pts</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="dashboard-card">
            <h2>Tier Badges</h2>
            <p className="dashboard-card__hint">Visual tier labels.</p>
            <div className="dashboard-badges">
              {TIERS.map((tier) => (
                <span
                  key={tier}
                  className="dashboard-badge"
                  style={{ '--badge-color': TIER_COLORS[tier] }}
                >
                  {tier}
                </span>
              ))}
            </div>
          </section>

          {canCreateAdmins && (
            <section className="dashboard-card dashboard-card--wide dashboard-card--owner">
              <h2>
                <UserPlus size={20} />
                Create Admin Account
              </h2>
              <p className="dashboard-card__hint">Owner only — add new admin logins.</p>

              <form className="dashboard-create-form" onSubmit={handleCreateAdmin}>
                {createMessage.text && (
                  <div
                    className={`dashboard-message dashboard-message--${createMessage.type}`}
                    role="alert"
                  >
                    {createMessage.text}
                  </div>
                )}

                <div className="dashboard-create-form__fields">
                  <div className="dashboard-create-form__field">
                    <label htmlFor="new-admin-user">Username</label>
                    <input
                      id="new-admin-user"
                      type="text"
                      placeholder="New admin username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="dashboard-create-form__field">
                    <label htmlFor="new-admin-pass">Password</label>
                    <input
                      id="new-admin-pass"
                      type="password"
                      placeholder="New admin password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="dashboard-create-form__submit">
                    Create Admin
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      {showCreateTierlist && (
        <div className="modal-overlay" onClick={() => setShowCreateTierlist(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>Create Tierlist</h3>
              <button type="button" className="modal__close" onClick={() => setShowCreateTierlist(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTierlist}>
              {tierlistError && (
                <div className="dashboard-message dashboard-message--error" role="alert">
                  {tierlistError}
                </div>
              )}
              <div className="modal__field">
                <label htmlFor="tierlist-name">Tierlist name</label>
                <input
                  id="tierlist-name"
                  type="text"
                  placeholder="e.g. PvP"
                  value={newTierlistName}
                  onChange={(e) => setNewTierlistName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setShowCreateTierlist(false)}>
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

      {settingsModal && (
        <div className="modal-overlay" onClick={() => setSettingsModal(null)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>Tierlist Settings</h3>
              <button type="button" className="modal__close" onClick={() => setSettingsModal(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveSettings}>
              {settingsError && (
                <div className="dashboard-message dashboard-message--error" role="alert">
                  {settingsError}
                </div>
              )}

              <div className="modal__field">
                <label htmlFor="settings-name">Tierlist name</label>
                <input
                  id="settings-name"
                  type="text"
                  value={settingsModal.name}
                  onChange={(e) =>
                    setSettingsModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="modal__field modal__field--toggle">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settingsModal.autoTierAssignment}
                    onChange={(e) =>
                      setSettingsModal((prev) => ({
                        ...prev,
                        autoTierAssignment: e.target.checked,
                      }))
                    }
                  />
                  <span>Enable automatic tier assignment</span>
                </label>
                <p className="modal__hint">{getAutoTierRangesLabel()}</p>
              </div>

              <fieldset className="modal__future" disabled>
                <legend>Coming soon</legend>
                <div className="modal__field">
                  <label>Icon</label>
                  <input type="text" placeholder="Icon (future)" disabled />
                </div>
                <div className="modal__field">
                  <label>Color</label>
                  <input type="text" placeholder="Color (future)" disabled />
                </div>
                <div className="modal__field">
                  <label>Description</label>
                  <textarea placeholder="Description (future)" disabled rows={2} />
                </div>
              </fieldset>

              <div className="modal__actions">
                <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setSettingsModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn--primary">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tierSettingsModal && (
        <div className="modal-overlay" onClick={() => setTierSettingsModal(null)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>Tier Settings — {activeTierlist?.name}</h3>
              <button type="button" className="modal__close" onClick={() => setTierSettingsModal(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTierSettings}>
              <p className="modal__hint">
                Point values for this tierlist only. New players auto-fill from these values.
              </p>
              <div className="tier-points-list">
                {TIERS.map((tier) => (
                  <div key={tier} className="tier-points-list__row">
                    <label htmlFor={`pts-${tier}`}>{tier}</label>
                    <input
                      id={`pts-${tier}`}
                      type="number"
                      min="0"
                      value={tierSettingsModal[tier] ?? 0}
                      onChange={(e) =>
                        setTierSettingsModal((prev) => ({
                          ...prev,
                          [tier]: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="modal__actions">
                <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setTierSettingsModal(null)}>
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

      {playerModal && (
        <div className="modal-overlay" onClick={() => setPlayerModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>{playerModal.mode === 'add' ? 'Add Player' : 'Edit Player'}</h3>
              <button type="button" className="modal__close" onClick={() => setPlayerModal(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePlayer}>
              <div className="modal__field">
                <label htmlFor="player-name">Player name</label>
                <input
                  id="player-name"
                  type="text"
                  placeholder="Enter player name"
                  value={playerModal.name}
                  onChange={(e) =>
                    setPlayerModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  autoFocus
                />
              </div>

              {playerModal.mode === 'add' && (
                <div className="modal__field">
                  <label htmlFor="player-tier-add">Tier</label>
                  <select
                    id="player-tier-add"
                    value={playerModal.manualTier}
                    onChange={(e) => setPlayerManualTier(e.target.value)}
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier} ({activePointSystem[tier]} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {playerModal.mode === 'edit' && activeTierlist?.autoTierAssignment && (
                <>
                  <div className="modal__field">
                    <span className="modal__label">Tier mode</span>
                    <div className="radio-row">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="tierMode"
                          checked={playerModal.tierMode === 'auto'}
                          onChange={() => setPlayerTierMode('auto')}
                        />
                        Auto
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="tierMode"
                          checked={playerModal.tierMode === 'manual'}
                          onChange={() => setPlayerTierMode('manual')}
                        />
                        Manual
                      </label>
                    </div>
                  </div>

                  {playerModal.tierMode === 'auto' ? (
                    <div className="modal__field">
                      <span className="modal__label">Calculated tier</span>
                      <div className="calculated-tier">
                        <span
                          className="tier-badge"
                          style={{
                            '--tier-color':
                              TIER_COLORS[playerModal.previewAutoTier] ?? '#a78bfa',
                          }}
                        >
                          {playerModal.previewAutoTier}
                        </span>
                        <span className="modal__hint">
                          Based on rank #{playerModal.mode === 'add' ? activeTierlist.players.length + 1 : '…'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="modal__field">
                      <label htmlFor="player-manual-tier">Manual tier</label>
                      <select
                        id="player-manual-tier"
                        value={playerModal.manualTier}
                        onChange={(e) => setPlayerManualTier(e.target.value)}
                      >
                        {TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier} ({activePointSystem[tier]} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {playerModal.mode === 'edit' && !activeTierlist?.autoTierAssignment && (
                <div className="modal__field">
                  <label htmlFor="player-manual-tier-only">Tier</label>
                  <select
                    id="player-manual-tier-only"
                    value={playerModal.manualTier}
                    onChange={(e) => setPlayerManualTier(e.target.value)}
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier} ({activePointSystem[tier]} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal__field">
                <label htmlFor="player-points">Points</label>
                <input
                  id="player-points"
                  type="number"
                  min="0"
                  value={playerModal.points}
                  onChange={(e) =>
                    setPlayerModal((prev) => ({
                      ...prev,
                      points: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="modal__actions">
                <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setPlayerModal(null)}>
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
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>Delete Player</h3>
              <button type="button" className="modal__close" onClick={() => setDeleteTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="modal__text">
              Remove <strong>{deleteTarget.name}</strong> from{' '}
              <strong>{activeTierlist?.name}</strong>? This cannot be undone.
            </p>
            <div className="modal__actions">
              <button type="button" className="modal-btn modal-btn--ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="modal-btn modal-btn--danger" onClick={handleDeletePlayer}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogs && (
        <AdminLogsModal
          data={data}
          user={user}
          isOwner={isOwner}
          onClose={() => setShowLogs(false)}
          onDataChange={setData}
        />
      )}
    </div>
  )
}
