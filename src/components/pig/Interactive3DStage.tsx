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
  /** Increment or change this token whenever a deposit is fully confirmed (2/2) to trigger a glowing energy-orb absorption into the pig! */
  coinBurstKey?: number
}

interface EnergyOrbParticle {
  id: number
  startX: number
  startY: number
  midX: number
  delay: number
  tone: 'male' | 'female' | 'gold'
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
  const [energyOrbs, setEnergyOrbs] = useState<EnergyOrbParticle[]>([])
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

  // Launch luminous light orbs (Sky Blue & Rose Pink) flying into the pig's heart when a 2/2 confirmation finishes!
  const launchEnergyAbsorption = (count = 10) => {
    const now = Date.now()
    const tones: ('male' | 'female' | 'gold')[] = ['male', 'female', 'gold', 'male', 'female']
    const batch: EnergyOrbParticle[] = Array.from({ length: count }, (_, i) => {
      const spread = (i - (count - 1) / 2) * 28
      return {
        id: now + i,
        startX: spread,
        startY: -40 - (i % 3) * 16,
        midX: spread * 0.4,
        delay: i * 0.05,
        tone: tones[i % tones.length],
        size: 16 + (i % 3) * 4,
      }
    })
    setEnergyOrbs(batch)
    setJumping(true)
    setTimeout(() => setJumping(false), 700)
    setTimeout(() => {
      setEnergyOrbs((curr) => curr.filter((c) => !batch.some((b) => b.id === c.id)))
    }, 1400)
  }

  useEffect(() => {
    if (typeof coinBurstKey === 'number' && coinBurstKey > 0 && coinBurstKey !== lastBurstKeyRef.current) {
      lastBurstKeyRef.current = coinBurstKey
      launchEnergyAbsorption(12)
    }
  }, [coinBurstKey])

  const triggerJump = () => {
    setJumping(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    launchEnergyAbsorption(4)
    const emojis = theme === 'romantic' ? ['💗', '💕', '✨', '💖'] : ['✨', '💙', '💗', '⭐']
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

  const hasGauge = typeof liquidFillPct === 'number'
  const clampedFill = hasGauge ? Math.max(0, Math.min(100, liquidFillPct)) : 100

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
   * 2-LAYER STACKED VERTICAL LIQUID CRYSTAL GAUGE (Horizontal Layers = 100% immune to pig ear/snout shape distortion!):
   * - The pig's physical body inside the 440x420 sprite spans from bottom 4% (paws) to 92% (top of head/ears) = 88% usable height.
   * - Total filled height inside the pig = `visualTotalFill%`.
   * - Layer 1 (Bottom Layer - Sky Blue 💙 for Nam): occupies `pctMale%` of the filled height.
   * - Layer 2 (Top Layer - Rose Pink 💗 for Nữ): sits directly on top of Layer 1, occupying `pctFemale%` of the filled height.
   * - Together, Layer 1 + Layer 2 reach the exact total `%` savings mark (`clampedFill%`), while each person's layer thickness shows their exact contribution share!
   */
  const BODY_BASE_PCT = 4
  const BODY_SPAN_PCT = 88
  const visualTotalSpan = clampedFill <= 0 ? 0 : (clampedFill / 100) * BODY_SPAN_PCT
  const visualMaleSpan = (visualTotalSpan * pctMale) / 100
  const visualFemaleSpan = (visualTotalSpan * pctFemale) / 100

  const totalTopY = clampedFill <= 0 ? 0 : Number((BODY_BASE_PCT + visualTotalSpan).toFixed(2))
  const maleTopY = clampedFill <= 0 || pctMale <= 0 ? 0 : Number((BODY_BASE_PCT + visualMaleSpan).toFixed(2))

  // Overall progress contribution of each person out of the 100% pig capacity (e.g. Total 60% = Nam 36% + Nữ 24%)
  const overallMalePct = (clampedFill * pctMale) / 100
  const overallFemalePct = (clampedFill * pctFemale) / 100

  // Dynamic Pig Quotes
  const quotes = [
    clampedFill <= 0
      ? `🐷 Heo pha lê đang ở mức 0%! Duyệt đủ 2/2 để nạp tầng năng lượng đầu tiên nha ✨`
      : pctMale > pctFemale
        ? `👑 Tầng Xanh của ${nameMale} (${pctMale.toFixed(0)}%) đang dày hơn Tầng Hồng của ${nameFemale} (${pctFemale.toFixed(0)}%) nè!`
        : pctFemale > pctMale
          ? `👑 Tầng Hồng của ${nameFemale} (${pctFemale.toFixed(0)}%) đang dày hơn Tầng Xanh của ${nameMale} (${pctMale.toFixed(0)}%) nè!`
          : `⚖️ Hai tầng Xanh – Hồng đang dày bằng nhau (${pctMale.toFixed(0)}% / ${pctFemale.toFixed(0)}%) · Quá ăn ý! 💗`,
    `📊 Đã tích góp ${clampedFill.toFixed(0)}% (${nameMale} ${overallMalePct.toFixed(0)}% + ${nameFemale} ${overallFemalePct.toFixed(0)}%)`,
    `✨ Chạm vào heo pha lê để khuấy động hai tầng năng lượng Xanh & Hồng nha!`,
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
        style={{ height: spriteHeight + 68, perspective: 900 }}
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
        </motion.div>

        {/* Floating Animated Speech Bubble ("Heo Đất Nói") */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: -4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          key={currentQuote}
          className="pointer-events-none absolute inset-x-0 top-1 z-20 flex justify-center px-4"
        >
          <div className="relative flex max-w-[355px] items-center gap-1.5 rounded-full border border-white/90 bg-white/95 px-3.5 py-1.5 text-center text-[11.5px] font-black text-[#1e1b4b] shadow-[0_6px_18px_rgba(30,27,75,.12)] backdrop-blur-md">
            <span className="truncate">{currentQuote}</span>
            <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white bg-white" />
          </div>
        </motion.div>

        {/* LUMINOUS ENERGY ORB SHOWER: When 2/2 confirmation completes, glowing Blue & Pink energy pearls fly into the pig! */}
        <AnimatePresence>
          {energyOrbs.map((orb) => {
            const bg =
              orb.tone === 'male'
                ? 'radial-gradient(circle at 30% 30%, #ffffff 0%, #38bdf8 45%, #0284c7 100%)'
                : orb.tone === 'female'
                  ? 'radial-gradient(circle at 30% 30%, #ffffff 0%, #fb7185 45%, #e11d48 100%)'
                  : 'radial-gradient(circle at 30% 30%, #ffffff 0%, #fde047 45%, #f59e0b 100%)'
            const glow =
              orb.tone === 'male'
                ? '0 0 14px rgba(56,189,248,0.9)'
                : orb.tone === 'female'
                  ? '0 0 14px rgba(244,63,94,0.9)'
                  : '0 0 14px rgba(250,204,21,0.9)'
            return (
              <motion.div
                key={orb.id}
                initial={{ x: orb.startX, y: orb.startY, scale: 0.3, opacity: 0 }}
                animate={{
                  x: [orb.startX, orb.midX, 0],
                  y: [orb.startY, 15, spriteHeight * 0.42],
                  scale: [0.4, 1.2, 0.3],
                  opacity: [0, 1, 1, 0],
                }}
                exit={{ opacity: 0, scale: 0.1 }}
                transition={{
                  duration: 0.78,
                  delay: orb.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: orb.size,
                  height: orb.size,
                  background: bg,
                  boxShadow: glow,
                }}
                className="pointer-events-none absolute left-1/2 top-8 z-40 -ml-2 rounded-full border border-white/80"
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

        {/* LAYER 4: 3D Piggy Bank + Dual-Layer Stacked Liquid Crystal Gauge + External Ruler & Member Callouts */}
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
            className="relative flex items-center justify-center"
          >
            {!hasGauge ? (
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
                }}
              >
                {/* 4A. PIG SPRITE CONTAINER WITH MASKED 2-LAYER STACKED LIQUID CRYSTAL */}
                <div
                  className="relative h-full w-full"
                  style={{
                    filter:
                      'drop-shadow(0 0 18px rgba(56, 189, 248, 0.34)) drop-shadow(0 0 18px rgba(244, 63, 94, 0.32)) drop-shadow(0 12px 20px rgba(30, 27, 75, 0.22))',
                  }}
                >
                  {/* Translucent Frosted Crystal Glass Piggy Shell (Unfilled top stays clear crystal) */}
                  <img
                    src={spriteSrc}
                    alt={alt}
                    style={{
                      height: '100%',
                      width: '100%',
                      opacity: 0.38,
                      filter: 'saturate(0.15) brightness(1.25) contrast(1.14)',
                    }}
                    className="block select-none object-contain"
                    draggable={false}
                  />

                  {/* MASKED INTERIOR: 2 Stacked Horizontal Liquid-Crystal Layers (Bottom = Nam Sky Blue, Top = Nữ Rose Pink) */}
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
                    {/* Internal 25% / 50% / 75% Graduation Ruler Lines etched inside the crystal pig */}
                    {[25, 50, 75].map((mark) => {
                      const markBottom = BODY_BASE_PCT + (mark / 100) * BODY_SPAN_PCT
                      return (
                        <div
                          key={mark}
                          className="absolute inset-x-[14%] border-b border-dashed border-white/45"
                          style={{ bottom: `${markBottom}%` }}
                        />
                      )
                    })}

                    {/* LAYER 1 (BOTTOM): 👦 NAM'S SKY-BLUE LIQUID CRYSTAL LAYER (0 -> maleTopY%) */}
                    {clampedFill > 0 && visualMaleSpan > 0 && (
                      <motion.div
                        className="absolute inset-x-0 bottom-0 overflow-hidden"
                        initial={{ height: '0%' }}
                        animate={{ height: `${maleTopY}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(56,189,248,0.95) 0%, rgba(14,165,233,0.92) 45%, rgba(2,132,199,0.96) 100%)',
                          boxShadow: 'inset 0 3px 10px rgba(255,255,255,0.65)',
                        }}
                      >
                        {/* Gentle wave ripple along the top of Nam's Blue layer */}
                        <motion.svg
                          viewBox="0 0 800 22"
                          preserveAspectRatio="none"
                          className="absolute left-0 top-0 h-[12px] w-[200%]"
                          animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                        >
                          <path
                            d="M 0 11 Q 50 1 100 11 T 200 11 T 300 11 T 400 11 T 500 11 T 600 11 T 700 11 T 800 11 L 800 22 L 0 22 Z"
                            fill="rgba(255, 255, 255, 0.35)"
                          />
                        </motion.svg>
                      </motion.div>
                    )}

                    {/* LAYER 2 (TOP, STACKED ON NAM): 👧 NỮ'S ROSE-PINK LIQUID CRYSTAL LAYER (maleTopY% -> totalTopY%) */}
                    {clampedFill > 0 && visualFemaleSpan > 0 && (
                      <motion.div
                        className="absolute inset-x-0 overflow-hidden"
                        initial={{ bottom: '0%', height: '0%' }}
                        animate={{
                          bottom: `${maleTopY}%`,
                          height: `${Math.max(0, totalTopY - maleTopY)}%`,
                        }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(251,113,133,0.95) 0%, rgba(244,63,94,0.92) 48%, rgba(225,29,72,0.96) 100%)',
                          boxShadow:
                            'inset 0 3px 10px rgba(255,255,255,0.75), 0 2px 8px rgba(255,255,255,0.6)',
                        }}
                      >
                        {/* Gentle wave ripple along the top meniscus of Nữ's Pink layer */}
                        <motion.svg
                          viewBox="0 0 800 22"
                          preserveAspectRatio="none"
                          className="absolute left-0 top-0 h-[12px] w-[200%]"
                          animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                          transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
                        >
                          <path
                            d="M 0 11 Q 50 1 100 11 T 200 11 T 300 11 T 400 11 T 500 11 T 600 11 T 700 11 T 800 11 L 800 22 L 0 22 Z"
                            fill="rgba(255, 255, 255, 0.55)"
                          />
                        </motion.svg>
                      </motion.div>
                    )}

                    {/* Glowing White-Gold Boundary Line separating Nam's Blue Layer and Nữ's Pink Layer */}
                    {clampedFill > 0 && visualMaleSpan > 0.5 && visualFemaleSpan > 0.5 && (
                      <motion.div
                        className="pointer-events-none absolute inset-x-0 h-[2.5px] bg-white/95 shadow-[0_0_8px_#ffffff]"
                        animate={{ bottom: `${maleTopY}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    )}

                    {/* Top Total % Meniscus Glow Line at totalTopY% */}
                    {clampedFill > 0 && clampedFill < 99.5 && (
                      <motion.div
                        className="pointer-events-none absolute inset-x-0 h-[3px] bg-gradient-to-r from-white/70 via-yellow-200 to-white/70 shadow-[0_0_10px_#fef08a]"
                        animate={{ bottom: `${totalTopY}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    )}

                    {/* Subtle 3D Pig Facial & Contour Detail Overlay so eyes/snout/ears stay crisp */}
                    <img
                      src={spriteSrc}
                      alt=""
                      style={{
                        height: '100%',
                        width: '100%',
                        opacity: 0.32,
                        mixBlendMode: 'multiply',
                        filter: 'contrast(1.24) brightness(1.05)',
                      }}
                      className="pointer-events-none absolute inset-0 block select-none object-contain"
                      draggable={false}
                    />

                    {/* Specular crystal glass sheen across entire body */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.22) 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* 4B. EXTERNAL GRADUATED % RULER & FLOATING MEMBER LAYER CALLOUT PILLS (Instant visual clarity!) */}
                {/* Right-side Vertical Glass Gauge Scale (0% .. 50% .. 100%) */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-11 bottom-[4%] top-[8%] flex flex-col items-start justify-between py-0.5"
                >
                  {[100, 75, 50, 25, 0].map((m) => (
                    <div key={m} className="flex items-center gap-1">
                      <span className="h-[1.5px] w-2 rounded-full bg-slate-400/70" />
                      <span className="text-[9.5px] font-black tabular-nums text-slate-600/90 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                        {m}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Floating Total % Pointer Pill on the Left pointing to the current top meniscus (`totalTopY%`) */}
                <motion.div
                  aria-hidden
                  animate={{
                    bottom: `${Math.max(6, Math.min(88, clampedFill <= 0 ? 6 : totalTopY - 3))}%`,
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="pointer-events-none absolute -left-12 z-20 flex items-center gap-1"
                >
                  <div className="rounded-full border-2 border-white bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-[0_4px_12px_rgba(79,70,229,0.35)]">
                    {clampedFill.toFixed(0)}%
                  </div>
                  <span className="h-[2px] w-2.5 rounded-full bg-indigo-600" />
                </motion.div>

                {/* On-Pig Layer Badges showing each person's exact layer inside the pig when filled > 0% */}
                {clampedFill > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-[6%] z-20 flex flex-col items-center gap-1"
                  >
                    {/* Top Layer Badge: Nữ (Rose Pink) */}
                    {pctFemale > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-white/95 bg-rose-500/92 px-2.5 py-0.5 text-[10px] font-black text-white shadow-[0_3px_10px_rgba(225,29,72,0.35)] backdrop-blur-sm">
                        <span>👧 {nameFemale}:</span>
                        <span className="tabular-nums">{pctFemale.toFixed(0)}%</span>
                      </div>
                    )}
                    {/* Bottom Layer Badge: Nam (Sky Blue) */}
                    {pctMale > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-white/95 bg-sky-600/92 px-2.5 py-0.5 text-[10px] font-black text-white shadow-[0_3px_10px_rgba(2,132,199,0.35)] backdrop-blur-sm">
                        <span>👦 {nameMale}:</span>
                        <span className="tabular-nums">{pctMale.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                )}
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
