import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { prepareAppData } from './appData'
import { saveAppData } from './appDataFirestore'

export const SNAPSHOTS_COLLECTION = 'snapshots'
export const MAX_SNAPSHOTS = 50

const snapshotsRef = collection(db, SNAPSHOTS_COLLECTION)

function stripSnapshotPayload(data) {
  const prepared = prepareAppData(data)
  return JSON.parse(JSON.stringify(prepared))
}

export async function createSnapshot(appData, { createdBy, trigger, label }) {
  const payload = {
    createdAt: new Date().toISOString(),
    createdBy: createdBy ?? 'unknown',
    trigger: trigger ?? 'manual',
    label: label ?? trigger ?? 'manual',
    data: stripSnapshotPayload(appData),
  }

  await addDoc(snapshotsRef, payload)
  await trimSnapshotsToLimit()
}

export async function listSnapshots(limitCount = MAX_SNAPSHOTS) {
  const q = query(snapshotsRef, orderBy('createdAt', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

async function trimSnapshotsToLimit() {
  const q = query(snapshotsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  const docs = snapshot.docs

  if (docs.length <= MAX_SNAPSHOTS) return

  const batch = writeBatch(db)
  for (const docSnap of docs.slice(MAX_SNAPSHOTS)) {
    batch.delete(docSnap.ref)
  }
  await batch.commit()
}

export async function deleteSnapshotById(snapshotId) {
  await deleteDoc(doc(db, SNAPSHOTS_COLLECTION, snapshotId))
}

export async function restoreSnapshot(snapshotRecord) {
  if (!snapshotRecord?.data) {
    throw new Error('Snapshot data is missing.')
  }
  return saveAppData(snapshotRecord.data)
}
