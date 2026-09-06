import { Outlet } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { BottomNav } from './components/BottomNav'
import { Skeleton } from './components/ui/Skeleton'
import { SafeAreaDebug } from './components/SafeAreaDebug'

export function AppLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-9 w-9 !rounded-full" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <>
      <SafeAreaDebug />
      <Outlet />
      <BottomNav />
    </>
  )
}
