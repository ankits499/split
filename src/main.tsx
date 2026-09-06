import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './features/theme'
import { AuthProvider } from './features/auth/AuthProvider'
import { router } from './router'

// The service worker precaches the whole app shell and takes over
// immediately on activate (skipWaiting/clientsClaim in sw.ts), but that
// doesn't replace what's already loaded — without this, an already-open
// standalone PWA (or one reopened before the new worker finishes
// installing) can keep rendering a stale build indefinitely. Reload once
// the new worker actually takes control so updates always land.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
