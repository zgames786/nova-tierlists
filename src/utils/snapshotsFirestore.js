import {
  collection,
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export const SNAPSHOTS_COLLECTION = 'snapshots'

const snapshotsCollection = collection(db, SNAPSHOTS_COLLECTION)

function snapshotDocRef(snapshotId) {
  return doc(db, SNAPSHOTS_COLLECTION, snapshotId)
}

export async function importSnapshotsToFirestore(snapshots = []) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return []
  }

  const batchSize = 100

  for (let index = 0; index < snapshots.length; index += batchSize) {
    const batch = writeBatch(db)
    for (const [offset, snapshot] of snapshots.slice(index, index + batchSize).entries()) {
      const snapshotId =
        snapshot?.id ?? `legacy_snapshot_${index + offset}_${Date.now()}`
      batch.set(snapshotDocRef(snapshotId), { ...snapshot, id: snapshotId })
    }
    await batch.commit()
  }

  return snapshots
}
