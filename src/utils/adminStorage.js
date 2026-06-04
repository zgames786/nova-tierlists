export const OWNER_USERNAME = 'ZGames786'
export const OWNER_PASSWORD = 'NovaAdmin786'
export const OWNER_ID = 'owner_zgames786'

const OWNER_ACCOUNT = {
  id: OWNER_ID,
  username: OWNER_USERNAME,
  password: OWNER_PASSWORD,
  role: 'owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'system',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createAdminId() {
  return `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function isOwnerRecord(account) {
  return (
    account?.role === 'owner' ||
    account?.username === OWNER_USERNAME ||
    account?.id === OWNER_ID
  )
}

export function normalizeManagedAdmins(admins) {
  if (!Array.isArray(admins)) return []

  const seen = new Set()
  const normalized = []

  for (const raw of admins) {
    if (!raw?.username || isOwnerRecord(raw)) continue
    const key = raw.username.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const now = new Date().toISOString()
    normalized.push({
      id: raw.id ?? createAdminId(),
      username: raw.username,
      password: raw.password,
      role: 'admin',
      createdAt: raw.createdAt ?? now,
      createdBy: raw.createdBy ?? OWNER_USERNAME,
      updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
    })
  }

  return normalized
}

export function getManagedAdmins(appData) {
  return normalizeManagedAdmins(appData?.admins)
}

export function getOwnerAccount() {
  return { ...OWNER_ACCOUNT }
}

export function findAccountByCredentials(username, password, appData) {
  const trimmedUser = username.trim()

  if (trimmedUser === OWNER_USERNAME && password === OWNER_PASSWORD) {
    return getOwnerAccount()
  }

  return (
    getManagedAdmins(appData).find(
      (account) => account.username === trimmedUser && account.password === password,
    ) ?? null
  )
}

export function findAdminById(appData, id) {
  return getManagedAdmins(appData).find((account) => account.id === id) ?? null
}

export function isReservedUsername(username, appData, excludeId = null) {
  const trimmed = username.trim()
  if (!trimmed) return true
  if (trimmed.toLowerCase() === OWNER_USERNAME.toLowerCase()) return true

  return getManagedAdmins(appData).some(
    (account) =>
      account.id !== excludeId &&
      account.username.toLowerCase() === trimmed.toLowerCase(),
  )
}

export function createAdminInData(appData, username, password, createdBy) {
  const trimmedUser = username.trim()
  const now = new Date().toISOString()
  const admin = {
    id: createAdminId(),
    username: trimmedUser,
    password,
    role: 'admin',
    createdAt: now,
    createdBy: createdBy ?? OWNER_USERNAME,
    updatedAt: now,
  }

  return {
    ...appData,
    admins: [...getManagedAdmins(appData), admin],
  }
}

export function updateAdminInData(appData, id, username, password) {
  const accounts = getManagedAdmins(appData)
  const index = accounts.findIndex((account) => account.id === id)
  if (index === -1) {
    return { success: false, error: 'Admin account not found.' }
  }

  const trimmedUser = username.trim()
  const now = new Date().toISOString()
  const updated = {
    ...accounts[index],
    username: trimmedUser,
    password,
    role: 'admin',
    updatedAt: now,
  }

  const next = [...accounts]
  next[index] = updated

  return {
    success: true,
    admin: updated,
    data: { ...appData, admins: next },
  }
}

export function deleteAdminFromData(appData, id) {
  if (id === OWNER_ID) {
    return { success: false, error: 'The owner account cannot be deleted.' }
  }

  const accounts = getManagedAdmins(appData)
  const removed = accounts.find((account) => account.id === id)
  if (!removed) {
    return { success: false, error: 'Admin account not found.' }
  }

  return {
    success: true,
    removed,
    data: {
      ...appData,
      admins: accounts.filter((account) => account.id !== id),
    },
  }
}

export function restoreAdminInData(appData, admin) {
  if (!admin?.id || !admin?.username) {
    return { success: false, error: 'Invalid admin data.' }
  }

  if (isOwnerRecord(admin)) {
    return { success: false, error: 'The owner account cannot be restored here.' }
  }

  const accounts = getManagedAdmins(appData)
  const normalized = normalizeManagedAdmins([admin])[0]

  if (
    accounts.some(
      (account) =>
        account.id !== admin.id &&
        account.username.toLowerCase() === normalized.username.toLowerCase(),
    )
  ) {
    return { success: false, error: 'Cannot restore admin because username is already in use.' }
  }

  const existingIndex = accounts.findIndex((account) => account.id === admin.id)
  const next = [...accounts]

  if (existingIndex >= 0) {
    next[existingIndex] = normalized
  } else {
    next.push(normalized)
  }

  return {
    success: true,
    admin: normalized,
    data: { ...appData, admins: next },
  }
}

/** @deprecated Use getManagedAdmins(appData) */
export function loadAdminAccounts(appData) {
  return getManagedAdmins(appData)
}
