import {
  OWNER_USERNAME,
  createAdminInData,
  deleteAdminFromData,
  findAccountByCredentials,
  findAdminById,
  getManagedAdmins,
  isReservedUsername,
  updateAdminInData,
} from './adminStorage'

const SESSION_KEY = 'novasmp_admin_session'

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  GUEST: 'guest',
}

export const GUEST_SESSION = {
  id: 'guest',
  username: 'Guest',
  role: ROLES.GUEST,
}

export { OWNER_USERNAME, getManagedAdmins }

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function login(username, password, appData) {
  const trimmedUser = username.trim()
  if (!trimmedUser || !password) {
    return { success: false, error: 'Invalid username or password.' }
  }

  const account = findAccountByCredentials(trimmedUser, password, appData)
  if (!account) {
    return { success: false, error: 'Invalid username or password.' }
  }

  const session = {
    id: account.id,
    username: account.username,
    role: account.role,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { success: true, user: session }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function enterGuest() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(GUEST_SESSION))
  return { success: true, user: GUEST_SESSION }
}

export function isGuest(user) {
  return user?.role === ROLES.GUEST
}

export function isAdminUser(user) {
  return user?.role === ROLES.OWNER || user?.role === ROLES.ADMIN
}

export function canManageAdminAccounts(user) {
  return user?.role === ROLES.OWNER && user?.username === OWNER_USERNAME
}

export function isOwner(user) {
  return user?.role === ROLES.OWNER
}

/** @deprecated Use canManageAdminAccounts */
export function canCreateAdmins(user) {
  return canManageAdminAccounts(user)
}

function validateCredentials(username, password) {
  const trimmedUser = username.trim()
  if (!trimmedUser || !password) {
    return { valid: false, error: 'Username and password are required.' }
  }
  if (trimmedUser.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' }
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' }
  }
  return { valid: true, trimmedUser }
}

export function createAdminAccount(username, password, currentUser, appData) {
  if (!canManageAdminAccounts(currentUser)) {
    return { success: false, error: 'Only the owner can create admin accounts.' }
  }

  const validation = validateCredentials(username, password)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  if (isReservedUsername(validation.trimmedUser, appData)) {
    return { success: false, error: 'That username is reserved or already exists.' }
  }

  const nextData = createAdminInData(
    appData,
    validation.trimmedUser,
    password,
    currentUser.username,
  )
  const admin = getManagedAdmins(nextData).find(
    (account) => account.username === validation.trimmedUser,
  )

  return { success: true, admin, data: nextData }
}

export function updateAdminAccount(id, username, password, currentUser, appData) {
  if (!canManageAdminAccounts(currentUser)) {
    return { success: false, error: 'Only the owner can edit admin accounts.' }
  }

  if (id === currentUser.id && currentUser.role === ROLES.OWNER) {
    return { success: false, error: 'The owner account cannot be edited here.' }
  }

  const existing = findAdminById(appData, id)
  if (!existing) {
    return { success: false, error: 'Admin account not found.' }
  }

  const validation = validateCredentials(username, password)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  if (isReservedUsername(validation.trimmedUser, appData, id)) {
    return { success: false, error: 'That username is reserved or already exists.' }
  }

  const result = updateAdminInData(appData, id, validation.trimmedUser, password)
  if (!result.success) {
    return result
  }

  return { success: true, admin: result.admin, data: result.data, previousUsername: existing.username }
}

export function deleteAdminAccount(id, currentUser, appData) {
  if (!canManageAdminAccounts(currentUser)) {
    return { success: false, error: 'Only the owner can delete admin accounts.' }
  }

  if (id === currentUser.id) {
    return { success: false, error: 'You cannot delete your own account while logged in.' }
  }

  return deleteAdminFromData(appData, id)
}
