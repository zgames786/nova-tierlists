import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { appendLog } from '../utils/activityLog'
import { mergeAppDataSources, prepareAppData } from '../utils/appData'
import {
  loadAppData,
  saveAppData as saveAppDataToFirestore,
  subscribeAppDataCore,
} from '../utils/appDataFirestore'
import { canWriteFirestore, isAdminUser, isGuestOnlySession } from '../utils/adminAuth'
import {
  appendLogToFirestore,
  clearLogsInFirestore,
  subscribeLogs,
  syncLogsToFirestore,
} from '../utils/logsFirestore'
import { setLoginLogSink } from '../utils/loginActivity'
import { migrateAppDataToCollections } from '../utils/migrateAppDataFirestore'
import {
  deletePlayerFromFirestore,
  savePlayerToFirestore,
  subscribePlayers,
} from '../utils/playersFirestore'
import {
  createSuggestionInFirestore,
  deleteSuggestionFromFirestore,
  importSuggestionsToFirestore,
  subscribeSuggestions,
  updateSuggestionStatusInFirestore,
} from '../utils/suggestionsFirestore'
import { SUGGESTION_STATUSES } from '../utils/suggestions'

const AppDataContext = createContext(null)

function diffPlayers(previous = [], next = []) {
  const previousMap = new Map(previous.map((player) => [player.id, player]))
  const nextMap = new Map(next.map((player) => [player.id, player]))
  const upsert = []
  const remove = []

  for (const [id, player] of nextMap) {
    const existing = previousMap.get(id)
    if (!existing || JSON.stringify(existing) !== JSON.stringify(player)) {
      upsert.push(player)
    }
  }

  for (const [id] of previousMap) {
    if (!nextMap.has(id)) {
      remove.push(id)
    }
  }

  return { upsert, remove }
}

function diffLogs(previous = [], next = []) {
  const writes = []
  const nextIds = new Set(next.map((log) => log.id))

  for (const log of next) {
    const existing = previous.find((entry) => entry.id === log.id)
    if (!existing || JSON.stringify(existing) !== JSON.stringify(log)) {
      writes.push(log)
    }
  }

  const deletes = previous.filter((log) => !nextIds.has(log.id)).map((log) => log.id)
  return { writes, deletes }
}

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [coreData, setCoreData] = useState(null)
  const [smpPlayers, setSmpPlayers] = useState(null)
  const [logs, setLogs] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const migrationAttempted = useRef(false)
  const dataRef = useRef(null)
  const pendingSavesRef = useRef(0)
  const saveGenerationRef = useRef(0)
  const writeQueueRef = useRef(Promise.resolve())
  const coreRef = useRef(null)
  const playersRef = useRef(null)
  const logsRef = useRef(null)

  const isAdmin = isAdminUser(user)

  const data = useMemo(() => {
    if (!coreData || smpPlayers === null || logs === null) {
      return null
    }
    return mergeAppDataSources(coreData, smpPlayers, logs)
  }, [coreData, smpPlayers, logs])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    setLoginLogSink(async (entry) => {
      pendingSavesRef.current += 1
      try {
        const updatedLogs = [entry, ...(logsRef.current ?? [])]
        logsRef.current = updatedLogs
        setLogs(updatedLogs)
        await appendLogToFirestore(entry)
        return entry
      } finally {
        pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1)
      }
    })

    return () => setLoginLogSink(null)
  }, [])

  const mergeAndSet = useCallback(() => {
    if (!coreRef.current || playersRef.current === null || logsRef.current === null) {
      return
    }
    setCoreData(coreRef.current)
    setSmpPlayers(playersRef.current)
    setLogs(logsRef.current)
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubCore = () => {}
    let unsubPlayers = () => {}
    let unsubLogs = () => {}

    const setup = async () => {
      setLoading(true)
      setError(null)

      if (isAdmin && !migrationAttempted.current) {
        migrationAttempted.current = true
        try {
          await migrateAppDataToCollections()
        } catch (migrationError) {
          console.warn('App data migration failed:', migrationError)
          setError(
            migrationError?.message ??
              'Failed to migrate app data out of the oversized document. Sign in as admin and reload.',
          )
        }
      }

      if (cancelled) return

      unsubCore = subscribeAppDataCore(
        (core) => {
          if (pendingSavesRef.current > 0) return
          coreRef.current = core
          mergeAndSet()
        },
        (loadError) => {
          setError(loadError?.message ?? 'Failed to load NovaSMP data from Firestore.')
          setLoading(false)
        },
      )

      unsubPlayers = subscribePlayers(
        (players) => {
          if (pendingSavesRef.current > 0) return
          playersRef.current = players
          mergeAndSet()
        },
        (loadError) => {
          setError(loadError?.message ?? 'Failed to load players from Firestore.')
          setLoading(false)
        },
      )

      if (isAdmin) {
        unsubLogs = subscribeLogs(
          (entries) => {
            if (pendingSavesRef.current > 0) return
            logsRef.current = entries
            mergeAndSet()
          },
          (loadError) => {
            setError(loadError?.message ?? 'Failed to load activity logs from Firestore.')
            setLoading(false)
          },
        )
      } else {
        logsRef.current = []
        mergeAndSet()
      }
    }

    setup()

    return () => {
      cancelled = true
      unsubCore()
      unsubPlayers()
      unsubLogs()
    }
  }, [isAdmin, mergeAndSet])

  useEffect(() => {
    if (!isAdmin) {
      setSuggestions([])
      return undefined
    }

    const unsubscribe = subscribeSuggestions(
      (items) => setSuggestions(items),
      (loadError) => {
        setError(loadError?.message ?? 'Failed to load suggestions from Firestore.')
      },
    )

    return unsubscribe
  }, [isAdmin])

  const persistPreparedData = useCallback(
    (prepared, previousData) => {
      const saveId = ++saveGenerationRef.current
      const rollbackData = previousData
      pendingSavesRef.current += 1

      setSaving(true)
      setError(null)

      const { upsert: playersToUpsert, remove: playersToRemove } = diffPlayers(
        previousData?.smpPlayers ?? [],
        prepared.smpPlayers ?? [],
      )
      const { writes: logsToWrite, deletes: logsToDelete } = diffLogs(
        previousData?.logs ?? [],
        prepared.logs ?? [],
      )

      coreRef.current = {
        version: prepared.version,
        settings: prepared.settings,
        admins: prepared.admins,
        tierlists: prepared.tierlists,
      }
      playersRef.current = prepared.smpPlayers ?? []
      logsRef.current = prepared.logs ?? []
      setCoreData(coreRef.current)
      setSmpPlayers(playersRef.current)
      setLogs(logsRef.current)

      writeQueueRef.current = writeQueueRef.current.then(async () => {
        try {
          await saveAppDataToFirestore(prepared)
          await Promise.all([
            ...playersToUpsert.map((player) => savePlayerToFirestore(player)),
            ...playersToRemove.map((playerId) => deletePlayerFromFirestore(playerId)),
            ...logsToWrite.map((entry) => appendLogToFirestore(entry)),
          ])

          if (logsToDelete.length > 0) {
            await clearLogsInFirestore()
            if ((prepared.logs ?? []).length > 0) {
              await syncLogsToFirestore(prepared.logs)
            }
          }
        } catch (saveError) {
          if (saveId === saveGenerationRef.current && rollbackData) {
            coreRef.current = {
              version: rollbackData.version,
              settings: rollbackData.settings,
              admins: rollbackData.admins,
              tierlists: rollbackData.tierlists,
            }
            playersRef.current = rollbackData.smpPlayers ?? []
            logsRef.current = rollbackData.logs ?? []
            setCoreData(coreRef.current)
            setSmpPlayers(playersRef.current)
            setLogs(logsRef.current)
          }
          setError(saveError?.message ?? 'Failed to save to Firestore.')
        } finally {
          pendingSavesRef.current -= 1
          if (pendingSavesRef.current <= 0) {
            pendingSavesRef.current = 0
            setSaving(false)
          }
        }
      })

      return Promise.resolve(prepared)
    },
    [],
  )

  const saveAppData = useCallback(
    (newData) => {
      const prepared = prepareAppData(newData)

      if (isGuestOnlySession(user)) {
        coreRef.current = {
          version: prepared.version,
          settings: prepared.settings,
          admins: prepared.admins,
          tierlists: prepared.tierlists,
        }
        playersRef.current = prepared.smpPlayers ?? []
        logsRef.current = prepared.logs ?? []
        setCoreData(coreRef.current)
        setSmpPlayers(playersRef.current)
        setLogs(logsRef.current)
        return Promise.resolve(prepared)
      }

      if (!canWriteFirestore(user)) {
        return Promise.reject(new Error('You must be signed in with Firebase Auth to save changes.'))
      }

      return persistPreparedData(prepared, dataRef.current)
    },
    [user, persistPreparedData],
  )

  const appendAppLog = useCallback(
    (logEntry) => {
      if (!logEntry || !dataRef.current) {
        return Promise.resolve(dataRef.current)
      }

      if (isGuestOnlySession(user)) {
        return Promise.resolve(dataRef.current)
      }

      const withLog = appendLog(dataRef.current, logEntry)
      return saveAppData(withLog)
    },
    [user, saveAppData],
  )

  const submitSuggestion = useCallback(
    async (suggestion, logEntry = null) => {
      setSaving(true)
      setError(null)
      try {
        await createSuggestionInFirestore(suggestion)
        if (logEntry && isAdmin) {
          await appendAppLog(logEntry)
        }
        return suggestion
      } catch (submitError) {
        const message =
          submitError?.message ?? 'Failed to submit suggestion to Firestore.'
        setError(message)
        throw submitError
      } finally {
        if (pendingSavesRef.current <= 0) {
          setSaving(false)
        }
      }
    },
    [isAdmin, appendAppLog],
  )

  const updateSuggestionStatus = useCallback(
    async (suggestionId, status) => {
      if (!isAdmin) {
        throw new Error('Only admins can update suggestions.')
      }

      const existing = suggestions.find((item) => item.id === suggestionId)
      if (!existing) {
        throw new Error('Suggestion not found.')
      }

      if (!SUGGESTION_STATUSES.includes(status)) {
        throw new Error('Invalid suggestion status.')
      }

      setSaving(true)
      setError(null)
      try {
        await updateSuggestionStatusInFirestore(suggestionId, status)
        return {
          suggestion: { ...existing, status },
          previousStatus: existing.status,
        }
      } catch (updateError) {
        const message = updateError?.message ?? 'Failed to update suggestion.'
        setError(message)
        throw updateError
      } finally {
        if (pendingSavesRef.current <= 0) {
          setSaving(false)
        }
      }
    },
    [isAdmin, suggestions],
  )

  const deleteSuggestion = useCallback(
    async (suggestionId) => {
      if (!isAdmin) {
        throw new Error('Only admins can delete suggestions.')
      }

      const existing = suggestions.find((item) => item.id === suggestionId)
      if (!existing) {
        throw new Error('Suggestion not found.')
      }

      setSaving(true)
      setError(null)
      try {
        await deleteSuggestionFromFirestore(suggestionId)
        return existing
      } catch (deleteError) {
        const message = deleteError?.message ?? 'Failed to delete suggestion.'
        setError(message)
        throw deleteError
      } finally {
        if (pendingSavesRef.current <= 0) {
          setSaving(false)
        }
      }
    },
    [isAdmin, suggestions],
  )

  const importSuggestions = useCallback(
    async (items = []) => {
      if (!isAdmin) {
        throw new Error('Only admins can import suggestions.')
      }
      return importSuggestionsToFirestore(items)
    },
    [isAdmin],
  )

  const refreshAppData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadAppData()
      coreRef.current = {
        version: loaded.version,
        settings: loaded.settings,
        admins: loaded.admins,
        tierlists: loaded.tierlists,
      }
      playersRef.current = loaded.smpPlayers ?? []
      logsRef.current = loaded.logs ?? []
      setCoreData(coreRef.current)
      setSmpPlayers(playersRef.current)
      setLogs(logsRef.current)
      return loaded
    } catch (loadError) {
      setError(loadError?.message ?? 'Failed to load NovaSMP data from Firestore.')
      throw loadError
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      data,
      suggestions,
      loading,
      error,
      saving,
      saveAppData,
      submitSuggestion,
      updateSuggestionStatus,
      deleteSuggestion,
      importSuggestions,
      appendAppLog,
      refreshAppData,
      setData: saveAppData,
    }),
    [
      data,
      suggestions,
      loading,
      error,
      saving,
      saveAppData,
      submitSuggestion,
      updateSuggestionStatus,
      deleteSuggestion,
      importSuggestions,
      appendAppLog,
      refreshAppData,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider')
  }
  return ctx
}
