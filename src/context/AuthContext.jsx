import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  canCreateAdmins,
  createAdminAccount,
  getSession,
  isOwner,
  login as authLogin,
  logout as authLogout,
} from '../utils/adminAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())

  const login = useCallback((username, password) => {
    const result = authLogin(username, password)
    if (result.success) {
      setUser(result.user)
    }
    return result
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  const createAdmin = useCallback(
    (username, password) => createAdminAccount(username, password, user),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isOwner: isOwner(user),
      canCreateAdmins: canCreateAdmins(user),
      login,
      logout,
      createAdmin,
    }),
    [user, login, logout, createAdmin],
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
