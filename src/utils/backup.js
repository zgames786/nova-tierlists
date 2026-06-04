import { getManagedAdmins } from './adminStorage'
import { prepareAppData } from './appData'
import { resolvePlayerDisplay } from './tierlistHelpers'
import { DATA_VERSION, getPointSystem } from './tierlistsStorage'

export const BACKUP_FILENAME = 'novasmp-tierlists-backup.json'
export const PUBLIC_RANKINGS_FILENAME = 'novasmp-public-rankings.json'

export function buildBackupPayload(data, session = null) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    tierlists: data.tierlists ?? [],
    admins: getManagedAdmins(data),
    logs: data.logs ?? [],
    settings: data.settings ?? {},
    session: session ?? null,
  }
}

export function buildPublicRankingsPayload(data) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'public-rankings',
    tierlists: (data.tierlists ?? []).map((tierlist) => ({
      id: tierlist.id,
      name: tierlist.name,
      isCalculated: Boolean(tierlist.isCalculated),
      pointSystem: getPointSystem(tierlist),
      players: (tierlist.players ?? []).map((player, index) => {
        const display = resolvePlayerDisplay(player, tierlist)
        return {
          rank: index + 1,
          name: player.name,
          tier: display.tier,
          points: display.points,
        }
      }),
    })),
  }
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid backup file.' }
  }
  if (!Array.isArray(payload.tierlists)) {
    return { valid: false, error: 'Backup must include a tierlists array.' }
  }
  if (payload.tierlists.length === 0) {
    return { valid: false, error: 'Backup must contain at least one tierlist.' }
  }
  const hasOverall = payload.tierlists.some((t) => t.id === 'overall')
  if (!hasOverall) {
    return { valid: false, error: 'Backup must include the Overall tierlist.' }
  }
  if (payload.admins != null && !Array.isArray(payload.admins)) {
    return { valid: false, error: 'Backup admins must be an array.' }
  }
  if (payload.logs != null && !Array.isArray(payload.logs)) {
    return { valid: false, error: 'Backup logs must be an array.' }
  }
  return { valid: true }
}

export function downloadBackupJson(payload, filename = BACKUP_FILENAME) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadPublicRankingsJson(payload) {
  downloadBackupJson(payload, PUBLIC_RANKINGS_FILENAME)
}

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('Backup file is not valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read backup file.'))
    reader.readAsText(file)
  })
}

export function buildImportedAppData(payload) {
  return prepareAppData({
    version: DATA_VERSION,
    tierlists: payload.tierlists,
    logs: payload.logs ?? [],
    settings: payload.settings ?? {},
    admins: payload.admins ?? [],
  })
}
