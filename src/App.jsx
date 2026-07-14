import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useBudgetStore } from './store/budgetStore'
import Layout from './components/Layout'
import { LoadingScreen } from './components/ui'
import Auth from './pages/Auth'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddTransaction from './pages/AddTransaction'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const { user, initialized, init } = useAuthStore()
  const loaded = useBudgetStore((s) => s.loaded)
  const setupComplete = useBudgetStore((s) => s.setupComplete)
  const loadForUser = useBudgetStore((s) => s.loadForUser)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    loadForUser(user?.id || null)
  }, [user?.id, loadForUser])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingScreen />
      </div>
    )
  }

  if (!user) return <Auth />
  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingScreen />
      </div>
    )
  }
  if (!setupComplete) return <Setup />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
