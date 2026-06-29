import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isGuest, authLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (authLoading) {
    return null
  }

  if (isAuthenticated && !isGuest && !submitting) {
    return <Navigate to="/rankings" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await login(username, password)
      if (result.success) {
        navigate('/rankings')
      } else {
        setError(result.error)
      }
    } finally {
      setSubmitting(false)
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

          <button type="submit" className="admin-login__submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
