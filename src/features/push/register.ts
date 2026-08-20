import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Public by design — pairs with the private key held only by the
// notify-group Edge Function. Safe to ship in client code.
const VAPID_PUBLIC_KEY = 'BDJZ7Z77MYr91xxZp9T2DZWPCQAp0gidqJ7kUU90duahhGS6nzlQ6PRBalM9Sa_z3Cqpi8_JjLCniEugJ5nVAx4'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function usePushSubscription(userId: string) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isPushSupported() ? Notification.permission : 'unsupported'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) {
      setChecking(false)
      return
    }
    setPermission(Notification.permission)
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .finally(() => setChecking(false))
  }, [])

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !userId) return
    setBusy(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
      }
      const json = subscription.toJSON()
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: 'endpoint' }
      )
      if (dbError) throw dbError
      setPermission(Notification.permission)
      setSubscribed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable notifications')
    } finally {
      setBusy(false)
    }
  }, [userId])

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return
    setBusy(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable notifications')
    } finally {
      setBusy(false)
    }
  }, [])

  return { permission, subscribed, checking, busy, error, subscribe, unsubscribe }
}
