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
      viewBox="0 0 440 140"
      preserveAspectRatio="none"
      className="pointer-events-none block h-[115px] w-full select-none"
      style={{
        maskImage: 'linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FBCFE8' : '#BBF7D0'} stopOpacity="0.85" />
          <stop offset="65%" stopColor={variant === 'pink' ? '#F472B6' : '#4ADE80'} stopOpacity="0.55" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FCE7F3' : '#ECFCCB'} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FCE7F3' : '#D9F99D'} stopOpacity="0.95" />
          <stop offset="48%" stopColor={variant === 'pink' ? '#F9A8D4' : '#86EFAC'} stopOpacity="0.82" />
          <stop offset="85%" stopColor={variant === 'pink' ? '#FDF2F8' : '#DCFCE7'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FFF5F9' : '#F0FDF4'} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="island-podium" cx="50%" cy="45%" r="48%">
          <stop offset="0%" stopColor={variant === 'pink' ? '#FBCFE8' : '#BEF264'} stopOpacity="0.95" />
          <stop offset="68%" stopColor={variant === 'pink' ? '#F472B6' : '#4ADE80'} stopOpacity="0.75" />
          <stop offset="100%" stopColor={variant === 'pink' ? '#FCE7F3' : '#BBF7D0'} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Rolling background hills that fade smoothly into mist at the bottom */}
      <path d="M-20 78 Q 110 20 240 54 T 460 44 L 460 140 L -20 140 Z" fill="url(#hill-back)" />
      <path d="M-20 56 Q 220 8 460 58 L 460 140 L -20 140 Z" fill="url(#hill-front)" />
      {/* Soft 3D Floating Meadow Island under the pig */}
      <ellipse cx="220" cy="86" rx="175" ry="38" fill="url(#island-podium)" />
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
  // Accurate vertical mapping: 0% = 0% (100% transparent empty pig); >0% maps linearly across the pig's body (3.6% paws to 93.6% ears), 100% = 100%
  const visualFill =
    clampedFill <= 0
      ? 0
      : clampedFill >= 100
        ? 100
        : Number((3.6 + (clampedFill / 100) * 90).toFixed(2))

  // Identify Male (Chàng / Sky Blue) vs Female (Nàng / Rose Pink)
  const isBMale = membersShare?.b?.gender === 'male' || membersShare?.a?.gender === 'female'
  const memberMale = isBMale ? membersShare?.b : membersShare?.a
  const memberFemale = isBMale ? membersShare?.a : membersShare?.b

  const nameMale = memberMale?.name ?? 'Chàng'
  const nameFemale = memberFemale?.name ?? 'Nàng'
  const rawPctMale = memberMale?.pct ?? 50
  const rawPctFemale = memberFemale?.pct ?? 50
  const totalShare = rawPctMale + rawPctFemale
  const pctMale = totalShare > 0 ? (rawPctMale / totalShare) * 100 : 50
  const pctFemale = totalShare > 0 ? (rawPctFemale / totalShare) * 100 : 50
  // Horizontal split across the pig's physical body width (6% left edge to 94% right edge)
  const splitBodyX =
    pctMale <= 0.5
      ? 0
      : pctMale >= 99.5
        ? 100
        : Number((6 + (pctMale / 100) * 88).toFixed(2))

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

                {/* 4B. ACCURATE % RIPPLING DUAL-COLOR WATER WAVES (Nam Sky Blue + Nữ Rose Pink proportional to their exact %) */}
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
                  {/* Rising Liquid Container: 0% when clampedFill is 0, rises accurately to visualFill% */}
                  {visualFill > 0 && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 overflow-hidden"
                      initial={{ height: '0%' }}
                      animate={{ height: `${visualFill}%` }}
                      transition={{ duration: 0.95, ease: 'easeOut' }}
                    >
                      {/* LEFT ZONE: Nam's Sky-Blue Rippling Water Column (Width = splitBodyX%) */}
                      {splitBodyX > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 overflow-hidden transition-all duration-700"
                          style={{ width: `${splitBodyX}%` }}
                        >
                          {/* Nam Back Wave */}
                          <motion.svg
                            viewBox="0 0 800 28"
                            preserveAspectRatio="none"
                            className="absolute left-0 top-0 h-[18px] w-[520px]"
                            animate={reducedMotion ? undefined : { x: [0, -260] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                          >
                            <path
                              d="M 0 14 Q 32.5 0 65 14 T 130 14 T 195 14 T 260 14 T 325 14 T 390 14 T 455 14 T 520 14 L 520 28 L 0 28 Z"
                              fill="rgba(2, 132, 199, 0.85)"
                            />
                          </motion.svg>

                          {/* Nam Front Counter-Wave */}
                          <motion.svg
                            viewBox="0 0 800 28"
                            preserveAspectRatio="none"
                            className="absolute left-0 top-[3px] h-[17px] w-[520px]"
                            animate={reducedMotion ? undefined : { x: [-260, 0] }}
                            transition={{ duration: 1.85, repeat: Infinity, ease: 'linear' }}
                          >
                            <path
                              d="M 0 14 Q 32.5 28 65 14 T 130 14 T 195 14 T 260 14 T 325 14 T 390 14 T 455 14 T 520 14 L 520 28 L 0 28 Z"
                              fill="rgba(56, 189, 248, 0.94)"
                            />
                          </motion.svg>

                          {/* Nam Solid Liquid Body below the 15px wave crest */}
                          <div
                            className="absolute inset-x-0 bottom-0 top-[15px]"
                            style={{
                              background: 'linear-gradient(180deg, rgba(56,189,248,0.92) 0%, rgba(14,165,233,0.9) 50%, rgba(2,132,199,0.94) 100%)',
                            }}
                          />
                        </div>
                      )}

                      {/* RIGHT ZONE: Nữ's Rose-Pink Rippling Water Column (Width = 100 - splitBodyX%) */}
                      {splitBodyX < 100 && (
                        <div
                          className="absolute inset-y-0 right-0 overflow-hidden transition-all duration-700"
                          style={{ width: `${100 - splitBodyX}%` }}
                        >
                          {/* Nữ Back Wave */}
                          <motion.svg
                            viewBox="0 0 800 28"
                            preserveAspectRatio="none"
                            className="absolute right-0 top-0 h-[18px] w-[520px]"
                            animate={reducedMotion ? undefined : { x: [0, 260] }}
                            transition={{ duration: 2.3, repeat: Infinity, ease: 'linear' }}
                          >
                            <path
                              d="M 0 14 Q 32.5 0 65 14 T 130 14 T 195 14 T 260 14 T 325 14 T 390 14 T 455 14 T 520 14 L 520 28 L 0 28 Z"
                              fill="rgba(225, 29, 72, 0.85)"
                            />
                          </motion.svg>

                          {/* Nữ Front Counter-Wave */}
                          <motion.svg
                            viewBox="0 0 800 28"
                            preserveAspectRatio="none"
                            className="absolute right-0 top-[3px] h-[17px] w-[520px]"
                            animate={reducedMotion ? undefined : { x: [260, 0] }}
                            transition={{ duration: 1.75, repeat: Infinity, ease: 'linear' }}
                          >
                            <path
                              d="M 0 14 Q 32.5 28 65 14 T 130 14 T 195 14 T 260 14 T 325 14 T 390 14 T 455 14 T 520 14 L 520 28 L 0 28 Z"
                              fill="rgba(251, 113, 133, 0.94)"
                            />
                          </motion.svg>

                          {/* Nữ Solid Liquid Body below the 15px wave crest */}
                          <div
                            className="absolute inset-x-0 bottom-0 top-[15px]"
                            style={{
                              background: 'linear-gradient(180deg, rgba(251,113,133,0.92) 0%, rgba(244,63,94,0.9) 50%, rgba(225,29,72,0.94) 100%)',
                            }}
                          />
                        </div>
                      )}

                      {/* Soft Iridescent Blend seam where Nam's Blue meets Nữ's Pink */}
                      {splitBodyX > 0 && splitBodyX < 100 && (
                        <div
                          className="pointer-events-none absolute bottom-0 top-[8px] w-5 -translate-x-1/2 blur-[4px] transition-all duration-700"
                          style={{
                            left: `${splitBodyX}%`,
                            background: 'linear-gradient(90deg, rgba(56,189,248,0.85) 0%, rgba(192,132,252,0.9) 50%, rgba(251,113,133,0.85) 100%)',
                          }}
                        />
                      )}

                      {/* Full-Width Shimmering Surface Meniscus Ripple & Internal Wave Ribbons */}
                      <motion.svg
                        viewBox="0 0 800 24"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute left-0 top-[2px] h-[14px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 12 Q 50 2 100 12 T 200 12 T 300 12 T 400 12 T 500 12 T 600 12 T 700 12 T 800 12 L 800 17 L 0 17 Z"
                          fill="rgba(255, 255, 255, 0.65)"
                        />
                      </motion.svg>

                      {/* Internal White-Aqua Shimmer Ribbon inside the water */}
                      <motion.svg
                        viewBox="0 0 800 28"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute left-0 top-[45%] h-[18px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 14 Q 50 0 100 14 T 200 14 T 300 14 T 400 14 T 500 14 T 600 14 T 700 14 T 800 14 L 800 20 L 0 20 Z"
                          fill="rgba(255, 255, 255, 0.24)"
                        />
                      </motion.svg>

                      {/* Effervescent Rising Water Bubbles */}
                      {!reducedMotion &&
                        [18, 34, 50, 66, 82].map((leftPct, bIdx) => {
                          const isBlueBubble = leftPct <= splitBodyX
                          return (
                            <motion.span
                              key={bIdx}
                              className={`pointer-events-none absolute bottom-1 rounded-full ${
                                isBlueBubble
                                  ? 'bg-sky-100 shadow-[0_0_6px_#ffffff]'
                                  : 'bg-pink-100 shadow-[0_0_6px_#ffffff]'
                              }`}
                              style={{
                                left: `${leftPct}%`,
                                width: 4 + (bIdx % 3) * 2.5,
                                height: 4 + (bIdx % 3) * 2.5,
                              }}
                              animate={{
                                y: [0, -Math.max(24, spriteHeight * (visualFill / 100) - 16)],
                                x: [0, bIdx % 2 === 0 ? 6 : -6, 0],
                                opacity: [0, 0.9, 0],
                              }}
                              transition={{
                                duration: 1.8 + (bIdx % 3) * 0.35,
                                repeat: Infinity,
                                delay: bIdx * 0.3,
                                ease: 'easeInOut',
                              }}
                            />
                          )
                        })}
                    </motion.div>
                  )}

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
