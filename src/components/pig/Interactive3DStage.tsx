import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

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
      <path d="M-20 78 Q 110 20 240 54 T 460 44 L 460 140 L -20 140 Z" fill="url(#hill-back)" />
      <path d="M-20 56 Q 220 8 460 58 L 460 140 L -20 140 Z" fill="url(#hill-front)" />
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
  /** Increment or change this token whenever a deposit is fully confirmed (2/2) to trigger a water-drop splash into the pig! */
  coinBurstKey?: number
}

interface WaterDropParticle {
  id: number
  startX: number
  startY: number
  midX: number
  delay: number
  tone: 'male' | 'female'
  size: number
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
  coinBurstKey,
}: StageProps) {
  const [jumping, setJumping] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])
  const [waterDrops, setWaterDrops] = useState<WaterDropParticle[]>([])
  const lastBurstKeyRef = useRef<number | undefined>(coinBurstKey)

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

  // Launch glowing water droplets splashing into the pig when a 2/2 confirmation finishes!
  const launchWaterSplash = (count = 10) => {
    const now = Date.now()
    const tones: ('male' | 'female')[] = ['male', 'female', 'male', 'female']
    const batch: WaterDropParticle[] = Array.from({ length: count }, (_, i) => {
      const spread = (i - (count - 1) / 2) * 24
      return {
        id: now + i,
        startX: spread,
        startY: -36 - (i % 3) * 14,
        midX: spread * 0.35,
        delay: i * 0.045,
        tone: tones[i % tones.length],
        size: 13 + (i % 3) * 3,
      }
    })
    setWaterDrops(batch)
    setJumping(true)
    setTimeout(() => setJumping(false), 680)
    setTimeout(() => {
      setWaterDrops((curr) => curr.filter((c) => !batch.some((b) => b.id === c.id)))
    }, 1350)
  }

  useEffect(() => {
    if (typeof coinBurstKey === 'number' && coinBurstKey > 0 && coinBurstKey !== lastBurstKeyRef.current) {
      lastBurstKeyRef.current = coinBurstKey
      launchWaterSplash(10)
    }
  }, [coinBurstKey])

  const triggerJump = () => {
    setJumping(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    launchWaterSplash(3)
    const emojis = theme === 'romantic' ? ['💗', '💕', '✨', '💖'] : ['💧', '✨', '💗', '💙']
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
    }, 680)
  }

  const hasWater = typeof liquidFillPct === 'number'
  const clampedFill = hasWater ? Math.max(0, Math.min(100, liquidFillPct)) : 100

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

  /**
   * 100% CLEAN INTERNAL WATER WAVE FILL (NO external rulers, NO badges or text covering the pig!):
   * - The pig's physical body inside the 440x420 sprite spans from bottom 3.8% (paws) to 93.8% (top of head/ears) = 90% usable height.
   * - Total water level height inside the pig = `totalTopY%` (strictly 0% when clampedFill is 0, rising linearly to 100% as savings grow).
   * - Inside that rising water body, the water is formed by two naturally undulating horizontal wave layers:
   *   1. Bottom Water Layer (Sky Blue 💙 for Nam): occupies `pctMale%` of the water height (`0 -> maleTopY%`), with a rolling wave crest at `maleTopY%`.
   *   2. Top Water Layer (Rose Pink 💗 for Nữ): floats smoothly on top of Nam's blue water (`maleTopY% -> totalTopY%`), occupying `pctFemale%` of the water height, with a counter-rolling wave crest at the top water surface (`totalTopY%`).
   * - This way, looking purely at the water inside the transparent pig:
   *   - How high the water reaches inside the pig = Total % saved.
   *   - The thickness of the Blue water wave vs Pink water wave = Each person's exact contribution share.
   */
  const BODY_BASE_PCT = 3.8
  const BODY_SPAN_PCT = 90
  const visualTotalSpan = clampedFill <= 0 ? 0 : (clampedFill / 100) * BODY_SPAN_PCT
  const visualMaleSpan = (visualTotalSpan * pctMale) / 100
  const visualFemaleSpan = (visualTotalSpan * pctFemale) / 100

  const totalTopY =
    clampedFill <= 0 ? 0 : clampedFill >= 100 ? 100 : Number((BODY_BASE_PCT + visualTotalSpan).toFixed(2))
  const maleTopY =
    clampedFill <= 0 || pctMale <= 0
      ? 0
      : pctFemale <= 0
        ? totalTopY
        : Number((BODY_BASE_PCT + visualMaleSpan).toFixed(2))

  // Dynamic Pig Quotes in the speech bubble above
  const quotes = [
    clampedFill <= 0
      ? `🐷 Bụng heo pha lê đang trong suốt (0%)! Cùng nạp tiền để nước dâng lên nha 💧`
      : pctMale > pctFemale
        ? `💧 Nước xanh của ${nameMale} (${pctMale.toFixed(0)}%) đang nhiều hơn nước hồng của ${nameFemale} (${pctFemale.toFixed(0)}%) nè!`
        : pctFemale > pctMale
          ? `💧 Nước hồng của ${nameFemale} (${pctFemale.toFixed(0)}%) đang nhiều hơn nước xanh của ${nameMale} (${pctMale.toFixed(0)}%) nè!`
          : `⚖️ Hai làn sóng Xanh – Hồng đang bằng nhau (${pctMale.toFixed(0)}% / ${pctFemale.toFixed(0)}%) · Tuyệt vời quá! 💗`,
    `🌊 Mực nước trong bụng heo đã dâng được ${clampedFill.toFixed(0)}% rồi đó! Chạm vào heo nha ✨`,
    `💙 Sóng xanh của ${nameMale} hòa quyện cùng sóng hồng của ${nameFemale} 💗`,
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
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full blur-2xl"
              style={{
                width: spriteHeight * 1.05,
                height: spriteHeight * 0.9,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(56,189,248,0.28) 45%, rgba(244,63,94,0.25) 80%, transparent 100%)',
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
              : ['✨', '💧', '💗', '✨']
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
          <div className="relative flex max-w-[355px] items-center gap-1.5 rounded-full border border-white/90 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(30,27,75,.12)] backdrop-blur-md">
            <span className="truncate">{currentQuote}</span>
            <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
          </div>
        </motion.div>

        {/* Water Droplets splashing into the pig when 2/2 confirmed */}
        <AnimatePresence>
          {waterDrops.map((drop) => {
            const bg =
              drop.tone === 'male'
                ? 'radial-gradient(circle at 30% 30%, #ffffff 0%, #38bdf8 50%, #0284c7 100%)'
                : 'radial-gradient(circle at 30% 30%, #ffffff 0%, #fb7185 50%, #e11d48 100%)'
            return (
              <motion.div
                key={drop.id}
                initial={{ x: drop.startX, y: drop.startY, scale: 0.3, opacity: 0 }}
                animate={{
                  x: [drop.startX, drop.midX, 0],
                  y: [drop.startY, 12, spriteHeight * 0.38],
                  scale: [0.4, 1.15, 0.3],
                  opacity: [0, 0.95, 0.95, 0],
                }}
                exit={{ opacity: 0, scale: 0.1 }}
                transition={{
                  duration: 0.72,
                  delay: drop.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: drop.size,
                  height: drop.size * 1.25,
                  background: bg,
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  boxShadow:
                    drop.tone === 'male'
                      ? '0 0 10px rgba(56,189,248,0.85)'
                      : '0 0 10px rgba(244,63,94,0.85)',
                }}
                className="pointer-events-none absolute left-1/2 top-8 z-40 -ml-2"
              />
            )
          })}
        </AnimatePresence>

        {/* LAYER 2: 3D Ground & Podium Pedestal */}
        {(theme === 'meadow' || theme === 'romantic') && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <GrassyHillsSVG variant={theme === 'romantic' ? 'pink' : 'green'} />
          </div>
        )}

        {/* Glowing 3D Pedestal Shadow under the Pig */}
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

        {/* LAYER 4: 3D Crystal Piggy Bank with Pure Internal Dual-Wave Rising Water (Nothing drawn outside or covering the pig!) */}
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
                      y: [0, -26, 3, 0],
                      scaleX: [1, 0.93, 1.06, 1],
                      scaleY: [1, 1.07, 0.93, 1],
                      rotateZ: [0, -3, 3, 0],
                    }
                  : {
                      y: [0, -5, 0],
                      scaleX: [1, 1.012, 1],
                      scaleY: [1, 0.988, 1],
                    }
            }
            transition={
              jumping
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative"
          >
            {!hasWater ? (
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
                    'drop-shadow(0 0 20px rgba(56, 189, 248, 0.35)) drop-shadow(0 0 20px rgba(244, 63, 94, 0.35)) drop-shadow(0 12px 20px rgba(30, 27, 75, 0.22))',
                }}
              >
                {/* 4A. Translucent Frosted Crystal Glass Piggy Shell (Unfilled top stays clear transparent glass) */}
                <img
                  src={spriteSrc}
                  alt={alt}
                  style={{
                    height: '100%',
                    width: '100%',
                    opacity: 0.38,
                    filter: 'saturate(0.14) brightness(1.25) contrast(1.15)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />

                {/* 4B. PURE INTERNAL WATER WAVES MASKED STRICTLY TO THE PIG'S BODY */}
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
                  {/* UPPER WATER LAYER (Floats up to totalTopY%): 👧 NỮ'S ROSE-PINK RIPPLING WATER */}
                  {clampedFill > 0 && visualFemaleSpan > 0 && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 overflow-hidden"
                      initial={{ height: '0%' }}
                      animate={{ height: `${totalTopY}%` }}
                      transition={{ duration: 0.95, ease: 'easeOut' }}
                    >
                      {/* Pink Back Wave at the top water surface */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-0 h-[20px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                        transition={{ duration: 2.3, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                          fill="rgba(225, 29, 72, 0.84)"
                        />
                      </motion.svg>

                      {/* Pink Front Counter-Wave at the top water surface */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[3px] h-[19px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                        transition={{ duration: 1.75, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                          fill="rgba(251, 113, 133, 0.94)"
                        />
                      </motion.svg>

                      {/* Shimmering White Meniscus Highlight on the top water wave */}
                      <motion.svg
                        viewBox="0 0 800 24"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[2px] h-[12px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 12 Q 50 2 100 12 T 200 12 T 300 12 T 400 12 T 500 12 T 600 12 T 700 12 T 800 12 L 800 16 L 0 16 Z"
                          fill="rgba(255, 255, 255, 0.65)"
                        />
                      </motion.svg>

                      {/* Pink Water Body below the top wave crest */}
                      <div
                        className="absolute inset-x-0 bottom-0 top-[16px]"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(251,113,133,0.94) 0%, rgba(244,63,94,0.92) 55%, rgba(225,29,72,0.95) 100%)',
                        }}
                      />
                    </motion.div>
                  )}

                  {/* LOWER WATER LAYER (Rises from bottom up to maleTopY%): 👦 NAM'S SKY-BLUE RIPPLING WATER */}
                  {clampedFill > 0 && visualMaleSpan > 0 && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 overflow-hidden"
                      initial={{ height: '0%' }}
                      animate={{ height: `${maleTopY}%` }}
                      transition={{ duration: 0.95, ease: 'easeOut' }}
                    >
                      {/* Blue Back Wave (interlocks with the Pink water above or forms the surface if Nữ = 0%) */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-0 h-[20px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                          fill="rgba(2, 132, 199, 0.88)"
                        />
                      </motion.svg>

                      {/* Blue Front Counter-Wave */}
                      <motion.svg
                        viewBox="0 0 800 32"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[3px] h-[19px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                        transition={{ duration: 1.85, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                          fill="rgba(56, 189, 248, 0.95)"
                        />
                      </motion.svg>

                      {/* Luminous Wave Crest Ribbon where Blue water meets Pink water */}
                      <motion.svg
                        viewBox="0 0 800 24"
                        preserveAspectRatio="none"
                        className="absolute left-0 top-[2px] h-[12px] w-[200%]"
                        animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                        transition={{ duration: 2.0, repeat: Infinity, ease: 'linear' }}
                      >
                        <path
                          d="M 0 12 Q 50 2 100 12 T 200 12 T 300 12 T 400 12 T 500 12 T 600 12 T 700 12 T 800 12 L 800 16 L 0 16 Z"
                          fill="rgba(255, 255, 255, 0.6)"
                        />
                      </motion.svg>

                      {/* Blue Water Body below its wave crest */}
                      <div
                        className="absolute inset-x-0 bottom-0 top-[16px]"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(56,189,248,0.95) 0%, rgba(14,165,233,0.93) 55%, rgba(2,132,199,0.96) 100%)',
                        }}
                      />
                    </motion.div>
                  )}

                  {/* Effervescent Rising Water Bubbles inside the water */}
                  {!reducedMotion &&
                    totalTopY > 8 &&
                    [20, 36, 52, 68, 82].map((leftPct, bIdx) => (
                      <motion.span
                        key={bIdx}
                        className="pointer-events-none absolute bottom-2 rounded-full bg-white/80 shadow-[0_0_6px_#ffffff]"
                        style={{
                          left: `${leftPct}%`,
                          width: 4 + (bIdx % 3) * 2,
                          height: 4 + (bIdx % 3) * 2,
                        }}
                        animate={{
                          y: [0, -Math.max(20, spriteHeight * (totalTopY / 100) - 18)],
                          x: [0, bIdx % 2 === 0 ? 5 : -5, 0],
                          opacity: [0, 0.85, 0],
                        }}
                        transition={{
                          duration: 1.9 + (bIdx % 3) * 0.35,
                          repeat: Infinity,
                          delay: bIdx * 0.32,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}

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
