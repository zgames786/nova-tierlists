import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../App.css'

const LIGHT_STREAKS = [
  { id: 1, rotate: 12, delay: '0s', bend: false },
  { id: 2, rotate: 48, delay: '1.2s', bend: true },
  { id: 3, rotate: 85, delay: '2.4s', bend: false },
  { id: 4, rotate: 125, delay: '0.6s', bend: true },
  { id: 5, rotate: 165, delay: '3s', bend: false },
  { id: 6, rotate: 205, delay: '1.8s', bend: true },
  { id: 7, rotate: 248, delay: '2.8s', bend: false },
  { id: 8, rotate: 290, delay: '0.3s', bend: true },
  { id: 9, rotate: 328, delay: '2s', bend: false },
  { id: 10, rotate: 355, delay: '3.6s', bend: true },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { enterGuest } = useAuth()

  const handleContinueAsGuest = async () => {
    await enterGuest()
    navigate('/rankings')
  }

  return (
    <div className="nova-app">
      <div className="nova-bg" aria-hidden="true" />
      <div className="stars stars-1" aria-hidden="true" />
      <div className="stars stars-2" aria-hidden="true" />
      <div className="stars stars-3" aria-hidden="true" />

      <main className="nova-content">
        <header className="hero-logo">
          <div className="singularity" aria-hidden="true">
            <div className="singularity__halo" />
            <div className="singularity__lens" />
            <div className="singularity__glow" />
            <div className="singularity__accretion" />
            <div className="singularity__accretion singularity__accretion--inner" />
            <div className="singularity__core" />
            <div className="singularity__streaks">
              {LIGHT_STREAKS.map(({ id, rotate, delay, bend }) => (
                <div
                  key={id}
                  className={`singularity__streak${bend ? ' singularity__streak--bend' : ''}`}
                  style={{
                    '--angle': `${rotate}deg`,
                    '--delay': delay,
                  }}
                />
              ))}
            </div>
          </div>

          <h1 className="hero-logo__title">
            <span className="mc-title" aria-label="NOVASMP">
              <span className="mc-title__layer mc-title__layer--4" aria-hidden="true">
                NOVASMP
              </span>
              <span className="mc-title__layer mc-title__layer--3" aria-hidden="true">
                NOVASMP
              </span>
              <span className="mc-title__layer mc-title__layer--2" aria-hidden="true">
                NOVASMP
              </span>
              <span className="mc-title__layer mc-title__layer--1" aria-hidden="true">
                NOVASMP
              </span>
              <span className="mc-title__face">NOVASMP</span>
            </span>

            <div className="tierlists-row">
              <span className="tierlists-divider" aria-hidden="true" />
              <span className="tierlists-label">Tierlists</span>
              <span className="tierlists-divider" aria-hidden="true" />
            </div>
          </h1>
        </header>

        <div className="glass-card">
          <h2>Welcome</h2>
          <p>
            Rank and explore NovaSMP tierlists. Sign in as an admin to manage lists,
            or continue as a guest to browse.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="nova-btn nova-btn-primary"
              onClick={() => navigate('/admin/login')}
            >
              Admin Login
            </button>
            <button
              type="button"
              className="nova-btn nova-btn-secondary"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
