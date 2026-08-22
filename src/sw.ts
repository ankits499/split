/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.hostname.endsWith('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  })
)

self.skipWaiting()
clientsClaim()

interface PushPayload {
  title: string
  body: string
  url?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as PushPayload
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/split/icons/icon-192.png',
      badge: '/split/icons/icon-192.png',
      data: { url: data.url ?? '/split/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/split/'
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = clientsArr.find((c) => 'focus' in c) as WindowClient | undefined
      if (!existing) {
        await self.clients.openWindow(url)
        return
      }
      await existing.focus()
      try {
        // iOS Safari's standalone-PWA WindowClient can throw here — focus()
        // above already succeeded, so swallow the error instead of letting
        // it reject the event and leave the app in a broken state.
        await existing.navigate(url)
      } catch {
        /* iOS: navigating an already-focused client isn't supported */
      }
    })()
  )
})
