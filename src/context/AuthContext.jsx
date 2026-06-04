import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  canManageAdminAccounts,
  enterGuest as authEnterGuest,
  getSession,
  isAdminUser,
  isGuest,
  isOwner,
  login as authLogin,
  logout as authLogout,
} from '../utils/adminAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())

  const login = useCallback((username, password, appData) => {
    const result = authLogin(username, password, appData)
    if (result.success) {
      setUser(result.user)
    }
    return result
  }, [])

  const enterGuest = useCallback(() => {
    const result = authEnterGuest()
    setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isGuest: isGuest(user),
      isAdmin: isAdminUser(user),
      isOwner: isOwner(user),
      canManageAdmins: canManageAdminAccounts(user),
      canCreateAdmins: canManageAdminAccounts(user),
      login,
      enterGuest,
      logout,
    }),
    [user, login, enterGuest, logout],
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
