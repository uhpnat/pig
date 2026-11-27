import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface SplashLoaderProps {
  ready?: boolean
}

export function SplashLoader({ ready = false }: SplashLoaderProps) {
  const [pct, setPct] = useState(14)

  useEffect(() => {
    if (ready) {
      setPct(100)
      return
    }
    const timer = setInterval(() => {
      // Strictly monotonic asymptotic progress toward 92% (NEVER goes backward!)
      setPct((prev) => {
        if (prev >= 92) return prev
        const step = Math.max(1.5, (92 - prev) * 0.22)
        return Math.min(92, Number((prev + step).toFixed(1)))
      })
    }, 130)
    return () => clearInterval(timer)
  }, [ready])

  const displayPct = ready ? 100 : pct

  return (
    <motion.div
      key="splash-loader"
      initial={{ opacity: 1 }}
      animate={ready ? { opacity: 0, scale: 1.05, filter: 'blur(6px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
      transition={{ duration: 0.42, delay: ready ? 0.14 : 0, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: 'linear-gradient(180deg, #b8e1ff 0%, #e0e7ff 38%, #f3e8ff 68%, #fde8f1 100%)',
      }}
    >
      {/* Ambient Glowing Halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(167,139,250,0.35) 55%, rgba(244,114,182,0.28) 100%)',
        }}
      />

      {/* Floating Sparkles */}
      {[
        { left: '20%', top: '28%', delay: 0, emoji: '✨' },
        { left: '76%', top: '26%', delay: 0.35, emoji: '💗' },
        { left: '24%', top: '66%', delay: 0.7, emoji: '🪙' },
        { left: '75%', top: '64%', delay: 0.5, emoji: '✨' },
      ].map((item, idx) => (
        <motion.span
          key={idx}
          aria-hidden
          className="pointer-events-none absolute text-xl"
          style={{ left: item.left, top: item.top }}
          animate={{ y: [0, -12, 0], scale: [0.85, 1.2, 0.85], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
        >
          {item.emoji}
        </motion.span>
      ))}

      {/* Central Animated Crystal Emblem */}
      <div className="relative flex flex-col items-center">
        <motion.div
          animate={
            ready
              ? { scale: [1, 1.15, 0.96], rotate: [0, -5, 5, 0] }
              : { y: [0, -9, 0], scale: [1, 1.03, 1] }
          }
          transition={
            ready
              ? { duration: 0.38, ease: 'easeOut' }
              : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
          }
          className="relative grid h-28 w-28 place-items-center rounded-[36px] border-[3px] border-white bg-white/85 shadow-[0_18px_40px_rgba(124,58,237,0.22),inset_0_4px_12px_rgba(255,255,255,0.95)] backdrop-blur-md"
        >
          <span className="text-5xl drop-shadow-sm">{ready ? '🎉' : '🐷'}</span>
          <motion.span
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute -inset-2 rounded-[42px] border-2 border-dashed border-purple-300/65"
          />
        </motion.div>

        <h1 className="mt-5 text-[24px] font-black tracking-tight text-[#1e1b4b]">
          Piggy Duo <span className="text-[#ff3b6b]">💗</span>
        </h1>
        <p className="mt-1 text-xs font-extrabold text-indigo-700/85">
          {ready
            ? 'Đã sẵn sàng (100%)! Đang mở quỹ đôi mình… ✨'
            : `Đang đồng bộ dữ liệu heo đất… ${Math.round(displayPct)}%`}
        </p>

        {/* Strictly Monotonic Forward-Only Progress Bar (Never shrinks backward!) */}
        <div className="mt-3.5 h-2.5 w-56 overflow-hidden rounded-full border border-white bg-white/80 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-pink-500 transition-[width] duration-200 ease-out"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}
