import {
  getAdminsFromData,
  loadTierlists,
  saveTierlists,
} from './tierlistsStorage'

const SESSION_KEY = 'novasmp_admin_session'

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getAccounts() {
  const data = loadTierlists()
  return getAdminsFromData(data)
}

export function login(username, password) {
  const trimmedUser = username.trim()
  const account = getAccounts().find(
    (a) => a.username === trimmedUser && a.password === password,
  )

  if (!account) {
    return { success: false, error: 'Invalid username or password.' }
  }

  const session = { username: account.username, role: account.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { success: true, user: session }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function createAdminAccount(username, password, currentUser) {
  if (currentUser?.role !== ROLES.OWNER) {
    return { success: false, error: 'Only the owner can create admin accounts.' }
  }

  const trimmedUser = username.trim()
  if (!trimmedUser || !password) {
    return { success: false, error: 'Username and password are required.' }
  }

  if (trimmedUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }

  const data = loadTierlists()
  const accounts = getAdminsFromData(data)
  if (accounts.some((a) => a.username.toLowerCase() === trimmedUser.toLowerCase())) {
    return { success: false, error: 'That username already exists.' }
  }

  const next = saveTierlists({
    ...data,
    admins: [...accounts, { username: trimmedUser, password, role: ROLES.ADMIN }],
  })

  return { success: true, data: next }
}

export function isOwner(user) {
  return user?.role === ROLES.OWNER
}

export function canCreateAdmins(user) {
  return isOwner(user)
}
