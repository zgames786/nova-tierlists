import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { normalizeSmpPlayers } from './smpPlayers'

export const PLAYERS_COLLECTION = 'players'

const playersCollection = collection(db, PLAYERS_COLLECTION)

function playerDocRef(playerId) {
  return doc(db, PLAYERS_COLLECTION, playerId)
}

export async function savePlayerToFirestore(player) {
  await setDoc(playerDocRef(player.id), player)
  return player
}

export async function deletePlayerFromFirestore(playerId) {
  await deleteDoc(playerDocRef(playerId))
}

export async function listPlayersFromFirestore() {
  const snapshot = await getDocs(playersCollection)
  return normalizeSmpPlayers(snapshot.docs.map((entry) => entry.data())).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

export function subscribePlayers(onData, onError) {
  return onSnapshot(
    playersCollection,
    (snapshot) => {
      try {
        const players = normalizeSmpPlayers(snapshot.docs.map((entry) => entry.data())).sort(
          (a, b) => a.name.localeCompare(b.name),
        )
        onData(players)
      } catch (error) {
        onError?.(error)
      }
    },
    (error) => onError?.(error),
  )
}

export async function importPlayersToFirestore(players = []) {
  const normalized = normalizeSmpPlayers(players)
  const batchSize = 400

  for (let index = 0; index < normalized.length; index += batchSize) {
    const batch = writeBatch(db)
    for (const player of normalized.slice(index, index + batchSize)) {
      batch.set(playerDocRef(player.id), player)
    }
    await batch.commit()
  }

  return normalized
}
