import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import {
  APP_DATA_COLLECTION,
  APP_DATA_DOC_ID,
  serializeAppDataDoc,
} from './appDataFirestore'
import { importLogsToFirestore } from './logsFirestore'
import { importPlayersToFirestore } from './playersFirestore'
import { importSnapshotsToFirestore } from './snapshotsFirestore'
import { importSuggestionsToFirestore } from './suggestionsFirestore'
import { normalizeSuggestions } from './suggestions'

const appDataRef = doc(db, APP_DATA_COLLECTION, APP_DATA_DOC_ID)

/**
 * One-time migration: move large arrays out of appData/novaSmp into collections.
 * Safe to call repeatedly — no-op when legacy arrays are already gone.
 */
export async function migrateAppDataToCollections() {
  const snapshot = await getDoc(appDataRef)
  if (!snapshot.exists()) {
    return { migrated: false, players: 0, logs: 0, suggestions: 0, snapshots: 0 }
  }

  const raw = snapshot.data()
  const legacyPlayers = Array.isArray(raw?.smpPlayers) ? raw.smpPlayers : []
  const legacyLogs = Array.isArray(raw?.logs) ? raw.logs : []
  const legacySuggestions = normalizeSuggestions(raw?.suggestions)
  const legacySnapshots = Array.isArray(raw?.snapshots) ? raw.snapshots : []

  const hasLegacy =
    legacyPlayers.length > 0 ||
    legacyLogs.length > 0 ||
    legacySuggestions.length > 0 ||
    legacySnapshots.length > 0

  if (!hasLegacy) {
    return { migrated: false, players: 0, logs: 0, suggestions: 0, snapshots: 0 }
  }

  if (legacyPlayers.length > 0) {
    await importPlayersToFirestore(legacyPlayers)
  }
  if (legacyLogs.length > 0) {
    await importLogsToFirestore(legacyLogs)
  }
  if (legacySuggestions.length > 0) {
    await importSuggestionsToFirestore(legacySuggestions)
  }
  if (legacySnapshots.length > 0) {
    await importSnapshotsToFirestore(legacySnapshots)
  }

  await setDoc(appDataRef, serializeAppDataDoc(raw))

  return {
    migrated: true,
    players: legacyPlayers.length,
    logs: legacyLogs.length,
    suggestions: legacySuggestions.length,
    snapshots: legacySnapshots.length,
  }
}
