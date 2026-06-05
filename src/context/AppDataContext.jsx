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

  const isAdmin = isAdminUser(user)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribe = subscribeAppData(
      (appData) => {
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
    async (newData) => {
      const prepared = prepareAppData(newData)

      if (isGuest(user)) {
        setData(prepared)
        return prepared
      }

      if (!canWriteFirestore(user)) {
        throw new Error('You must be signed in with Firebase Auth to save changes.')
      }

      setSaving(true)
      setError(null)
      try {
        const saved = await saveAppDataToFirestore(prepared)
        setData(saved)
        return saved
      } catch (saveError) {
        throw saveError
      } finally {
        setSaving(false)
      }
    },
    [user],
  )

  const appendAppLog = useCallback(
    async (logEntry) => {
      if (!logEntry || isGuest(user) || !data) return data
      return saveAppData(appendLog(data, logEntry))
    },
    [user, data, saveAppData],
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
        setSaving(false)
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
        setSaving(false)
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
        setSaving(false)
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
