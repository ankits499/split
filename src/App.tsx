import { Outlet } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { BottomNav } from './components/BottomNav'

export function AppLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-[var(--color-ink-muted)]">Loading…</div>
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}
