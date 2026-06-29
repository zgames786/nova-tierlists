import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import {
  OWNER_USERNAME,
  createAdminInData,
  deleteAdminFromData,
  findAdminById,
  getManagedAdmins,
  isReservedUsername,
  updateAdminInData,
} from './adminStorage'

const LEGACY_SESSION_KEY = 'novasmp_admin_session'
export const GUEST_SESSION_KEY = 'novasmp_guest_session'

export const AUTH_EMAIL_DOMAIN = '@novasmp.local'
export const OWNER_EMAIL = `zgames786${AUTH_EMAIL_DOMAIN}`

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

/** In-app admin account CRUD is disabled while admins are managed in Firebase Auth. */
export const ADMIN_APP_WRITES_DISABLED = true

export { OWNER_USERNAME, getManagedAdmins }

function formatAdminUsername(email) {
  return email?.split('@')[0] ?? 'admin'
}

export function buildSessionFromFirebaseUser(firebaseUser) {
  const email = firebaseUser.email ?? ''
  const normalizedEmail = email.toLowerCase()

  if (normalizedEmail === OWNER_EMAIL.toLowerCase()) {
    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      username: OWNER_USERNAME,
      role: ROLES.OWNER,
      email,
    }
  }

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    username: formatAdminUsername(email),
    role: ROLES.ADMIN,
    email,
  }
}

export function getGuestSession() {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.role === ROLES.GUEST ? parsed : null
  } catch {
    return null
  }
}

export function clearLegacySession() {
  localStorage.removeItem(LEGACY_SESSION_KEY)
}

/** Convert admin username to Firebase Auth email (e.g. ZGames786 → zgames786@novasmp.local). */
export function usernameToFirebaseEmail(username) {
  const local = username.trim().toLowerCase()
  if (!local) return ''
  return `${local}${AUTH_EMAIL_DOMAIN}`
}

export async function login(username, password) {
  const firebaseEmail = usernameToFirebaseEmail(username)
  if (!firebaseEmail || !password) {
    return { success: false, error: 'Invalid username or password.' }
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, firebaseEmail, password)
    clearLegacySession()
    localStorage.removeItem(GUEST_SESSION_KEY)
    const session = buildSessionFromFirebaseUser(credential.user)
    return { success: true, user: session }
  } catch {
    return { success: false, error: 'Invalid username or password.' }
  }
}

export async function logout() {
  localStorage.removeItem(GUEST_SESSION_KEY)
  clearLegacySession()
  await signOut(auth)
}

export async function enterGuest() {
  await signOut(auth).catch(() => {})
  clearLegacySession()
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(GUEST_SESSION))
  return { success: true, user: GUEST_SESSION }
}

export function exitGuest() {
  localStorage.removeItem(GUEST_SESSION_KEY)
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

export function isGuestOnlySession(user) {
  return isGuest(user) && !auth.currentUser
}

export function canWriteFirestore(user) {
  if (auth.currentUser) {
    return true
  }
  return !isGuest(user)
}

/** @deprecated Use canManageAdminAccounts */
export function canCreateAdmins(user) {
  return canManageAdminAccounts(user) && !ADMIN_APP_WRITES_DISABLED
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
  if (ADMIN_APP_WRITES_DISABLED) {
    return {
      success: false,
      error: 'Admin creation is managed in Firebase Auth for now.',
    }
  }

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
  if (ADMIN_APP_WRITES_DISABLED) {
    return {
      success: false,
      error: 'Admin accounts are managed in Firebase Auth for now.',
    }
  }

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

export function clearOldLocalAdmins(currentUser, appData) {
  if (!canManageAdminAccounts(currentUser)) {
    return { success: false, error: 'Only the owner can clear the legacy admin list.' }
  }

  const legacyAdmins = getManagedAdmins(appData)
  if (legacyAdmins.length === 0) {
    return { success: false, error: 'No legacy admin records to clear.' }
  }

  return {
    success: true,
    clearedCount: legacyAdmins.length,
    data: { ...appData, admins: [] },
  }
}

export function deleteAdminAccount(id, currentUser, appData) {
  if (ADMIN_APP_WRITES_DISABLED) {
    return {
      success: false,
      error: 'Admin accounts are managed in Firebase Auth for now.',
    }
  }

  if (!canManageAdminAccounts(currentUser)) {
    return { success: false, error: 'Only the owner can delete admin accounts.' }
  }

  if (id === currentUser.id) {
    return { success: false, error: 'You cannot delete your own account while logged in.' }
  }

  return deleteAdminFromData(appData, id)
}
