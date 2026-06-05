import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { createDefaultAppData, prepareAppData } from './appData'

export const APP_DATA_COLLECTION = 'appData'
export const APP_DATA_DOC_ID = 'novaSmp'

const appDataRef = doc(db, APP_DATA_COLLECTION, APP_DATA_DOC_ID)

function serializeForFirestore(data) {
  const prepared = prepareAppData(data)
  const { suggestions: _legacySuggestions, ...withoutSuggestions } = prepared
  return JSON.parse(JSON.stringify(withoutSuggestions))
}

/** Read app data only — never writes (safe for guests and pre-login). */
export async function loadAppData() {
  const snapshot = await getDoc(appDataRef)

  if (!snapshot.exists()) {
    return prepareAppData(createDefaultAppData())
  }

  return prepareAppData(snapshot.data())
}

export async function saveAppData(data) {
  const prepared = serializeForFirestore(data)
  await setDoc(appDataRef, prepared)
  return prepared
}

export function subscribeAppData(onData, onError) {
  return onSnapshot(
    appDataRef,
    (snapshot) => {
      try {
        if (!snapshot.exists()) {
          onData(prepareAppData(createDefaultAppData()))
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
