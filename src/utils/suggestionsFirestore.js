import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { APP_DATA_COLLECTION, APP_DATA_DOC_ID, serializeAppDataDoc } from './appDataFirestore'
import { normalizeSuggestions } from './suggestions'

export const SUGGESTIONS_COLLECTION = 'suggestions'

const suggestionsCollection = collection(db, SUGGESTIONS_COLLECTION)

function suggestionDocRef(id) {
  return doc(db, SUGGESTIONS_COLLECTION, id)
}

export async function createSuggestionInFirestore(suggestion) {
  await setDoc(suggestionDocRef(suggestion.id), suggestion)
  return suggestion
}

export async function updateSuggestionStatusInFirestore(suggestionId, status) {
  await updateDoc(suggestionDocRef(suggestionId), { status })
}

export async function deleteSuggestionFromFirestore(suggestionId) {
  await deleteDoc(suggestionDocRef(suggestionId))
}

export function subscribeSuggestions(onData, onError) {
  const suggestionsQuery = query(suggestionsCollection, orderBy('createdAt', 'desc'))

  return onSnapshot(
    suggestionsQuery,
    (snapshot) => {
      try {
        const items = snapshot.docs.map((entry) => normalizeSuggestions([entry.data()])[0])
        onData(items)
      } catch (error) {
        onError?.(error)
      }
    },
    (error) => onError?.(error),
  )
}

export async function importSuggestionsToFirestore(suggestions = []) {
  const normalized = normalizeSuggestions(suggestions)
  await Promise.all(
    normalized.map((suggestion) => setDoc(suggestionDocRef(suggestion.id), suggestion)),
  )
  return normalized
}

/** @deprecated Use migrateAppDataToCollections */
export async function migrateLegacySuggestionsFromAppData() {
  const appDataRef = doc(db, APP_DATA_COLLECTION, APP_DATA_DOC_ID)
  const snapshot = await getDoc(appDataRef)

  if (!snapshot.exists()) {
    return { migrated: 0 }
  }

  const raw = snapshot.data()
  const legacy = normalizeSuggestions(raw?.suggestions)
  if (legacy.length === 0) {
    return { migrated: 0 }
  }

  await importSuggestionsToFirestore(legacy)
  await setDoc(appDataRef, serializeAppDataDoc(raw))

  return { migrated: legacy.length }
}
