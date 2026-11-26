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
  // Always keep at least 12% water pool at the bottom so the dual-color rippling waves are always visible and lively!
  const visualFill = clampedFill <= 0 ? 12 : Math.max(16, Math.min(96, clampedFill))

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
          {/* Glowing central aura behind the crystal pig (Centered via flexbox so it never shifts) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full blur-2xl"
              style={{
                width: spriteHeight * 1.05,
                height: spriteHeight * 0.9,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(56,189,248,0.28) 45%, rgba(244,63,94,0.25) 80%, transparent 100%)',
              }}
            />
          </div>

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

        {/* Glowing 3D Pedestal Shadow under the Pig (Centered via flexbox wrapper so Framer Motion scaleX never shifts it!) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center"
        >
          <motion.div
            className="rounded-[50%]"
            style={{
              width: Math.min(320, spriteHeight * 0.78),
              height: 26,
              background:
                'radial-gradient(ellipse at center, rgba(30,27,75,0.34) 0%, rgba(56,189,248,0.26) 48%, rgba(244,63,94,0.22) 78%, transparent 100%)',
              filter: 'blur(2px)',
            }}
            animate={
              reducedMotion
                ? undefined
                : jumping
                  ? { scaleX: [1, 0.7, 1.08, 1], opacity: [0.9, 0.45, 1, 0.9] }
                  : { scaleX: [1, 0.94, 1], opacity: [0.88, 0.72, 0.88] }
            }
            transition={{ duration: jumping ? 0.6 : 2.6, repeat: jumping ? 0 : Infinity, ease: 'easeInOut' }}
          />
        </div>

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
                    opacity: 0.38,
                    filter: 'saturate(0.12) brightness(1.25) contrast(1.15)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />

                {/* 4B. RIPPLING DUAL-COLOR WATER WAVES (Nam Sky Blue + Nữ Rose Pink rippling & intertwining) */}
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
                  {/* Rising Liquid Container */}
                  <motion.div
                    className="absolute inset-x-0 bottom-0"
                    initial={{ height: '12%' }}
                    animate={{ height: `${visualFill}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                  >
                    {/* 1. FIXED-HEIGHT SURFACE RIPPLE WAVE 1 (Back wave rolling Left -> Right, 4 distinct crests!) */}
                    <motion.svg
                      viewBox="0 0 800 36"
                      preserveAspectRatio="none"
                      className="absolute -top-[24px] left-0 h-[28px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <defs>
                        <linearGradient id="ripple-wave-back" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.92" />
                          <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.92" />
                          <stop offset="75%" stopColor="#0284c7" stopOpacity="0.92" />
                          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.9" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 18 Q 50 0 100 18 T 200 18 T 300 18 T 400 18 T 500 18 T 600 18 T 700 18 T 800 18 L 800 36 L 0 36 Z"
                        fill="url(#ripple-wave-back)"
                      />
                    </motion.svg>

                    {/* 2. FIXED-HEIGHT SURFACE RIPPLE WAVE 2 (Front wave rolling Right -> Left, crossing ripples!) */}
                    <motion.svg
                      viewBox="0 0 800 36"
                      preserveAspectRatio="none"
                      className="absolute -top-[20px] left-0 h-[24px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                      transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                    >
                      <defs>
                        <linearGradient id="ripple-wave-front" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                          <stop offset={`${Math.max(18, Math.min(82, pctMale))}%`} stopColor="#a855f7" stopOpacity="0.88" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.95" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 18 Q 50 36 100 18 T 200 18 T 300 18 T 400 18 T 500 18 T 600 18 T 700 18 T 800 18 L 800 36 L 0 36 Z"
                        fill="url(#ripple-wave-front)"
                      />
                    </motion.svg>

                    {/* 3. FIXED-HEIGHT GLOSSY FOAM CREST RIPPLE (Sparkling white/cyan/pink surface meniscus) */}
                    <motion.svg
                      viewBox="0 0 800 28"
                      preserveAspectRatio="none"
                      className="absolute -top-[14px] left-0 h-[18px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    >
                      <path
                        d="M 0 14 Q 50 2 100 14 T 200 14 T 300 14 T 400 14 T 500 14 T 600 14 T 700 14 T 800 14 L 800 22 L 0 22 Z"
                        fill="rgba(255, 255, 255, 0.78)"
                      />
                    </motion.svg>

                    {/* 4. DUAL-COLOR LIQUID BODY with Internal Rippling Wave Currents (Left = Nam Sky Blue, Right = Nữ Rose Pink) */}
                    <div
                      className="relative h-full w-full overflow-hidden"
                      style={{
                        background: `linear-gradient(90deg, rgba(2,132,199,0.88) 0%, rgba(56,189,248,0.84) ${Math.max(10, pctMale - 12)}%, rgba(192,38,211,0.78) ${pctMale}%, rgba(244,63,94,0.84) ${Math.min(90, pctMale + 12)}%, rgba(225,29,72,0.88) 100%)`,
                        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.45)',
                      }}
                    >
                      {/* Internal Rippling Wave Ribbon A (Fixed 26px height so it never squashes!) */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[22%] h-[26px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'], y: [0, -4, 0] }}
                        transition={{
                          x: { duration: 2.4, repeat: Infinity, ease: 'linear' },
                          y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                        }}
                      >
                        <defs>
                          <linearGradient id="inner-ripple-a" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.65" />
                            <stop offset="35%" stopColor="#f472b6" stopOpacity="0.65" />
                            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.65" />
                            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.65" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 Q 750 32 700 24 T 600 24 T 500 24 T 400 24 T 300 24 T 200 24 T 100 24 T 0 24 Z"
                          fill="url(#inner-ripple-a)"
                        />
                      </motion.svg>

                      {/* Internal Rippling Wave Ribbon B (Counter-flowing at 58% depth) */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[58%] h-[26px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'], y: [0, 4, 0] }}
                        transition={{
                          x: { duration: 2.9, repeat: Infinity, ease: 'linear' },
                          y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                        }}
                      >
                        <defs>
                          <linearGradient id="inner-ripple-b" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fda4af" stopOpacity="0.6" />
                            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.6" />
                            <stop offset="70%" stopColor="#fb7185" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.6" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 Q 750 8 700 22 T 600 22 T 500 22 T 400 22 T 300 22 T 200 22 T 100 22 T 0 22 Z"
                          fill="url(#inner-ripple-b)"
                        />
                      </motion.svg>

                      {/* Effervescent Dual-Color Rising Water Bubbles */}
                      {!reducedMotion &&
                        [14, 28, 42, 56, 70, 84].map((leftPct, bIdx) => {
                          const isBlueBubble = leftPct <= pctMale
                          return (
                            <motion.span
                              key={bIdx}
                              className={`absolute bottom-1 rounded-full ${
                                isBlueBubble
                                  ? 'bg-sky-100 shadow-[0_0_8px_#38bdf8]'
                                  : 'bg-pink-100 shadow-[0_0_8px_#f43f5e]'
                              }`}
                              style={{
                                left: `${leftPct}%`,
                                width: 5 + (bIdx % 3) * 3,
                                height: 5 + (bIdx % 3) * 3,
                              }}
                              animate={{
                                y: [0, -spriteHeight * (visualFill / 100)],
                                x: [0, bIdx % 2 === 0 ? 8 : -8, bIdx % 2 === 0 ? -4 : 4, 0],
                                opacity: [0, 0.95, 0.85, 0],
                              }}
                              transition={{
                                duration: 1.9 + (bIdx % 3) * 0.4,
                                repeat: Infinity,
                                delay: bIdx * 0.3,
                                ease: 'easeInOut',
                              }}
                            />
                          )
                        })}
                    </div>
                  </motion.div>

                  {/* 4C. Subtle 3D Pig Facial & Contour Detail Overlay so eyes/snout/ears stay crisp over the water */}
                  <img
                    src={spriteSrc}
                    alt=""
                    style={{
                      height: '100%',
                      width: '100%',
                      opacity: 0.34,
                      mixBlendMode: 'multiply',
                      filter: 'contrast(1.25) brightness(1.05)',
                    }}
                    className="pointer-events-none absolute inset-0 block select-none object-contain"
                    draggable={false}
                  />

                  {/* Specular crystal glass sheen across entire body */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.2) 100%)',
                    }}
                  />
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
    </div>
  )
}
