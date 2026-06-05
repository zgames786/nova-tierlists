import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { appendLog } from '../utils/activityLog'
import { prepareAppData } from '../utils/appData'
import {
  loadAppData,
  saveAppData as saveAppDataToFirestore,
  subscribeAppData,
} from '../utils/appDataFirestore'
import { canWriteFirestore, isAdminUser, isGuest } from '../utils/adminAuth'
import {
  createSuggestionInFirestore,
  deleteSuggestionFromFirestore,
  importSuggestionsToFirestore,
  migrateLegacySuggestionsFromAppData,
  subscribeSuggestions,
  updateSuggestionStatusInFirestore,
} from '../utils/suggestionsFirestore'
import { SUGGESTION_STATUSES } from '../utils/suggestions'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const migrationAttempted = useRef(false)
  const dataRef = useRef(null)
  const pendingSavesRef = useRef(0)
  const saveGenerationRef = useRef(0)
  const writeQueueRef = useRef(Promise.resolve())

  const isAdmin = isAdminUser(user)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribe = subscribeAppData(
      (appData) => {
        if (pendingSavesRef.current > 0) {
          return
        }
        dataRef.current = appData
        setData(appData)
        setLoading(false)
        setError(null)
      },
      (loadError) => {
        setError(loadError?.message ?? 'Failed to load NovaSMP data from Firestore.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setSuggestions([])
      return undefined
    }

    if (!migrationAttempted.current) {
      migrationAttempted.current = true
      migrateLegacySuggestionsFromAppData().catch(() => {})
    }

    const unsubscribe = subscribeSuggestions(
      (items) => setSuggestions(items),
      (loadError) => {
        setError(loadError?.message ?? 'Failed to load suggestions from Firestore.')
      },
    )

    return unsubscribe
  }, [isAdmin])

  const saveAppData = useCallback(
    (newData) => {
      const prepared = prepareAppData(newData)

      if (isGuest(user)) {
        dataRef.current = prepared
        setData(prepared)
        return Promise.resolve(prepared)
      }

      if (!canWriteFirestore(user)) {
        return Promise.reject(new Error('You must be signed in with Firebase Auth to save changes.'))
      }

      const saveId = ++saveGenerationRef.current
      const rollbackData = dataRef.current
      pendingSavesRef.current += 1

      setSaving(true)
      setError(null)
      dataRef.current = prepared
      setData(prepared)

      writeQueueRef.current = writeQueueRef.current.then(async () => {
        try {
          const saved = await saveAppDataToFirestore(prepared)
          if (saveId === saveGenerationRef.current) {
            dataRef.current = saved
            setData(saved)
          }
        } catch (saveError) {
          if (saveId === saveGenerationRef.current) {
            dataRef.current = rollbackData
            setData(rollbackData)
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
    [user],
  )

  const appendAppLog = useCallback(
    (logEntry) => {
      if (!logEntry || isGuest(user) || !dataRef.current) {
        return Promise.resolve(dataRef.current)
      }
      return saveAppData(appendLog(dataRef.current, logEntry))
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
      dataRef.current = loaded
      setData(loaded)
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
      setData,
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
