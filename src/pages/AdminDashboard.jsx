import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
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
import SnapshotsModal from '../components/SnapshotsModal'
import SmpPlayerListSection from '../components/SmpPlayerListSection'
import SuggestionsSection from '../components/SuggestionsSection'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { AUTH_EMAIL_DOMAIN, clearOldLocalAdmins } from '../utils/adminAuth'
import { getManagedAdmins } from '../utils/adminStorage'
import {
  ACTION_TYPES,
  appendLog,
  createLogEntry,
  formatLogTime,
  SNAPSHOT_TRIGGERS,
} from '../utils/activityLog'
import {
  BACKUP_FILENAME,
  buildBackupPayload,
  buildImportedAppData,
  buildPublicRankingsPayload,
  downloadBackupJson,
  downloadPublicRankingsJson,
  parseBackupFile,
  validateBackupPayload,
} from '../utils/backup'
import {
  snapshotPlayer,
  snapshotPlayers,
  snapshotPointSystem,
  snapshotTierlistForCreate,
} from '../utils/logSnapshots'
import { buildRankedPlayerRows } from '../utils/rankingDisplay'
import { restoreSnapshot } from '../utils/snapshotsFirestore'
import {
  TIERS,
  TIER_COLORS,
  DEFAULT_TIER,
  createTierlist,
  deleteTierlist,
  getAutoTierForPosition,
  getAutoTierRangesLabel,
  getDefaultPoints,
  getEffectiveTier,
  getPointSystem,
  isOverallTierlist,
  movePlayer,
  OVERALL_ID,
  resolvePlayerDisplay,
  updateTierlistPlayerRank,
  updatePointSystem,
  updateTierlistSettings,
} from '../utils/tierlistsStorage'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout, exitGuest, isGuest, canManageAdmins, isOwner } = useAuth()
  const { data, saveAppData, submitSuggestion, saving, error: dataError } = useAppData()
  const importInputRef = useRef(null)

  const [activeId, setActiveId] = useState('overall')

  useEffect(() => {
    if (data?.tierlists?.length) {
      setActiveId((current) =>
        data.tierlists.some((tierlist) => tierlist.id === current)
          ? current
          : data.tierlists[0].id,
      )
    }
  }, [data])

  const [showCreateTierlist, setShowCreateTierlist] = useState(false)
  const [newTierlistName, setNewTierlistName] = useState('')
  const [tierlistError, setTierlistError] = useState('')

  const [settingsModal, setSettingsModal] = useState(null)
  const [settingsError, setSettingsError] = useState('')
  const [tierSettingsModal, setTierSettingsModal] = useState(null)

  const [playerModal, setPlayerModal] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [importError, setImportError] = useState('')

  const [clearLegacyMessage, setClearLegacyMessage] = useState({ type: '', text: '' })

  const hasLegacyAdmins = getManagedAdmins(data).length > 0

  const activeTierlist = data?.tierlists?.find((t) => t.id === activeId) ?? data?.tierlists?.[0]
  const isOverallViewEarly = activeTierlist ? isOverallTierlist(activeTierlist) : false
  const rankedPlayerRows = useMemo(() => {
    if (!activeTierlist?.players?.length) return []
    return buildRankedPlayerRows(
      activeTierlist.players,
      (player) => resolvePlayerDisplay(player, activeTierlist).points,
      { competition: isOverallViewEarly },
    )
  }, [activeTierlist, isOverallViewEarly])

  if (!data) {
    return null
  }

  const activePointSystem = activeTierlist ? getPointSystem(activeTierlist) : {}
  const isOverallView = activeTierlist ? isOverallTierlist(activeTierlist) : false
  const isReadOnlyView = isGuest || isOverallView

  const makeLog = ({
    actionType,
    targetType,
    targetName,
    details,
    beforeState = null,
    afterState = null,
    canUndo = false,
  }) =>
    createLogEntry({
      adminUsername: user?.username,
      adminRole: user?.role,
      actionType,
      targetType,
      targetName,
      details,
      beforeState,
      afterState,
      canUndo,
    })

  const logAndSave = async (newData, entry, snapshotTrigger) => {
    const withLog = entry ? appendLog(newData, entry) : newData
    return saveAppData(withLog, snapshotTrigger ? { snapshotTrigger } : {})
  }

  const handleLogout = async () => {
    const entry = makeLog({
      actionType: ACTION_TYPES.ADMIN_LOGOUT,
      targetType: 'session',
      targetName: user?.username ?? '',
      details: `${user?.username ?? 'Admin'} logged out`,
    })
    try {
      await logAndSave(data, entry)
    } catch {
      /* still sign out if log save fails */
    }
    await logout()
    navigate('/')
  }

  const handleExit = () => {
    exitGuest()
    navigate('/')
  }

  const handleExport = async () => {
    if (isGuest) {
      downloadPublicRankingsJson(buildPublicRankingsPayload(data))
      return
    }

    const payload = buildBackupPayload(data, user)
    downloadBackupJson(payload)
    try {
      await logAndSave(
        data,
        makeLog({
          actionType: ACTION_TYPES.BACKUP_EXPORTED,
          targetType: 'backup',
          targetName: BACKUP_FILENAME,
          details: 'Exported full app data backup',
        }),
      )
    } catch {
      setImportError('Export downloaded, but failed to save export log to Firestore.')
    }
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

      const imported = buildImportedAppData(payload)
      const saved = await logAndSave(
        imported,
        makeLog({
          actionType: ACTION_TYPES.BACKUP_IMPORTED,
          targetType: 'backup',
          targetName: file.name,
          details: 'Imported backup and replaced app data in Firestore',
        }),
        SNAPSHOT_TRIGGERS.IMPORT_DATA,
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

  const handleDeleteTierlist = async () => {
    if (!activeTierlist || isOverallView || !isOwner) return

    if (
      !window.confirm(
        `Delete tierlist "${activeTierlist.name}"? This cannot be undone.`,
      )
    ) {
      return
    }

    const result = deleteTierlist(data, activeTierlist.id)
    if (!result.success) return

    await logAndSave(
      result.data,
      makeLog({
        actionType: ACTION_TYPES.TIERLIST_DELETED,
        targetType: 'tierlist',
        targetName: result.tierlist.name,
        details: `Deleted tierlist "${result.tierlist.name}"`,
        beforeState: {
          tierlistId: result.tierlist.id,
          tierlist: snapshotTierlistForCreate(result.tierlist),
        },
        afterState: {},
      }),
      SNAPSHOT_TRIGGERS.TIERLIST_DELETED,
    )
    setActiveId(OVERALL_ID)
  }

  const handleCreateTierlist = async (e) => {
    e.preventDefault()
    setTierlistError('')
    const result = createTierlist(data, newTierlistName)
    if (result.success) {
      const created = result.data.tierlists.find((tierlist) => tierlist.id === result.tierlist.id)
      await logAndSave(
        result.data,
        makeLog({
          actionType: ACTION_TYPES.TIERLIST_CREATED,
          targetType: 'tierlist',
          targetName: result.tierlist.name,
          details: `Created tierlist "${result.tierlist.name}"`,
          beforeState: null,
          afterState: {
            tierlistId: created.id,
            tierlist: snapshotTierlistForCreate(created),
          },
          canUndo: true,
        }),
        SNAPSHOT_TRIGGERS.TIERLIST_CREATED,
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

  const handleSaveTierSettings = async (e) => {
    e.preventDefault()
    if (!tierSettingsModal || !activeTierlist) return
    const result = updatePointSystem(data, activeTierlist.id, tierSettingsModal)
    if (result.success) {
      const updated = result.data.tierlists.find((tierlist) => tierlist.id === activeTierlist.id)
      await logAndSave(
        result.data,
        makeLog({
          actionType: ACTION_TYPES.TIERLIST_POINT_SYSTEM_UPDATED,
          targetType: 'tierlist',
          targetName: activeTierlist.name,
          details: `Updated point system for "${activeTierlist.name}"`,
          beforeState: {
            tierlistId: activeTierlist.id,
            pointSystem: snapshotPointSystem(activeTierlist),
          },
          afterState: {
            tierlistId: activeTierlist.id,
            pointSystem: snapshotPointSystem(updated),
          },
          canUndo: true,
        }),
        SNAPSHOT_TRIGGERS.POINT_SYSTEM_UPDATED,
      )
      setTierSettingsModal(null)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    if (!settingsModal || !activeTierlist) return
    setSettingsError('')

    const result = updateTierlistSettings(data, activeTierlist.id, settingsModal)
    if (result.success) {
      const newName = settingsModal.name.trim()
      const renamed = result.oldName && result.oldName !== newName
      if (renamed) {
        await logAndSave(
          result.data,
          makeLog({
            actionType: ACTION_TYPES.TIERLIST_RENAMED,
            targetType: 'tierlist',
            targetName: newName,
            details: `Renamed tierlist from "${result.oldName}" to "${newName}"`,
            beforeState: { tierlistId: activeTierlist.id, name: result.oldName },
            afterState: { tierlistId: activeTierlist.id, name: newName },
            canUndo: true,
          }),
          SNAPSHOT_TRIGGERS.TIERLIST_RENAMED,
        )
      } else {
        await logAndSave(result.data)
      }
      setSettingsModal(null)
    } else {
      setSettingsError(result.error)
    }
  }

  const openEditPlayer = (player, index) => {
    const display = resolvePlayerDisplay(player, activeTierlist)
    setPlayerModal({
      playerId: player.id,
      playerName: player.name,
      tierMode: player.tierMode ?? 'manual',
      manualTier: player.manualTier ?? display.tier,
      points: player.points,
      previewAutoTier: getAutoTierForPosition(index + 1),
    })
  }

  const handleSavePlayer = async (e) => {
    e.preventDefault()
    if (!playerModal || !activeTierlist) return

    const payload = {
      tierMode: playerModal.tierMode,
      manualTier: playerModal.manualTier,
      points: playerModal.points,
    }

    const result = updateTierlistPlayerRank(
      data,
      activeTierlist.id,
      playerModal.playerId,
      payload,
    )

    if (result.success) {
      const tier = getEffectiveTier({
        tierMode: playerModal.tierMode,
        manualTier: playerModal.manualTier,
        autoTier: playerModal.previewAutoTier,
      })
      const points = Number(playerModal.points)
      const playerName = playerModal.playerName
      const updatedTierlist = result.data.tierlists.find(
        (tierlist) => tierlist.id === activeTierlist.id,
      )
      const beforePlayer = activeTierlist.players.find(
        (player) => player.id === playerModal.playerId,
      )
      const afterPlayer = updatedTierlist.players.find(
        (player) => player.id === playerModal.playerId,
      )

      await logAndSave(
        result.data,
        makeLog({
          actionType: ACTION_TYPES.TIERLIST_PLAYER_RANK_UPDATED,
          targetType: 'player',
          targetName: playerName,
          details: `Updated ${playerName} on ${activeTierlist.name} (tier ${tier}, ${points} points)`,
          beforeState: {
            tierlistId: activeTierlist.id,
            player: snapshotPlayer(beforePlayer),
          },
          afterState: {
            tierlistId: activeTierlist.id,
            player: snapshotPlayer(afterPlayer),
          },
          canUndo: true,
        }),
        SNAPSHOT_TRIGGERS.TIERLIST_RANK_CHANGED,
      )
      setPlayerModal(null)
    }
  }

  const handleMove = async (playerId, direction) => {
    const beforeTierlist = data.tierlists.find((tierlist) => tierlist.id === activeTierlist.id)
    const result = movePlayer(data, activeTierlist.id, playerId, direction)
    if (result.success) {
      const moved = result.moved
      const afterTierlist = result.data.tierlists.find(
        (tierlist) => tierlist.id === activeTierlist.id,
      )
      await logAndSave(
        result.data,
        makeLog({
          actionType: ACTION_TYPES.TIERLIST_PLAYER_MOVED,
          targetType: 'player',
          targetName: moved?.name ?? '',
          details: `Moved ${moved?.name ?? 'player'} ${direction} on ${activeTierlist.name}`,
          beforeState: {
            tierlistId: activeTierlist.id,
            players: snapshotPlayers(beforeTierlist.players),
          },
          afterState: {
            tierlistId: activeTierlist.id,
            players: snapshotPlayers(afterTierlist.players),
          },
          canUndo: true,
        }),
        SNAPSHOT_TRIGGERS.PLAYER_MOVED,
      )
    }
  }

  const handleClearOldAdmins = async () => {
    setClearLegacyMessage({ type: '', text: '' })

    if (
      !window.confirm(
        'Clear all legacy local admin records from Firestore? Firebase Auth accounts are not affected.',
      )
    ) {
      return
    }

    const result = clearOldLocalAdmins(user, data)
    if (result.success) {
      await logAndSave(
        result.data,
        makeLog({
          actionType: ACTION_TYPES.OLD_ADMINS_CLEARED,
          targetType: 'admins',
          targetName: 'legacy admins',
          details: `Owner ${user?.username} cleared ${result.clearedCount} legacy admin record(s)`,
        }),
      )
      setClearLegacyMessage({
        type: 'success',
        text: `Cleared ${result.clearedCount} legacy admin record(s).`,
      })
    } else {
      setClearLegacyMessage({ type: 'error', text: result.error })
    }
  }

  const setPlayerTierMode = (tierMode) => {
    setPlayerModal((prev) => {
      const manualTier = prev.manualTier ?? DEFAULT_TIER
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

  const handleSmpSave = async (newData, entry, snapshotTrigger) => {
    await logAndSave(newData, entry, snapshotTrigger)
  }

  const smpPlayerLogHandlers = {
    playerCreated: (player) =>
      makeLog({
        actionType: ACTION_TYPES.PLAYER_CREATED,
        targetType: 'smp_player',
        targetName: player.name,
        details: `Added SMP player ${player.name}`,
        afterState: { player },
        canUndo: true,
      }),
    playerUpdated: (player, previousName) =>
      makeLog({
        actionType: ACTION_TYPES.PLAYER_UPDATED,
        targetType: 'smp_player',
        targetName: player.name,
        details: `Renamed SMP player from "${previousName}" to "${player.name}"`,
        beforeState: { name: previousName },
        afterState: { player },
        canUndo: true,
      }),
    playerDeleted: (player) =>
      makeLog({
        actionType: ACTION_TYPES.PLAYER_DELETED,
        targetType: 'smp_player',
        targetName: player.name,
        details: `Deleted SMP player ${player.name} from all tierlists`,
        beforeState: { player },
        canUndo: true,
      }),
  }

  const suggestionLogHandlers = {
    suggestionCreated: (suggestion) =>
      createLogEntry({
        adminUsername: suggestion.submittedBy,
        adminRole: suggestion.submittedByRole,
        actionType: ACTION_TYPES.SUGGESTION_CREATED,
        targetType: 'suggestion',
        targetName: suggestion.submittedBy,
        details: `New suggestion: ${suggestion.type}`,
        afterState: { suggestion },
      }),
    suggestionReviewed: (suggestion, previousStatus) =>
      makeLog({
        actionType: ACTION_TYPES.SUGGESTION_REVIEWED,
        targetType: 'suggestion',
        targetName: suggestion.submittedBy,
        details: `Marked suggestion as reviewed (was ${previousStatus})`,
        beforeState: { status: previousStatus },
        afterState: { suggestion },
      }),
    suggestionApproved: (suggestion, previousStatus) =>
      makeLog({
        actionType: ACTION_TYPES.SUGGESTION_APPROVED,
        targetType: 'suggestion',
        targetName: suggestion.submittedBy,
        details: `Approved suggestion (was ${previousStatus})`,
        beforeState: { status: previousStatus },
        afterState: { suggestion },
      }),
    suggestionRejected: (suggestion, previousStatus) =>
      makeLog({
        actionType: ACTION_TYPES.SUGGESTION_REJECTED,
        targetType: 'suggestion',
        targetName: suggestion.submittedBy,
        details: `Rejected suggestion (was ${previousStatus})`,
        beforeState: { status: previousStatus },
        afterState: { suggestion },
      }),
    suggestionDeleted: (suggestion) =>
      makeLog({
        actionType: ACTION_TYPES.SUGGESTION_DELETED,
        targetType: 'suggestion',
        targetName: suggestion.submittedBy,
        details: 'Deleted suggestion',
        beforeState: { suggestion },
      }),
  }

  const handleRestoreSnapshot = async (snapshot) => {
    const restored = await restoreSnapshot(snapshot)
    await logAndSave(
      restored,
      makeLog({
        actionType: ACTION_TYPES.SNAPSHOT_RESTORED,
        targetType: 'snapshot',
        targetName: snapshot.label ?? snapshot.trigger,
        details: `Restored snapshot from ${formatLogTime(snapshot.createdAt)}`,
      }),
    )
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="dashboard-nav__brand">
          <Shield size={22} className="dashboard-nav__icon" />
          <div>
            <span className="dashboard-nav__title">NovaSMP Tierlists</span>
            <span className="dashboard-nav__subtitle">
              {isGuest ? 'Rankings' : 'Admin Dashboard'}
            </span>
          </div>
        </div>

        <div className="dashboard-nav__actions">
          {isGuest ? (
            <>
              <div className="dashboard-nav__user dashboard-nav__user--guest">
                <span className="dashboard-nav__username">Guest Mode</span>
                <span className="dashboard-nav__role dashboard-nav__role--guest">guest</span>
              </div>
              <button
                type="button"
                className="dashboard-nav__link dashboard-nav__btn"
                onClick={handleExport}
              >
                <Download size={16} />
                Export Data
              </button>
              <button type="button" className="dashboard-nav__exit" onClick={handleExit}>
                <LogOut size={18} />
                Exit
              </button>
            </>
          ) : (
            <>
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
              {isOwner && (
                <button
                  type="button"
                  className="dashboard-nav__link dashboard-nav__btn"
                  onClick={() => setShowSnapshots(true)}
                >
                  <Camera size={16} />
                  Snapshots
                </button>
              )}
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
            </>
          )}
        </div>
      </nav>

      {(importError || dataError) && (
        <div className="dashboard-import-error" role="alert">
          {importError || dataError}
        </div>
      )}

      {saving && !isGuest && (
        <div className="dashboard-saving-banner" role="status">
          Saving to Firestore…
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
        {!isGuest && (
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
        )}
      </div>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__row">
            <div>
              <h1>{activeTierlist?.name ?? 'Tierlist'} Rankings</h1>
              {isOverallView ? (
                <>
                  <p className="overall-auto-label">
                    {isGuest
                      ? 'Auto-calculated overall ranking'
                      : 'Auto-calculated from all tierlists'}
                  </p>
                  {!isGuest && (
                    <p className="overall-auto-hint">
                      Combined points from every tierlist · tiers by rank ·{' '}
                      {getAutoTierRangesLabel()}
                    </p>
                  )}
                </>
              ) : (
                <p>
                  {isGuest
                    ? 'View-only rankings for this tierlist'
                    : activeTierlist?.autoTierAssignment
                      ? `Automatic tier assignment · ${getAutoTierRangesLabel()}`
                      : 'Manual tier assignment — tiers set per player'}
                </p>
              )}
            </div>
            <div className="dashboard-header__actions">
              {isOwner && !isOverallView && (
                <button
                  type="button"
                  className="btn-delete-tierlist"
                  onClick={handleDeleteTierlist}
                  title="Delete tierlist"
                  aria-label="Delete tierlist"
                >
                  <Trash2 size={18} />
                  Delete Tierlist
                </button>
              )}
              {!isReadOnlyView && (
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
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-card--wide">
            <div className="rankings-header">
              <h2>Player Rankings</h2>
              {!isReadOnlyView && (
                <div className="rankings-header__actions">
                  <button type="button" className="btn-tier-settings" onClick={openTierSettings}>
                    Tier Settings
                  </button>
                </div>
              )}
            </div>

            <div className="rankings-table">
              <div
                className={`rankings-row rankings-row--head${isReadOnlyView ? ' rankings-row--overall' : ''}`}
              >
                <span>#</span>
                <span>Player</span>
                <span>Tier</span>
                <span>Points</span>
                {!isReadOnlyView && <span>Mode</span>}
                {!isReadOnlyView && <span>Actions</span>}
              </div>

              {activeTierlist?.players.length === 0 && (
                <div className="rankings-empty">
                  {isGuest
                    ? 'No SMP players on this tierlist yet.'
                    : isOverallView
                      ? 'No SMP players yet. Add players to the global Player List below.'
                      : 'No SMP players yet. Add players to the global Player List below.'}
                </div>
              )}

              {rankedPlayerRows.map(({ player, displayRank }) => {
                const display = resolvePlayerDisplay(player, activeTierlist)
                const storageIndex = activeTierlist.players.findIndex(
                  (entry) => entry.id === player.id,
                )
                return (
                  <div
                    key={player.id}
                    className={`rankings-row${isReadOnlyView ? ' rankings-row--overall' : ''}`}
                  >
                    <span>{displayRank}</span>
                    <span className="rankings-player">{player.name}</span>
                    <span className="rankings-tier-cell">
                      <span
                        className="tier-badge"
                        style={{ '--tier-color': TIER_COLORS[display.tier] ?? '#a78bfa' }}
                      >
                        {display.tier}
                      </span>
                      {!isReadOnlyView &&
                        display.isManual &&
                        player.autoTier &&
                        player.autoTier !== display.tier && (
                          <span className="tier-auto-hint" title="Position-based auto tier">
                            auto: {player.autoTier}
                          </span>
                        )}
                    </span>
                    <span>{display.points}</span>
                    {!isReadOnlyView && (
                      <span>
                        <span
                          className={`mode-badge mode-badge--${player.tierMode === 'manual' ? 'manual' : 'auto'}`}
                        >
                          {player.tierMode === 'manual' ? 'Manual' : 'Auto'}
                        </span>
                      </span>
                    )}
                    {!isReadOnlyView && (
                      <span className="rankings-actions">
                        <button
                          type="button"
                          className="action-btn"
                          title="Edit rank"
                          onClick={() => openEditPlayer(player, storageIndex)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          title="Move up"
                          disabled={storageIndex <= 0}
                          onClick={() => handleMove(player.id, 'up')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          title="Move down"
                          disabled={storageIndex >= activeTierlist.players.length - 1}
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

          <SmpPlayerListSection
            data={data}
            canManage={!isGuest}
            user={user}
            onSave={(newData, entry) =>
              handleSmpSave(
                newData,
                entry,
                entry?.actionType === ACTION_TYPES.PLAYER_CREATED
                  ? SNAPSHOT_TRIGGERS.PLAYER_CREATED
                  : entry?.actionType === ACTION_TYPES.PLAYER_UPDATED
                    ? SNAPSHOT_TRIGGERS.PLAYER_UPDATED
                    : entry?.actionType === ACTION_TYPES.PLAYER_DELETED
                      ? SNAPSHOT_TRIGGERS.PLAYER_DELETED
                      : null,
              )
            }
            onLog={smpPlayerLogHandlers}
          />

          <SuggestionsSection
            data={data}
            user={user}
            isGuest={isGuest}
            canManageSuggestions={!isGuest}
            tierlists={data.tierlists}
            smpPlayers={(data.smpPlayers ?? []).filter((p) => p.status === 'active')}
            onSubmitSuggestion={submitSuggestion}
            onSave={(newData, entry) =>
              logAndSave(
                newData,
                entry,
                entry?.actionType?.startsWith('SUGGESTION_') &&
                  entry.actionType !== ACTION_TYPES.SUGGESTION_CREATED
                  ? SNAPSHOT_TRIGGERS.SUGGESTION_STATUS_CHANGED
                  : null,
              )
            }
            onLog={suggestionLogHandlers}
          />

          {canManageAdmins && (
            <section className="dashboard-card dashboard-card--wide dashboard-card--owner">
              <div className="admin-accounts-header">
                <div>
                  <h2>
                    <UserPlus size={20} />
                    Admin Accounts
                  </h2>
                </div>
                <span className="owner-only-badge">Owner only</span>
              </div>

              <div className="dashboard-message dashboard-message--info admin-auth-notice" role="status">
                Admin accounts are now managed in Firebase Authentication.
              </div>

              <div className="admin-auth-instructions">
                <p>To add an admin, create a Firebase Auth user with email:</p>
                <p>
                  <code>username{AUTH_EMAIL_DOMAIN}</code>
                </p>
                <p className="admin-auth-instructions__example">
                  Example: Username Light = <code>light{AUTH_EMAIL_DOMAIN}</code>
                </p>
              </div>

              {hasLegacyAdmins && (
                <div className="admin-clear-legacy">
                  {clearLegacyMessage.text && (
                    <div
                      className={`dashboard-message dashboard-message--${clearLegacyMessage.type}`}
                      role="alert"
                    >
                      {clearLegacyMessage.text}
                    </div>
                  )}
                  <button
                    type="button"
                    className="modal-btn modal-btn--ghost admin-clear-legacy__btn"
                    onClick={handleClearOldAdmins}
                  >
                    Clear Old Local Admin List
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {!isGuest && showCreateTierlist && (
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

      {!isGuest && settingsModal && (
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

      {!isGuest && tierSettingsModal && (
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

      {!isGuest && playerModal && (
        <div className="modal-overlay" onClick={() => setPlayerModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>Edit Rank — {playerModal.playerName}</h3>
              <button type="button" className="modal__close" onClick={() => setPlayerModal(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePlayer}>
              <p className="modal__hint">
                Player names are managed in the global SMP Player List.
              </p>

              {activeTierlist?.autoTierAssignment && (
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
                      </div>
                    </div>
                  ) : (
                    <div className="modal__field">
                      <label htmlFor="player-manual-tier">Tier</label>
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

              {!activeTierlist?.autoTierAssignment && (
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

      {isOwner && showSnapshots && (
        <SnapshotsModal
          data={data}
          user={user}
          onClose={() => setShowSnapshots(false)}
          onRestore={handleRestoreSnapshot}
        />
      )}

      {!isGuest && showLogs && (
        <AdminLogsModal
          data={data}
          user={user}
          canUndoActions={canManageAdmins}
          onClose={() => setShowLogs(false)}
          saveAppData={saveAppData}
          onActiveTierlistChange={(removedTierlistId, newData) => {
            if (activeId === removedTierlistId) {
              setActiveId(newData.tierlists[0]?.id ?? 'overall')
            }
          }}
        />
      )}

    </div>
  )
}
