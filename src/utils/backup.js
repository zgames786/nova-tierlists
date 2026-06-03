import { STORAGE_KEY, DATA_VERSION, loadTierlists } from './tierlistsStorage'

export const BACKUP_FILENAME = 'novasmp-tierlists-backup.json'

export function buildBackupPayload(data, session = null) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    tierlists: data.tierlists ?? [],
    admins: data.admins ?? [],
    logs: data.logs ?? [],
    settings: data.settings ?? {},
    session: session ?? null,
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

export function downloadBackupJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = BACKUP_FILENAME
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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

export function applyImportedBackup(payload) {
  const imported = {
    version: DATA_VERSION,
    tierlists: payload.tierlists,
    admins: payload.admins ?? [],
    logs: payload.logs ?? [],
    settings: payload.settings ?? {},
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imported))
  return loadTierlists()
}
