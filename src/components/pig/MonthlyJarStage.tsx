import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui'

interface MemberStat {
  name: string
  avatar: string
  amount: number
  pct: number
  gender?: 'male' | 'female'
}

interface MonthlyJarStageProps {
  monthLabel: string
  fillPct: number
  savedAmount: number
  memberMale: MemberStat
  memberFemale: MemberStat
  reducedMotion?: boolean
  coinBurstKey?: number
  onPoke?: () => void
}

interface DropParticle {
  id: number
  startX: number
  startY: number
  midX: number
  delay: number
  size: number
}

function GrassyHillsSVG() {
  return (
    <svg
      viewBox="0 0 440 120"
      preserveAspectRatio="none"
      className="pointer-events-none block h-[95px] w-full select-none"
      style={{
        maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, rgba(0,0,0,0.4) 82%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, rgba(0,0,0,0.4) 82%, transparent 100%)',
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="jar-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BBF7D0" stopOpacity="0.85" />
          <stop offset="65%" stopColor="#4ADE80" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ECFCCB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jar-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D9F99D" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#86EFAC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F0FDF4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M-20 68 Q 110 16 240 48 T 460 38 L 460 120 L -20 120 Z" fill="url(#jar-hill-back)" />
      <path d="M-20 48 Q 220 8 460 50 L 460 120 L -20 120 Z" fill="url(#jar-hill-front)" />
    </svg>
  )
}

export function MonthlyJarStage({
  monthLabel,
  fillPct,
  memberMale,
  memberFemale,
  reducedMotion,
  coinBurstKey,
  onPoke,
}: MonthlyJarStageProps) {
  const [jumping, setJumping] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])
  const [drops, setDrops] = useState<DropParticle[]>([])
  const lastBurstRef = useRef<number | undefined>(coinBurstKey)

  const clampedFill = Math.max(0, Math.min(100, fillPct))

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10])

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

  const launchSplash = (count = 8) => {
    const now = Date.now()
    const batch: DropParticle[] = Array.from({ length: count }, (_, i) => {
      const spread = (i - (count - 1) / 2) * 20
      return {
        id: now + i,
        startX: spread,
        startY: -28 - (i % 3) * 12,
        midX: spread * 0.3,
        delay: i * 0.045,
        size: 11 + (i % 3) * 2.5,
      }
    })
    setDrops(batch)
    setJumping(true)
    setTimeout(() => setJumping(false), 620)
    setTimeout(() => {
      setDrops((curr) => curr.filter((c) => !batch.some((b) => b.id === c.id)))
    }, 1250)
  }

  useEffect(() => {
    if (typeof coinBurstKey === 'number' && coinBurstKey > 0 && coinBurstKey !== lastBurstRef.current) {
      lastBurstRef.current = coinBurstKey
      launchSplash(10)
    }
  }, [coinBurstKey])

  const triggerPoke = () => {
    setJumping(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    launchSplash(3)
    const emojis = ['💧', '✨', '🪙', '💙']
    const now = Date.now()
    setBursts((b) => [
      ...b.slice(-8),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: now + i,
        x: 24 + i * 13 + (Math.random() * 8 - 4),
        emoji: emojis[i % emojis.length],
      })),
    ])
    setTimeout(() => setJumping(false), 620)
  }

  const quotes = [
    clampedFill <= 0
      ? `🫙 Lọ tiết kiệm ${monthLabel} đang trống nè! Nạp khoản đầu tiên nha 💧`
      : `🌊 Lọ ${monthLabel} đã đầy ${clampedFill.toFixed(0)}% rồi! Chạm vào lọ để khuấy sóng nha ✨`,
    `💙 ${memberMale.name} (${memberMale.pct.toFixed(0)}%) & 💗 ${memberFemale.name} (${memberFemale.pct.toFixed(0)}%) cùng góp đầy lọ tháng này!`,
    `🪙 Mỗi ngày bỏ lọ một ít là cuối tháng rủng rỉnh ngay!`,
  ]
  const currentQuote = quotes[quoteIdx % quotes.length]

  const waterHeightPct = clampedFill <= 0 ? 0 : Math.max(8, Math.min(96, clampedFill))

  return (
    <div className="relative w-full select-none">
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={triggerPoke}
        role="button"
        tabIndex={0}
        aria-label={`Lọ tiết kiệm ${monthLabel} – ${clampedFill.toFixed(0)}%`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerPoke()}
        className="relative flex h-[319px] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden px-4"
        style={{ perspective: 900 }}
      >
        {/* Ambient Sky Halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className="h-[240px] w-[280px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(56,189,248,0.32) 52%, rgba(52,211,153,0.18) 85%, transparent 100%)',
            }}
          />
        </div>

        {/* Soft Meadow Hills at the bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <GrassyHillsSVG />
        </div>

        {/* Top Speech Pill */}
        <motion.div
          key={currentQuote}
          initial={{ scale: 0.92, opacity: 0, y: -4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center px-4"
        >
          <div className="relative flex max-w-[355px] items-center gap-1.5 rounded-full border border-white/95 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(14,165,233,.14)] backdrop-blur-md">
            <span className="truncate">{currentQuote}</span>
            <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
          </div>
        </motion.div>

        {/* Water Droplets splashing into the Jar on 2/2 Confirm */}
        <AnimatePresence>
          {drops.map((drop) => (
            <motion.div
              key={drop.id}
              initial={{ x: drop.startX, y: drop.startY, scale: 0.3, opacity: 0 }}
              animate={{
                x: [drop.startX, drop.midX, 0],
                y: [drop.startY, 16, 110],
                scale: [0.4, 1.15, 0.3],
                opacity: [0, 0.95, 0.95, 0],
              }}
              exit={{ opacity: 0, scale: 0.1 }}
              transition={{ duration: 0.68, delay: drop.delay, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: drop.size,
                height: drop.size * 1.25,
                background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #38bdf8 50%, #0284c7 100%)',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                boxShadow: '0 0 10px rgba(56,189,248,0.85)',
              }}
              className="pointer-events-none absolute left-1/2 top-10 z-40 -ml-1.5"
            />
          ))}
        </AnimatePresence>

        {/* CENTERPIECE: Crisp 3D Vector Crystal Savings Jar + Side Member Badges */}
        <div className="relative z-10 mt-6 flex items-center justify-center">
          {/* Left Floating Partner Pill: Nam */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [-3, 4, -3] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-[86px] top-1/2 z-20 -translate-y-1/2 sm:-left-[98px]"
          >
            <div className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/92 px-2.5 py-1.5 text-center shadow-[0_8px_20px_rgba(14,165,233,0.18)] backdrop-blur-md">
              <Avatar value={memberMale.avatar} size={30} className="ring-2 ring-sky-400" />
              <span className="mt-1 max-w-[60px] truncate text-[10px] font-black text-sky-900">
                {memberMale.name}
              </span>
              <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[9.5px] font-black text-sky-700 tabular-nums">
                {memberMale.pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>

          {/* Right Floating Partner Pill: Nữ */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [4, -3, 4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-[86px] top-1/2 z-20 -translate-y-1/2 sm:-right-[98px]"
          >
            <div className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/92 px-2.5 py-1.5 text-center shadow-[0_8px_20px_rgba(244,63,94,0.18)] backdrop-blur-md">
              <Avatar value={memberFemale.avatar} size={30} className="ring-2 ring-pink-400" />
              <span className="mt-1 max-w-[60px] truncate text-[10px] font-black text-pink-900">
                {memberFemale.name}
              </span>
              <span className="rounded-full bg-pink-100 px-1.5 py-0.2 text-[9.5px] font-black text-pink-700 tabular-nums">
                {memberFemale.pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>

          {/* 3D Tilting Crystal Jar */}
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
                  ? { y: [0, -18, 2, 0], scale: [1, 1.05, 0.96, 1], rotateZ: [0, -2, 2, 0] }
                  : { y: [0, -4, 0] }
            }
            transition={
              jumping
                ? { duration: 0.55, ease: 'easeOut' }
                : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative flex flex-col items-center"
          >
            {/* Jar Lid (Cute Rose-Gold & Sky Rim with Coin Slot) */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="h-3 w-20 rounded-t-xl border-2 border-white bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-sm">
                <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-amber-800/45" />
              </div>
              <div className="h-2.5 w-[112px] rounded-full border-2 border-white bg-gradient-to-b from-white to-sky-100 shadow-sm" />
            </div>

            {/* Jar Glass Body (100% Razor-Sharp Vector Glassmorphism) */}
            <div
              className="relative -mt-0.5 h-[188px] w-[158px] overflow-hidden rounded-[36px] border-[3px] border-white/95 shadow-[0_14px_34px_rgba(14,165,233,0.24),inset_0_4px_16px_rgba(255,255,255,0.9)]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(224,242,254,0.38) 55%, rgba(255,255,255,0.58) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Etched Glass Measurement Lines (25%, 50%, 75%) */}
              {[25, 50, 75].map((tick) => (
                <div
                  key={tick}
                  className="pointer-events-none absolute right-2.5 z-20 flex items-center gap-1"
                  style={{ bottom: `${tick}%` }}
                >
                  <span className="h-[1.5px] w-2.5 rounded-full bg-slate-400/45" />
                </div>
              ))}

              {/* Rippling Ocean-Sky Water inside the Jar */}
              {waterHeightPct > 0 && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 overflow-hidden"
                  initial={{ height: '0%' }}
                  animate={{ height: `${waterHeightPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  {/* Back Deep Wave */}
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-0 h-[18px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(2, 132, 199, 0.84)"
                    />
                  </motion.svg>

                  {/* Front Aqua Counter-Wave */}
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-[2px] h-[17px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                    transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(56, 189, 248, 0.94)"
                    />
                  </motion.svg>

                  {/* Surface White Foam Crest */}
                  <motion.svg
                    viewBox="0 0 800 24"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-[1px] h-[10px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 12 Q 50 2 100 12 T 200 12 T 300 12 T 400 12 T 500 12 T 600 12 T 700 12 T 800 12 L 800 16 L 0 16 Z"
                      fill="rgba(224, 242, 254, 0.85)"
                    />
                  </motion.svg>

                  {/* Gradient Water Body */}
                  <div
                    className="absolute inset-x-0 bottom-0 top-[9px]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(56,189,248,0.92) 0%, rgba(14,165,233,0.94) 55%, rgba(2,132,199,0.98) 100%)',
                    }}
                  />

                  {/* Rising Bubbles inside Water */}
                  {!reducedMotion &&
                    [20, 40, 62, 80].map((leftPct, bIdx) => (
                      <motion.span
                        key={bIdx}
                        className="pointer-events-none absolute bottom-2 rounded-full bg-white/80 shadow-[0_0_5px_#fff]"
                        style={{
                          left: `${leftPct}%`,
                          width: 4 + (bIdx % 2) * 2.5,
                          height: 4 + (bIdx % 2) * 2.5,
                        }}
                        animate={{
                          y: [0, -Math.max(24, (waterHeightPct / 100) * 160)],
                          x: [0, bIdx % 2 === 0 ? 5 : -5, 0],
                          opacity: [0, 0.9, 0],
                        }}
                        transition={{
                          duration: 1.8 + bIdx * 0.3,
                          repeat: Infinity,
                          delay: bIdx * 0.35,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                </motion.div>
              )}

              {/* Crisp Center Percentage & Month Pill inside the Jar */}
              <div className="pointer-events-none relative z-20 flex h-full flex-col items-center justify-center px-2 text-center">
                <div className="rounded-2xl border border-white/90 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                    {monthLabel}
                  </p>
                  <p className="mt-0.5 text-[24px] font-black leading-none text-[#1e1b4b] tabular-nums">
                    {clampedFill.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Left Glass Specular Highlight Streak */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-4 left-2.5 top-4 w-3 rounded-full bg-gradient-to-b from-white/75 via-white/30 to-white/10"
              />
            </div>

            {/* Jar Ground Shadow */}
            <div
              aria-hidden
              className="mt-1.5 h-3.5 w-32 rounded-[50%] bg-sky-900/20 blur-[3px]"
            />
          </motion.div>
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
