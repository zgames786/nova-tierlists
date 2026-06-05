import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { createDefaultAppData, prepareAppData } from './appData'
import { appendLog } from './activityLog'

export const APP_DATA_COLLECTION = 'appData'
export const APP_DATA_DOC_ID = 'novaSmp'

const appDataRef = doc(db, APP_DATA_COLLECTION, APP_DATA_DOC_ID)

function serializeForFirestore(data) {
  return JSON.parse(JSON.stringify(prepareAppData(data)))
}

export async function loadAppData() {
  const snapshot = await getDoc(appDataRef)

  if (!snapshot.exists()) {
    const defaults = createDefaultAppData()
    const prepared = serializeForFirestore(defaults)
    await setDoc(appDataRef, prepared)
    return prepared
  }

  return prepareAppData(snapshot.data())
}

export async function saveAppData(data) {
  const prepared = serializeForFirestore(data)
  await setDoc(appDataRef, prepared)
  return prepared
}

export async function appendSuggestionToFirestore(suggestion, logEntry = null) {
  const current = await loadAppData()
  let next = {
    ...current,
    suggestions: [suggestion, ...(current.suggestions ?? [])],
  }
  if (logEntry) {
    next = appendLog(next, logEntry)
  }
  return saveAppData(next)
}

export function subscribeAppData(onData, onError) {
  return onSnapshot(
    appDataRef,
    (snapshot) => {
      try {
        if (!snapshot.exists()) {
          loadAppData()
            .then(onData)
            .catch((error) => onError?.(error))
          return
        }
        onData(prepareAppData(snapshot.data()))
      } catch (error) {
        onError?.(error)
      }
    },
    (error) => onError?.(error),
  )
}
