import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, type ReactNode } from 'react'

function FluffyCloud({ className = '', scale = 1 }: { className?: string; scale?: number }) {
  return (
    <svg
      viewBox="0 0 200 100"
      className={`pointer-events-none select-none ${className}`}
      style={{ transform: `scale(${scale})` }}
      aria-hidden
    >
      <defs>
        <linearGradient id="cld-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#F0F9FF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>
      <path
        d="M45 82H160C176 82 188 70 188 55C188 42 178 31 165 29C160 13 144 2 126 2C109 2 94 12 88 26C82 22 74 20 66 20C48 20 34 34 34 51C21 53 12 63 12 75C12 79 28 82 45 82Z"
        fill="url(#cld-grad)"
      />
    </svg>
  )
}

function GrassyHillsSVG({ variant = 'green' }: { variant?: 'green' | 'pink' }) {
  return (
    <svg
      viewBox="0 0 440 130"
      preserveAspectRatio="none"
      className="pointer-events-none block h-[96px] w-full select-none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FBCFE8' : '#BBF7D0'} />
          <stop offset="100%" stopColor={variant === 'pink' ? '#F472B6' : '#4ADE80'} />
        </linearGradient>
        <linearGradient id="hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FCE7F3' : '#D9F99D'} />
          <stop offset="55%" stopColor={variant === 'pink' ? '#F9A8D4' : '#86EFAC'} />
          <stop offset="100%" stopColor={variant === 'pink' ? '#EC4899' : '#22C55E'} />
        </linearGradient>
      </defs>
      <path d="M-20 82 Q 110 24 240 58 T 460 48 L 460 130 L -20 130 Z" fill="url(#hill-back)" opacity="0.75" />
      <path d="M-20 58 Q 220 12 460 62 L 460 130 L -20 130 Z" fill="url(#hill-front)" opacity="0.9" />
      {[
        { x: 48, y: 74, s: 0.9 },
        { x: 92, y: 86, s: 0.7 },
        { x: 358, y: 72, s: 0.95 },
        { x: 396, y: 84, s: 0.75 },
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

export interface MembersShareData {
  a: { name: string; avatar: string; amount: number; pct: number; gender?: 'male' | 'female' }
  b: { name: string; avatar: string; amount: number; pct: number; gender?: 'male' | 'female' }
}

interface StageProps {
  spriteSrc: string
  alt: string
  theme?: 'meadow' | 'romantic' | 'galaxy' | 'pastel'
  spriteHeight?: number
  reducedMotion?: boolean
  badge?: ReactNode
  onPoke?: () => void
  liquidFillPct?: number
  liquidLabel?: string
  membersShare?: MembersShareData
}

export function Interactive3DStage({
  spriteSrc,
  alt,
  theme = 'meadow',
  spriteHeight = 260,
  reducedMotion,
  badge,
  onPoke,
  liquidFillPct,
  liquidLabel,
  membersShare,
}: StageProps) {
  const [jumping, setJumping] = useState(false)
  const [droppingCoin, setDroppingCoin] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [9, -9])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12])
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

  const triggerJump = () => {
    setJumping(true)
    setDroppingCoin(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    const emojis = theme === 'romantic' ? ['💗', '💕', '✨', '💖'] : ['🪙', '💧', '💗', '✨']
    const now = Date.now()
    setBursts((b) => [
      ...b.slice(-8),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: now + i,
        x: 24 + i * 13 + (Math.random() * 8 - 4),
        emoji: emojis[i % emojis.length],
      })),
    ])
    setTimeout(() => {
      setJumping(false)
      setDroppingCoin(false)
    }, 680)
  }

  const hasLiquid = typeof liquidFillPct === 'number'
  const clampedFill = hasLiquid ? Math.max(0, Math.min(100, liquidFillPct)) : 100
  // Even at 0%, show a tiny 6% shimmer at the very bottom if there's any activity, or 0% pure crystal shell if 0
  const visualFill = clampedFill <= 0 ? 0 : Math.max(10, Math.min(100, clampedFill))

  // Identify Male (Chàng / Sky Blue) vs Female (Nàng / Rose Pink)
  const isBMale = membersShare?.b?.gender === 'male' || membersShare?.a?.gender === 'female'
  const memberMale = isBMale ? membersShare?.b : membersShare?.a
  const memberFemale = isBMale ? membersShare?.a : membersShare?.b

  const nameMale = memberMale?.name ?? 'Chàng'
  const nameFemale = memberFemale?.name ?? 'Nàng'
  const pctMale = memberMale?.pct ?? 50
  const pctFemale = memberFemale?.pct ?? 50

  // Dynamic Pig Quotes reflecting who is contributing more or less and monthly progress
  const quotes = [
    clampedFill <= 0
      ? `🐷 Bụng heo tháng này đang trong suốt nè! Cùng mở số bỏ xu đầu tiên nha 🪙`
      : pctMale > pctFemale
        ? `👑 ${nameMale} đang dẫn đầu (${pctMale.toFixed(0)}%) · ${nameFemale} cố lên nè! 💕`
        : pctFemale > pctMale
          ? `👑 ${nameFemale} đang dẫn đầu (${pctFemale.toFixed(0)}%) · ${nameMale} đuổi theo nha! 💕`
          : `⚖️ Hai bạn đang cân tài cân sức (${pctMale.toFixed(0)}%) · Tuyệt vời quá! 💗`,
    `💧 Tháng này heo đã được tô màu ${clampedFill.toFixed(0)}% rồi đó! Chạm vào heo nha 🪙`,
    `✨ Nước xanh của ${nameMale} 💙 hòa cùng nước hồng của ${nameFemale} 💗`,
    `🏡 Tích tiểu thành đại, mỗi ngày một chút là sớm chạm đích thôi!`,
  ]
  const currentQuote = quotes[quoteIdx % quotes.length]

  return (
    <div className="relative w-full select-none">
      {/* Interactive 3D Stage Canvas */}
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={triggerJump}
        role="button"
        tabIndex={0}
        aria-label={`${alt} – chạm để tương tác 3D`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerJump()}
        className="relative w-full cursor-pointer select-none overflow-hidden"
        style={{ height: spriteHeight + 64, perspective: 900 }}
      >
        {/* LAYER 1: Ambient Radiant Halo & Drifting Clouds */}
        <motion.div style={{ x: bgShiftX }} className="pointer-events-none absolute inset-0">
          {/* Glowing central aura behind the crystal pig */}
          <div
            className="
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl
            "
            style={{
              width: spriteHeight * 1.05,
              height: spriteHeight * 0.9,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(56,189,248,0.28) 45%, rgba(244,63,94,0.25) 80%, transparent 100%)',
            }}
          />

          {theme !== 'galaxy' && (
            <>
              <motion.div
                className="absolute -left-3 top-6 w-32 opacity-85"
                animate={reducedMotion ? undefined : { x: [0, 16, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FluffyCloud />
              </motion.div>
              <motion.div
                className="absolute -right-5 top-10 w-36 opacity-80"
                animate={reducedMotion ? undefined : { x: [0, -18, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FluffyCloud />
              </motion.div>
            </>
          )}

          {!reducedMotion &&
            (theme === 'romantic'
              ? ['💗', '💕', '💖', '✨']
              : ['✨', '🪙', '💗', '✨']
            ).map((em, idx) => (
              <motion.span
                key={idx}
                aria-hidden
                className="absolute text-base drop-shadow"
                style={{ left: `${10 + idx * 26}%`, top: `${24 + (idx % 2) * 18}%` }}
                animate={{ y: [0, -12, 0], scale: [0.9, 1.12, 0.9], opacity: [0.5, 0.95, 0.5] }}
                transition={{ duration: 2.8 + idx * 0.5, repeat: Infinity, delay: idx * 0.4 }}
              >
                {em}
              </motion.span>
            ))}
        </motion.div>

        {/* Floating Animated Speech Bubble ("Heo Đất Nói") */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: -4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          key={currentQuote}
          className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center px-4"
        >
          <div className="relative flex max-w-[350px] items-center gap-1.5 rounded-full border border-white/90 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(30,27,75,.12)] backdrop-blur-md">
            <span className="truncate">{currentQuote}</span>
            <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
          </div>
        </motion.div>

        {/* Coin Dropping Animation into Pig's Slot */}
        <AnimatePresence>
          {droppingCoin && (
            <motion.div
              initial={{ y: 4, scale: 0.6, opacity: 0 }}
              animate={{ y: spriteHeight * 0.24, scale: 1.25, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.38, ease: 'easeIn' }}
              className="pointer-events-none absolute inset-x-0 top-8 z-30 flex justify-center text-3xl drop-shadow-[0_4px_12px_rgba(250,204,21,.7)]"
            >
              🪙
            </motion.div>
          )}
        </AnimatePresence>

        {/* LAYER 2: 3D Ground & Podium Pedestal */}
        {(theme === 'meadow' || theme === 'romantic') && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <GrassyHillsSVG variant={theme === 'romantic' ? 'pink' : 'green'} />
          </div>
        )}

        {/* Glowing 3D Pedestal Ring under the Pig */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-[50%]"
          style={{
            width: Math.min(300, spriteHeight * 0.88),
            height: 28,
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.75) 0%, rgba(56,189,248,0.35) 45%, rgba(244,63,94,0.35) 80%, transparent 100%)',
            boxShadow: '0 6px 18px rgba(30, 27, 75, 0.22)',
          }}
          animate={
            reducedMotion
              ? undefined
              : jumping
                ? { scaleX: [1, 0.72, 1.06, 1], opacity: [0.85, 0.45, 0.95, 0.85] }
                : { scaleX: [1, 0.95, 1], opacity: [0.85, 0.7, 0.85] }
          }
          transition={{ duration: jumping ? 0.6 : 2.6, repeat: jumping ? 0 : Infinity, ease: 'easeInOut' }}
        />

        {/* LAYER 4: 3D Cutout Pig Mascot with Crystal Shell + Monthly % Rising Liquid */}
        <div className="absolute inset-x-0 bottom-3.5 flex justify-center">
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
                  ? {
                      y: [0, -30, 3, 0],
                      scaleX: [1, 0.92, 1.08, 1],
                      scaleY: [1, 1.08, 0.92, 1],
                      rotateZ: [0, -4, 4, 0],
                    }
                  : {
                      y: [0, -6, 0],
                      scaleX: [1, 1.015, 1],
                      scaleY: [1, 0.985, 1],
                    }
            }
            transition={
              jumping
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative"
          >
            {!hasLiquid ? (
              <img
                src={spriteSrc}
                alt={alt}
                style={{
                  height: spriteHeight,
                  width: spriteHeight,
                  filter: 'drop-shadow(0 14px 24px rgba(30, 27, 75, 0.26))',
                }}
                className="block select-none object-contain"
                draggable={false}
              />
            ) : (
              <div
                className="relative select-none"
                style={{
                  height: spriteHeight,
                  width: spriteHeight,
                  maxWidth: '92vw',
                  filter:
                    'drop-shadow(0 0 22px rgba(56, 189, 248, 0.38)) drop-shadow(0 0 22px rgba(244, 63, 94, 0.38)) drop-shadow(0 12px 20px rgba(30, 27, 75, 0.22))',
                }}
              >
                {/* 4A. Translucent Frosted Crystal Glass Piggy Shell (Unfilled top stays clear crystal) */}
                <img
                  src={spriteSrc}
                  alt={alt}
                  style={{
                    height: '100%',
                    width: '100%',
                    opacity: 0.34,
                    filter: 'saturate(0.1) brightness(1.26) contrast(1.15)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />

                {/* 4B. Vibrant Full-Color 3D Pig Revealed from Bottom to Top by the Monthly % Water Level */}
                <motion.div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
                  animate={{ clipPath: `inset(${100 - visualFill}% 0% 0% 0%)` }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                >
                  <img
                    src={spriteSrc}
                    alt=""
                    style={{
                      height: '100%',
                      width: '100%',
                      filter: 'brightness(1.08) saturate(1.28) contrast(1.06)',
                    }}
                    className="block select-none object-contain"
                    draggable={false}
                  />
                </motion.div>

                {/* 4C. DUAL SLOSHING WATER WAVES (Sky Blue for Nam, Rose Pink for Nữ, rising by monthly %) */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    WebkitMaskImage: `url(${spriteSrc})`,
                    maskImage: `url(${spriteSrc})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  }}
                >
                  {/* Specular crystal glass sheen across entire body */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.22) 100%)',
                    }}
                  />

                  {/* Rising Dual-Color Liquid Column */}
                  {visualFill > 0 && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0"
                      initial={{ height: '0%' }}
                      animate={{ height: `${visualFill}%` }}
                      transition={{ duration: 1.1, ease: 'easeOut' }}
                    >
                      {/* Back Wave (Dual tone: Sky Blue for Nam, Rose Pink for Nữ) */}
                      <motion.svg
                        viewBox="0 0 400 28"
                        preserveAspectRatio="none"
                        className="absolute -top-[18px] left-0 h-[22px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                      >
                        <defs>
                          <linearGradient id="wave-grad-back" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.92" />
                            <stop offset={`${Math.max(18, Math.min(82, pctMale))}%`} stopColor="#c026d3" stopOpacity="0.88" />
                            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.92" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 14 Q 50 0 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                          fill="url(#wave-grad-back)"
                        />
                      </motion.svg>

                      {/* Front Sloshing Wave (glowing meniscus crest) */}
                      <motion.svg
                        viewBox="0 0 400 28"
                        preserveAspectRatio="none"
                        className="absolute -top-[14px] left-0 h-[18px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M0 14 Q 50 28 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                          fill="rgba(255, 255, 255, 0.86)"
                        />
                      </motion.svg>

                      {/* Vivid Glowing Dual Liquid Body (Left = Nam Sky Blue, Right = Nữ Rose Pink) */}
                      <div
                        className="relative h-full w-full overflow-hidden"
                        style={{
                          background: `linear-gradient(90deg, rgba(2,132,199,0.68) 0%, rgba(56,189,248,0.62) ${Math.max(10, pctMale - 8)}%, rgba(244,63,94,0.62) ${Math.min(90, pctMale + 8)}%, rgba(225,29,72,0.68) 100%)`,
                          boxShadow: 'inset 0 0 22px rgba(255,255,255,0.45)',
                        }}
                      >
                        {/* Dual rising neon bubbles: Sky Blue on left, Rose Pink on right */}
                        {!reducedMotion &&
                          [16, 32, 50, 68, 84].map((leftPct, bIdx) => {
                            const isLeftA = leftPct < 50
                            return (
                              <motion.span
                                key={bIdx}
                                className={`absolute bottom-1 rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] ${
                                  isLeftA ? 'bg-sky-200' : 'bg-pink-200'
                                }`}
                                style={{
                                  left: `${leftPct}%`,
                                  width: 5 + (bIdx % 3) * 3,
                                  height: 5 + (bIdx % 3) * 3,
                                }}
                                animate={{
                                  y: [0, -spriteHeight * (visualFill / 100)],
                                  x: [0, bIdx % 2 === 0 ? 5 : -5, 0],
                                  opacity: [0, 0.95, 0],
                                }}
                                transition={{
                                  duration: 1.8 + bIdx * 0.35,
                                  repeat: Infinity,
                                  delay: bIdx * 0.4,
                                  ease: 'easeIn',
                                }}
                              />
                            )
                          })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tap Pop Particles */}
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.span
              key={b.id}
              aria-hidden
              className="pointer-events-none absolute bottom-24 text-2xl drop-shadow"
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

        {badge && <div className="absolute left-4 top-2 z-20">{badge}</div>}
      </div>

      {/* Sleek Glassmorphic Dock BELOW the stage (Never covers the pig's feet!) */}
      {hasLiquid && (
        <div className="relative z-20 -mt-2 px-4">
          <div className="mx-auto max-w-[400px] rounded-2xl border border-white/95 bg-white/92 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(30,27,75,0.12)] backdrop-blur-md">
            {membersShare ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11.5px] font-black">
                  <span className={`flex items-center gap-1 ${pctMale >= pctFemale ? 'text-sky-600' : 'text-slate-600'}`}>
                    {pctMale > pctFemale && '👑'} 👦 <span className="truncate max-w-[85px]">{nameMale}</span>: {pctMale.toFixed(0)}%
                  </span>
                  <span className="rounded-full bg-gradient-to-r from-sky-500/15 via-purple-500/15 to-pink-500/15 border border-purple-200/80 px-2.5 py-0.5 text-[10.5px] font-black text-purple-800">
                    💧 Màu heo tháng này: {clampedFill.toFixed(0)}%
                  </span>
                  <span className={`flex items-center gap-1 ${pctFemale >= pctMale ? 'text-pink-600' : 'text-slate-600'}`}>
                    {pctFemale > pctMale && '👑'} 👧 <span className="truncate max-w-[85px]">{nameFemale}</span>: {pctFemale.toFixed(0)}%
                  </span>
                </div>
                {/* Dual-Color Water Balance Bar (Blue vs Pink) */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-l-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${Math.max(8, Math.min(92, pctMale))}%` }}
                  />
                  <div
                    className="h-full rounded-r-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-700"
                    style={{ width: `${Math.max(8, Math.min(92, pctFemale))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-black text-[#1e1b4b]">
                <span>💧 Mực nước heo đất tháng này</span>
                <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-pink-700">
                  {liquidLabel ?? `${clampedFill.toFixed(0)}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
