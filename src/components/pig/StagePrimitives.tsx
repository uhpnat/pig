import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState } from 'react'

export interface MemberStageStat {
  name: string
  avatar: string
  amount: number
  pct: number
  gender?: 'male' | 'female'
}

export function useStageTilt(reducedMotion?: boolean) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [9, -9])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-11, 11])
  const bgShiftX = useTransform(sx, [-0.5, 0.5], [10, -10])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handlePointerLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return { rotateX, rotateY, bgShiftX, handlePointerMove, handlePointerLeave }
}

export function useBurstParticles(emojis: string[]) {
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])

  const spawnBursts = (count = 5) => {
    const now = Date.now()
    setBursts((b) => [
      ...b.slice(-8),
      ...Array.from({ length: count }, (_, i) => ({
        id: now + i,
        x: 22 + i * 12 + (Math.random() * 8 - 4),
        emoji: emojis[i % emojis.length],
      })),
    ])
  }

  return { bursts, spawnBursts }
}

export function StageSpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ scale: 0.92, opacity: 0, y: -4 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center px-4"
    >
      <div className="relative flex max-w-[355px] items-center gap-1.5 rounded-full border border-white/95 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(30,27,75,.12)] backdrop-blur-md">
        <span className="truncate">{text}</span>
        <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
      </div>
    </motion.div>
  )
}

export function StageParticles({ bursts }: { bursts: { id: number; x: number; emoji: string }[] }) {
  return (
    <AnimatePresence>
      {bursts.map((b) => (
        <motion.span
          key={b.id}
          aria-hidden
          className="pointer-events-none absolute bottom-24 z-30 text-2xl drop-shadow"
          style={{ left: `${b.x}%` }}
          initial={{ y: 0, scale: 0.5, opacity: 1 }}
          animate={{ y: -95, scale: 1.25, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        >
          {b.emoji}
        </motion.span>
      ))}
    </AnimatePresence>
  )
}

export function GrassyHillsSVG({ variant = 'green', heightClass = 'h-[115px]' }: { variant?: 'green' | 'pink'; heightClass?: string }) {
  return (
    <svg
      viewBox="0 0 440 140"
      preserveAspectRatio="none"
      className={`pointer-events-none block ${heightClass} w-full select-none`}
      style={{
        maskImage: 'linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`hill-back-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FBCFE8' : '#BBF7D0'} stopOpacity="0.85" />
          <stop offset="65%" stopColor={variant === 'pink' ? '#F472B6' : '#4ADE80'} stopOpacity="0.55" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FCE7F3' : '#ECFCCB'} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`hill-front-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FCE7F3' : '#D9F99D'} stopOpacity="0.95" />
          <stop offset="48%" stopColor={variant === 'pink' ? '#F9A8D4' : '#86EFAC'} stopOpacity="0.82" />
          <stop offset="85%" stopColor={variant === 'pink' ? '#FDF2F8' : '#DCFCE7'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FFF5F9' : '#F0FDF4'} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`island-podium-${variant}`} cx="50%" cy="45%" r="48%">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FBCFE8' : '#BEF264'} stopOpacity="0.95" />
          <stop offset="68%" stopColor={variant === 'pink' ? '#F472B6' : '#4ADE80'} stopOpacity="0.75" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FCE7F3' : '#BBF7D0'} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M-20 78 Q 110 20 240 54 T 460 44 L 460 140 L -20 140 Z" fill={`url(#hill-back-${variant})`} />
      <path d="M-20 56 Q 220 8 460 58 L 460 140 L -20 140 Z" fill={`url(#hill-front-${variant})`} />
      <ellipse cx="220" cy="86" rx="175" ry="38" fill={`url(#island-podium-${variant})`} />
      {[
        { x: 56, y: 70, s: 0.9 },
        { x: 96, y: 84, s: 0.7 },
        { x: 352, y: 68, s: 0.95 },
        { x: 390, y: 82, s: 0.75 },
      ].map((f, idx) => (
        <g key={idx} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
          <circle cx="0" cy="-7" r="5" fill="#FFFFFF" />
          <circle cx="7" cy="-2" r="5" fill="#FFFFFF" />
          <circle cx="4" cy="6" r="5" fill="#FFFFFF" />
          <circle cx="-4" cy="6" r="5" fill="#FFFFFF" />
          <circle cx="-7" cy="-2" r="5" fill="#FFFFFF" />
          <circle cx="0" cy="0" r="4.5" fill="#FACC15" />
        </g>
      ))}
    </svg>
  )
}
