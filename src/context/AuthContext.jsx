import { onAuthStateChanged } from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '../firebase'
import {
  ADMIN_APP_WRITES_DISABLED,
  buildSessionFromFirebaseUser,
  canManageAdminAccounts,
  clearLegacySession,
  enterGuest as authEnterGuest,
  exitGuest as authExitGuest,
  getGuestSession,
  isAdminUser,
  isGuest,
  isOwner,
  login as authLogin,
  logout as authLogout,
} from '../utils/adminAuth'
import { recordLoginActivity } from '../utils/loginActivity'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    clearLegacySession()

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem('novasmp_guest_session')
        setUser(buildSessionFromFirebaseUser(firebaseUser))
      } else {
        setUser(getGuestSession())
      }
      setAuthLoading(false)
    })

    return unsubscribe
  }, [])

  const login = useCallback(async (username, password) => {
    const result = await authLogin(username, password)
    if (result.success) {
      setUser(result.user)
      try {
        await recordLoginActivity(result.user)
      } catch (logError) {
        console.error('Failed to record admin login log:', logError)
      }
    }
    return result
  }, [])

  const enterGuest = useCallback(async () => {
    const result = await authEnterGuest()
    setUser(result.user)
    return result
  }, [])

  const logout = useCallback(async () => {
    await authLogout()
    setUser(null)
  }, [])

  const exitGuest = useCallback(() => {
    authExitGuest()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      isGuest: isGuest(user),
      isAdmin: isAdminUser(user),
      isOwner: isOwner(user),
      canManageAdmins: canManageAdminAccounts(user),
      canCreateAdmins: canManageAdminAccounts(user) && !ADMIN_APP_WRITES_DISABLED,
      login,
      enterGuest,
      logout,
      exitGuest,
    }),
    [user, authLoading, login, enterGuest, logout, exitGuest],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
