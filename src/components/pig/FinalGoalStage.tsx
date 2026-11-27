import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui'
import { vnd } from '@/domain/format'

interface MemberStat {
  name: string
  avatar: string
  amount: number
  pct: number
  gender?: 'male' | 'female'
}

interface FinalGoalStageProps {
  journeyName: string
  goalAmount: number
  savedAmount: number
  progressPct: number
  memberMale: MemberStat
  memberFemale: MemberStat
  reducedMotion?: boolean
  onPoke?: () => void
}

const MILESTONES = [25, 50, 75, 100]

export function FinalGoalStage({
  journeyName,
  goalAmount,
  savedAmount,
  progressPct,
  memberMale,
  memberFemale,
  reducedMotion,
  onPoke,
}: FinalGoalStageProps) {
  const [jumping, setJumping] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])

  const clampedPct = Math.max(0, Math.min(100, progressPct))
  const remaining = Math.max(0, goalAmount - savedAmount)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12])

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

  const triggerCelebrate = () => {
    setJumping(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    const emojis = ['✨', '💖', '🌟', '💎', '🎯']
    const now = Date.now()
    setBursts((b) => [
      ...b.slice(-8),
      ...Array.from({ length: 6 }, (_, i) => ({
        id: now + i,
        x: 20 + i * 12 + (Math.random() * 8 - 4),
        emoji: emojis[i % emojis.length],
      })),
    ])
    setTimeout(() => setJumping(false), 650)
  }

  const quotes = [
    remaining <= 0
      ? `🎉 Chúc mừng ${memberMale.name} & ${memberFemale.name} đã chạm đích ${vnd(goalAmount)}!`
      : `🎯 Còn ${vnd(remaining)} nữa là chạm đích "${journeyName}" rồi!`,
    `💎 Quả cầu ước mơ đã tích lũy được ${clampedPct.toFixed(1)}% chặng đường dài hạn!`,
    `✨ ${memberMale.name} (${memberMale.pct.toFixed(0)}%) & ${memberFemale.name} (${memberFemale.pct.toFixed(0)}%) cùng hướng về đích!`,
  ]
  const currentQuote = quotes[quoteIdx % quotes.length]

  // SVG Ring progress geometry
  const ringSize = 216
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clampedPct / 100)

  // Water/aura level inside the crystal dream globe
  const globeWaterHeight = clampedPct <= 0 ? 0 : Math.max(12, Math.min(96, clampedPct))

  return (
    <div className="relative w-full select-none">
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={triggerCelebrate}
        role="button"
        tabIndex={0}
        aria-label={`Quả cầu mục tiêu ${journeyName} – ${clampedPct.toFixed(1)}%`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerCelebrate()}
        className="relative flex h-[319px] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden px-4"
        style={{ perspective: 900 }}
      >
        {/* Soft Cosmic Aurora Glow behind the Dream Globe */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className="h-[250px] w-[290px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(192,132,252,0.42) 0%, rgba(244,114,182,0.3) 50%, rgba(56,189,248,0.18) 80%, transparent 100%)',
            }}
          />
        </div>

        {/* Twinkling Ambient Stars */}
        {!reducedMotion &&
          [
            { left: '12%', top: '20%', d: 0 },
            { left: '84%', top: '22%', d: 0.4 },
            { left: '18%', top: '72%', d: 0.8 },
            { left: '82%', top: '70%', d: 1.2 },
          ].map((s, idx) => (
            <motion.span
              key={idx}
              aria-hidden
              className="pointer-events-none absolute text-sm"
              style={{ left: s.left, top: s.top }}
              animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: s.d }}
            >
              ✨
            </motion.span>
          ))}

        {/* Top Speech Pill */}
        <motion.div
          key={currentQuote}
          initial={{ scale: 0.92, opacity: 0, y: -4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center px-4"
        >
          <div className="relative flex max-w-[355px] items-center gap-1.5 rounded-full border border-white/95 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(124,58,237,.14)] backdrop-blur-md">
            <span className="truncate">{currentQuote}</span>
            <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
          </div>
        </motion.div>

        {/* CENTERPIECE: 3D Crystal Dream Globe + Circular Progress Ring + Orbiting Couple */}
        <div className="relative mt-6 flex items-center justify-center">
          {/* Left Orbiting Partner Card: Nam */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [-4, 5, -4] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-[74px] top-1/2 z-20 -translate-y-1/2 sm:-left-[86px]"
          >
            <div className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/90 px-2 py-1.5 text-center shadow-[0_8px_20px_rgba(14,165,233,0.22)] backdrop-blur-md">
              <Avatar value={memberMale.avatar} size={32} className="ring-2 ring-sky-400" />
              <span className="mt-1 max-w-[58px] truncate text-[10px] font-black text-sky-900">
                {memberMale.name}
              </span>
              <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[9.5px] font-black text-sky-700 tabular-nums">
                {memberMale.pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>

          {/* Right Orbiting Partner Card: Nữ */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [5, -4, 5] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-[74px] top-1/2 z-20 -translate-y-1/2 sm:-right-[86px]"
          >
            <div className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/90 px-2 py-1.5 text-center shadow-[0_8px_20px_rgba(244,63,94,0.22)] backdrop-blur-md">
              <Avatar value={memberFemale.avatar} size={32} className="ring-2 ring-pink-400" />
              <span className="mt-1 max-w-[58px] truncate text-[10px] font-black text-pink-900">
                {memberFemale.name}
              </span>
              <span className="rounded-full bg-pink-100 px-1.5 py-0.2 text-[9.5px] font-black text-pink-700 tabular-nums">
                {memberFemale.pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>

          {/* 3D Tilting Crystal Sphere + Progress Ring */}
          <motion.div
            style={{
              rotateX: reducedMotion ? 0 : rotateX,
              rotateY: reducedMotion ? 0 : rotateY,
              transformStyle: 'preserve-3d',
            }}
            animate={
              reducedMotion
                ? undefined
                : jumping
                  ? { scale: [1, 1.09, 0.96, 1], y: [0, -14, 2, 0] }
                  : { y: [0, -5, 0] }
            }
            transition={
              jumping
                ? { duration: 0.55, ease: 'easeOut' }
                : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative flex items-center justify-center"
          >
            {/* Outer Gradient Progress Ring */}
            <svg width={ringSize} height={ringSize} className="-rotate-90 drop-shadow-[0_6px_18px_rgba(124,58,237,0.28)]">
              <defs>
                <linearGradient id="goal-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="url(#goal-ring-grad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>

            {/* Inner Crystal Dream Dome (No Piggy Bank!) */}
            <div
              className="absolute flex flex-col items-center justify-center overflow-hidden rounded-full border-2 border-white/95 shadow-[inset_0_4px_18px_rgba(255,255,255,0.9),0_12px_28px_rgba(124,58,237,0.2)]"
              style={{
                width: ringSize - 28,
                height: ringSize - 28,
                background:
                  'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.96) 0%, rgba(245,243,255,0.88) 58%, rgba(252,231,243,0.92) 100%)',
              }}
            >
              {/* Rising Aurora Wave inside the Crystal Dome */}
              {globeWaterHeight > 0 && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
                  initial={{ height: '0%' }}
                  animate={{ height: `${globeWaterHeight}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-0 h-[18px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(167, 139, 250, 0.55)"
                    />
                  </motion.svg>
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-[3px] h-[17px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(244, 114, 182, 0.58)"
                    />
                  </motion.svg>
                  <div
                    className="absolute inset-x-0 bottom-0 top-[10px]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(167,139,250,0.45) 0%, rgba(236,72,153,0.42) 100%)',
                    }}
                  />
                </motion.div>
              )}

              {/* Foreground Dream Goal Emblem & Percentage */}
              <div className="relative z-10 flex flex-col items-center px-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-violet-500 to-pink-500 text-2xl shadow-md">
                  {clampedPct >= 100 ? '🏆' : clampedPct >= 50 ? '🏰' : '💎'}
                </div>
                <p className="mt-1.5 text-[28px] font-black leading-none tracking-tight text-[#1e1b4b] tabular-nums drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                  {clampedPct.toFixed(1)}%
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-purple-700 shadow-sm">
                  <Target size={10} /> Mục tiêu cuối kỳ
                </span>
              </div>

              {/* Glass Specular Reflection */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.18) 100%)',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* 4 Milestone Progress Pills below the Globe */}
        <div className="relative z-20 mt-3 flex items-center gap-1.5">
          {MILESTONES.map((m) => {
            const reached = clampedPct >= m
            return (
              <div
                key={m}
                className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-black transition-all ${
                  reached
                    ? 'border-amber-300 bg-amber-100 text-amber-800 shadow-sm'
                    : 'border-white/90 bg-white/75 text-slate-400'
                }`}
              >
                <Sparkles size={10} className={reached ? 'text-amber-500' : 'text-slate-300'} />
                <span>{m}%</span>
              </div>
            )
          })}
        </div>

        {/* Tap Pop Particles */}
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
      </div>
    </div>
  )
}
