import { useEffect, useState } from 'react'

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent) }
    const i = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', h); window.addEventListener('appinstalled', i)
    return () => { window.removeEventListener('beforeinstallprompt', h); window.removeEventListener('appinstalled', i) }
  }, [])
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  return { canPrompt: !!evt, installed, isIOS, prompt: async () => { if (evt) { await evt.prompt(); setEvt(null) } } }
}

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

export function usePushPermission() {
  const supported = typeof Notification !== 'undefined'
  const [perm, setPerm] = useState<PushState>(supported ? (Notification.permission as PushState) : 'unsupported')
  const request = async () => {
    if (!supported) return 'unsupported' as PushState
    const r = (await Notification.requestPermission()) as PushState
    setPerm(r)
    return r
  }
  return { perm, request }
}
