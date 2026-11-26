import type { AppSettings } from '@/domain/types'

export function prefersReducedMotion(settings?: Pick<AppSettings, 'animations'>): boolean {
  if (settings?.animations === 'off') return true
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function haptic(settings: Pick<AppSettings, 'haptics'>, pattern: number | number[] = 40) {
  if (settings.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

let ctx: AudioContext | null = null
/** Tiny WebAudio blips – no audio assets needed. Only plays when the user enabled sound. */
export function beep(settings: Pick<AppSettings, 'sound'>, kind: 'tick' | 'win' = 'tick') {
  if (!settings.sound || typeof AudioContext === 'undefined') return
  try {
    ctx = ctx ?? new AudioContext()
    const notes = kind === 'win' ? [523, 659, 784, 1046] : [660]
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'triangle'
      o.frequency.value = f
      g.gain.setValueAtTime(0.08, ctx!.currentTime + i * 0.1)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + i * 0.1 + 0.15)
      o.connect(g).connect(ctx!.destination)
      o.start(ctx!.currentTime + i * 0.1)
      o.stop(ctx!.currentTime + i * 0.1 + 0.16)
    })
  } catch {
    /* audio is optional */
  }
}

export function applyTheme(theme: AppSettings['theme']) {
  const dark = theme === 'dark' || (theme === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/** Downscale an uploaded avatar to a small data URL so it fits in storage. */
export function fileToAvatar(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Vui lòng chọn một tệp ảnh.'))
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = size
      const g = c.getContext('2d')!
      const s = Math.min(img.width, img.height)
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh.')) }
    img.src = url
  })
}
