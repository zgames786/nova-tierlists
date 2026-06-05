import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { prepareAppData } from '../utils/appData'
import {
  appendSuggestionToFirestore,
  loadAppData,
  saveAppData as saveAppDataToFirestore,
  subscribeAppData,
} from '../utils/appDataFirestore'
import { isGuest } from '../utils/adminAuth'
import { createSnapshot } from '../utils/snapshotsFirestore'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

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

  const saveAppData = useCallback(
    async (newData, options = {}) => {
      const prepared = prepareAppData(newData)
      const { snapshotTrigger, snapshotLabel, skipSnapshot = false } = options

      if (isGuest(user)) {
        setData(prepared)
        return prepared
      }

      setSaving(true)
      setError(null)
      try {
        if (!skipSnapshot && snapshotTrigger && data) {
          await createSnapshot(data, {
            createdBy: user?.username ?? 'unknown',
            trigger: snapshotTrigger,
            label: snapshotLabel ?? snapshotTrigger,
          })
        }

        const saved = await saveAppDataToFirestore(prepared)
        setData(saved)
        return saved
      } catch (saveError) {
        const message =
          saveError?.message ?? 'Failed to save NovaSMP data to Firestore.'
        setError(message)
        throw saveError
      } finally {
        setSaving(false)
      }
    },
    [user, data],
  )

  const submitSuggestion = useCallback(
    async (suggestion, logEntry = null) => {
      setSaving(true)
      setError(null)
      try {
        const saved = await appendSuggestionToFirestore(suggestion, logEntry)
        setData(saved)
        return saved
      } catch (submitError) {
        const message =
          submitError?.message ?? 'Failed to submit suggestion to Firestore.'
        setError(message)
        throw submitError
      } finally {
        setSaving(false)
      }
    },
    [],
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
      loading,
      error,
      saving,
      saveAppData,
      submitSuggestion,
      refreshAppData,
      setData,
    }),
    [data, loading, error, saving, saveAppData, submitSuggestion, refreshAppData],
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
