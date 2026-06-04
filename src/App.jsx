import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import AppDataGate from './components/AppDataGate'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/admin/login"
              element={
                <AppDataGate>
                  <AdminLogin />
                </AppDataGate>
              }
            />
            <Route
              path="/rankings"
              element={
                <AppDataGate>
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                </AppDataGate>
              }
            />
            <Route path="/admin/dashboard" element={<Navigate to="/rankings" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </AuthProvider>
  )
}
