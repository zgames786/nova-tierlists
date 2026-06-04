import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { ACTION_TYPES, appendLog, createLogEntry } from '../utils/activityLog'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { data, saveAppData } = useAppData()
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/rankings" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const result = login(username, password, data)
    if (result.success) {
      try {
        const entry = createLogEntry({
          adminUsername: result.user.username,
          adminRole: result.user.role,
          actionType: ACTION_TYPES.ADMIN_LOGIN,
          targetType: 'session',
          targetName: result.user.username,
          details: `${result.user.username} logged in`,
        })
        await saveAppData(appendLog(data, entry))
        navigate('/rankings')
      } catch {
        setError('Logged in, but failed to save login log to Firestore.')
      }
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__bg" aria-hidden="true" />

      <div className="admin-login__card">
        <Link to="/" className="admin-login__back">
          ← Back to home
        </Link>

        <div className="admin-login__header">
          <h1>Admin Login</h1>
          <p>Sign in to manage NovaSMP tierlists</p>
        </div>

        <form className="admin-login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="admin-login__error" role="alert">
              {error}
            </div>
          )}

          <div className="admin-login__field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="admin-login__field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="admin-login__submit">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
