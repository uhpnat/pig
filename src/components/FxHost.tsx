import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/hooks/useStore'

/** Global coin/confetti rain, triggered by `celebrate()` from the store. Honors reduced-motion. */
export function FxHost() {
  const { fx, motionOff } = useStore()
  const parts = useMemo(() => {
    if (!fx) return []
    return Array.from({ length: 26 }, (_, i) => ({
      i,
      e: fx.emojis[i % fx.emojis.length],
      x: Math.random() * 100,
      d: Math.random() * 0.9,
      s: 18 + Math.random() * 16,
      r: (Math.random() - 0.5) * 540,
    }))
  }, [fx])
  if (motionOff) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {fx &&
          parts.map((p) => (
            <motion.span
              key={`${fx.id}-${p.i}`}
              className="absolute"
              style={{ left: `${p.x}%`, top: -40, fontSize: p.s }}
              initial={{ y: 0, rotate: 0, opacity: 1 }}
              animate={{ y: '115vh', rotate: p.r, opacity: [1, 1, 0.8] }}
              transition={{ duration: 2.2 + p.d, delay: p.d, ease: 'easeIn' }}
            >
              {p.e}
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Compact Single-Pill "Dynamic Island" Top Notification Banner:
 * - Shows ONLY the 1 most recent notification at a time so multiple notifications NEVER stack up or block the screen!
 * - Tapping the banner or its close button dismisses it immediately.
 */
export function ToastHost() {
  const { toasts, dismissToast, setChatOpen } = useStore()
  const [updateCountdown, setUpdateCountdown] = useState<number | null>(null)

  useEffect(() => {
    const onCountdown = (e: Event) => {
      const sec = (e as CustomEvent<{ seconds: number }>).detail?.seconds
      if (typeof sec === 'number') {
        setUpdateCountdown(sec)
      }
    }
    window.addEventListener('piggy:update-countdown', onCountdown)
    return () => window.removeEventListener('piggy:update-countdown', onCountdown)
  }, [])

  const latest = toasts.length > 0 ? toasts[toasts.length - 1] : null
  const extraCount = Math.max(0, toasts.length - 1)

  const handleBannerClick = () => {
    if (latest?.actionRoute) {
      if (latest.actionRoute.includes('chat=1')) {
        setChatOpen(true)
      } else {
        window.location.hash = `#${latest.actionRoute}`
      }
    }
    dismissToast()
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[99] flex justify-center px-3"
      style={{ top: 'calc(8px + env(safe-area-inset-top, 0px))' }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {updateCountdown !== null ? (
          <motion.div
            key="app-update-countdown"
            initial={{ y: -28, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -24, scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex max-w-[385px] items-center gap-2.5 rounded-2xl border-2 border-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_30px_rgba(79,70,229,0.4)]"
          >
            <RefreshCw size={15} className="shrink-0 animate-spin" />
            <span className="flex-1 leading-snug">
              {updateCountdown > 0
                ? `✨ Có bản cập nhật mới! Tự tải lại sau ${updateCountdown}s…`
                : '🚀 Đang cập nhật phiên bản mới…'}
            </span>
            {updateCountdown > 0 && (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/25 text-xs font-black tabular-nums text-white">
                {updateCountdown}
              </span>
            )}
          </motion.div>
        ) : latest ? (
          <motion.div
            key={latest.id}
            initial={{ y: -28, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -24, scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={handleBannerClick}
            className={`pointer-events-auto flex max-w-[385px] cursor-pointer items-center gap-2 rounded-2xl border border-white/90 px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_10px_26px_rgba(30,27,75,0.28)] backdrop-blur-xl ${
              latest.tone === 'error'
                ? 'bg-rose-600/95'
                : 'bg-[#1e1b4b]/92'
            }`}
          >
            <span className="line-clamp-2 flex-1 leading-snug">{latest.text}</span>
            {extraCount > 0 && (
              <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black text-white">
                +{extraCount}
              </span>
            )}
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast()
              }}
              className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-white/90 hover:bg-white/25"
            >
              <X size={12} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
