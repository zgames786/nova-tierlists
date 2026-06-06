import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export const LOGS_COLLECTION = 'logs'
export const MAX_LOGS = 500

const logsCollection = collection(db, LOGS_COLLECTION)

function logDocRef(logId) {
  return doc(db, LOGS_COLLECTION, logId)
}

function normalizeLog(raw) {
  if (!raw?.id) return null
  return {
    id: raw.id,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    adminUsername: raw.adminUsername ?? 'unknown',
    adminRole: raw.adminRole ?? 'admin',
    actionType: raw.actionType ?? '',
    targetType: raw.targetType ?? '',
    targetName: raw.targetName ?? '',
    details: raw.details ?? '',
    beforeState: raw.beforeState ?? null,
    afterState: raw.afterState ?? null,
    canUndo: Boolean(raw.canUndo),
    undone: Boolean(raw.undone),
    undoneAt: raw.undoneAt ?? null,
    undoneBy: raw.undoneBy ?? null,
  }
}

export async function appendLogToFirestore(entry) {
  const normalized = normalizeLog(entry)
  if (!normalized) return null
  await setDoc(logDocRef(normalized.id), normalized)
  return normalized
}

export async function saveLogToFirestore(entry) {
  return appendLogToFirestore(entry)
}

export async function clearLogsInFirestore() {
  const snapshot = await getDocs(logsCollection)
  const batchSize = 400

  for (let index = 0; index < snapshot.docs.length; index += batchSize) {
    const batch = writeBatch(db)
    for (const entry of snapshot.docs.slice(index, index + batchSize)) {
      batch.delete(entry.ref)
    }
    await batch.commit()
  }
}

export async function listLogsFromFirestore(limitCount = MAX_LOGS) {
  const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'), limit(limitCount))
  const snapshot = await getDocs(logsQuery)
  return snapshot.docs.map((entry) => normalizeLog(entry.data())).filter(Boolean)
}

export function subscribeLogs(onData, onError, limitCount = MAX_LOGS) {
  const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'), limit(limitCount))

  return onSnapshot(
    logsQuery,
    (snapshot) => {
      try {
        const logs = snapshot.docs.map((entry) => normalizeLog(entry.data())).filter(Boolean)
        onData(logs)
      } catch (error) {
        onError?.(error)
      }
    },
    (error) => onError?.(error),
  )
}

export async function importLogsToFirestore(logs = []) {
  const normalized = logs.map(normalizeLog).filter(Boolean)
  const batchSize = 200

  for (let index = 0; index < normalized.length; index += batchSize) {
    const batch = writeBatch(db)
    for (const entry of normalized.slice(index, index + batchSize)) {
      batch.set(logDocRef(entry.id), entry)
    }
    await batch.commit()
  }

  return normalized
}

export async function syncLogsToFirestore(logs = []) {
  const normalized = logs.map(normalizeLog).filter(Boolean)
  await Promise.all(normalized.map((entry) => setDoc(logDocRef(entry.id), entry)))
  return normalized
}
