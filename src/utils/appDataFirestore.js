import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { DATA_VERSION } from './tierlistsStorage'
import { createDefaultAppData, mergeAppDataSources, prepareAppData } from './appData'
import { listLogsFromFirestore } from './logsFirestore'
import { listPlayersFromFirestore } from './playersFirestore'

export const APP_DATA_COLLECTION = 'appData'
export const APP_DATA_DOC_ID = 'novaSmp'

const appDataRef = doc(db, APP_DATA_COLLECTION, APP_DATA_DOC_ID)

/** Strip large arrays — only small config + tierlists belong in appData/novaSmp. */
export function serializeAppDataDoc(raw) {
  const source = raw ?? {}
  const { smpPlayers: _p, logs: _l, suggestions: _s, snapshots: _sn, ...core } = source

  return JSON.parse(
    JSON.stringify({
      version: core.version ?? DATA_VERSION,
      settings: core.settings ?? {},
      admins: core.admins ?? [],
      tierlists: core.tierlists ?? [],
    }),
  )
}

function readCoreAppData(raw) {
  if (!raw) {
    return serializeAppDataDoc(createDefaultAppData())
  }

  return {
    version: raw.version ?? DATA_VERSION,
    settings: raw.settings ?? {},
    admins: raw.admins ?? [],
    tierlists: raw.tierlists ?? [],
  }
}

/** Persist only the slim appData document (no players/logs arrays). */
export async function saveAppData(data) {
  const prepared = prepareAppData(data)
  const serialized = serializeAppDataDoc(prepared)
  await setDoc(appDataRef, serialized)
  return prepared
}

/** Load merged in-memory app data from appData doc + collections. */
export async function loadAppData() {
  const snapshot = await getDoc(appDataRef)
  const core = readCoreAppData(snapshot.exists() ? snapshot.data() : null)
  const [smpPlayers, logs] = await Promise.all([
    listPlayersFromFirestore(),
    listLogsFromFirestore(),
  ])

  return mergeAppDataSources(core, smpPlayers, logs)
}

export function subscribeAppDataCore(onData, onError) {
  return onSnapshot(
    appDataRef,
    (snapshot) => {
      try {
        onData(readCoreAppData(snapshot.exists() ? snapshot.data() : null))
      } catch (error) {
        onError?.(error)
      }
    },
    (error) => onError?.(error),
  )
}

/** @deprecated Use subscribeAppDataCore + collection subscriptions via AppDataContext. */
export function subscribeAppData(onData, onError) {
  return subscribeAppDataCore(async (core) => {
    try {
      const [smpPlayers, logs] = await Promise.all([
        listPlayersFromFirestore(),
        listLogsFromFirestore(),
      ])
      onData(mergeAppDataSources(core, smpPlayers, logs))
    } catch (error) {
      onError?.(error)
    }
  }, onError)
}
