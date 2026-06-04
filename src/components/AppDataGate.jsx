import { useAppData } from '../context/AppDataContext'
import './AppDataGate.css'

export default function AppDataGate({ children }) {
  const { loading, error, refreshAppData } = useAppData()

  if (loading) {
    return (
      <div className="app-data-gate">
        <div className="app-data-gate__card">
          <div className="app-data-gate__spinner" aria-hidden="true" />
          <p>Loading NovaSMP data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-data-gate">
        <div className="app-data-gate__card app-data-gate__card--error">
          <h2>Could not load data</h2>
          <p>{error}</p>
          <button type="button" className="app-data-gate__retry" onClick={() => refreshAppData()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return children
}
