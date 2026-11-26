import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useStore } from '@/hooks/useStore'

/** Global coin/confetti rain, triggered by `celebrate()` from the store. Honors reduced-motion. */
export function FxHost() {
  const { fx, motionOff } = useStore()
  const parts = useMemo(() => {
    if (!fx) return []
    return Array.from({ length: 26 }, (_, i) => ({ i, e: fx.emojis[i % fx.emojis.length], x: Math.random() * 100, d: Math.random() * 0.9, s: 18 + Math.random() * 16, r: (Math.random() - 0.5) * 540 }))
  }, [fx])
  if (motionOff) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {fx && parts.map((p) => (
          <motion.span key={`${fx.id}-${p.i}`} className="absolute" style={{ left: `${p.x}%`, top: -40, fontSize: p.s }}
            initial={{ y: 0, rotate: 0, opacity: 1 }} animate={{ y: '115vh', rotate: p.r, opacity: [1, 1, 0.8] }}
            transition={{ duration: 2.2 + p.d, delay: p.d, ease: 'easeIn' }}>{p.e}</motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ToastHost() {
  const { toasts } = useStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className={`rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-lg ${t.tone === 'error' ? 'bg-[#e5484d]' : 'bg-[#3b2a6b]'}`}>{t.text}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
