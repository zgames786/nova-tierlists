import { isAdminUser, isGuest } from './adminAuth'
import { ACTION_TYPES, createLogEntry } from './activityLog'
import { appendLogToFirestore } from './logsFirestore'

let loginLogSink = null

export function setLoginLogSink(sink) {
  loginLogSink = sink
}

export function createAdminLoginLogEntry(sessionUser) {
  if (!sessionUser || isGuest(sessionUser) || !isAdminUser(sessionUser)) {
    return null
  }

  return createLogEntry({
    adminUsername: sessionUser.username,
    adminRole: sessionUser.role,
    actionType: ACTION_TYPES.ADMIN_LOGIN,
    targetType: 'session',
    targetName: sessionUser.username,
    details: `${sessionUser.username} logged in as ${sessionUser.role}`,
  })
}

export async function recordLoginActivity(sessionUser) {
  const entry = createAdminLoginLogEntry(sessionUser)
  if (!entry) {
    return null
  }

  if (loginLogSink) {
    return loginLogSink(entry)
  }

  return appendLogToFirestore(entry)
}
