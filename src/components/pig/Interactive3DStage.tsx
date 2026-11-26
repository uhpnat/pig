import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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

interface InternalCoinSpec {
  id: number
  /** Horizontal center inside the pig body (11%..89%) */
  xPct: number
  /** Bottom offset from base of pig body (2%..87%) */
  yBottomPct: number
  /** Tilt angle in degrees */
  rot: number
  /** Size multiplier */
  scale: number
  /** Visual variant: gold (classic gold coin) or gem-tinted */
  tone: 'gold' | 'male' | 'female'
}

/** Deterministic pseudo-random helper so internal coins stay stable across renders */
function seededRand(seed: number) {
  const x = Math.sin(seed * 9999.91) * 10000
  return x - Math.floor(x)
}

/** Pre-compute 76 interlocking 3D coins stacked organically from bottom (2%) to top (88%) of the pig's belly */
const VAULT_COINS: Omit<InternalCoinSpec, 'tone'>[] = (() => {
  const rows = 10
  const cols = 8
  const list: Omit<InternalCoinSpec, 'tone'>[] = []
  let id = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      id++
      const r1 = seededRand(id * 3 + 1)
      const r2 = seededRand(id * 7 + 2)
      const r3 = seededRand(id * 13 + 5)
      // Stagger odd rows like real stacked coins inside a jar
      const rowOffset = r % 2 === 1 ? 4.8 : 0
      const baseX = 11 + c * 9.8 + rowOffset + (r1 - 0.5) * 4.2
      const baseY = 2.5 + r * 8.4 + (r2 - 0.5) * 2.6
      list.push({
        id,
        xPct: Math.max(8, Math.min(91, baseX)),
        yBottomPct: Math.max(2, Math.min(89, baseY)),
        rot: Math.round((r3 - 0.5) * 44),
        scale: Number((0.88 + seededRand(id * 19) * 0.24).toFixed(2)),
      })
    }
  }
  return list
})()

/** Crisp 3D Metallic Gold Coin SVG (with optional Sky-Blue / Rose-Pink gem emblem for Nam / Nữ) */
function Coin3DBadge({
  size = 24,
  tone = 'gold',
  className = '',
}: {
  size?: number
  tone?: 'gold' | 'male' | 'female'
  className?: string
}) {
  const rimColor = tone === 'male' ? '#0284c7' : tone === 'female' ? '#e11d48' : '#b45309'
  const innerRing = tone === 'male' ? '#38bdf8' : tone === 'female' ? '#fb7185' : '#fef08a'
  const coreBg =
    tone === 'male'
      ? 'linear-gradient(135deg, #fde047 0%, #f59e0b 58%, #38bdf8 100%)'
      : tone === 'female'
        ? 'linear-gradient(135deg, #fde047 0%, #f59e0b 58%, #fb7185 100%)'
        : 'linear-gradient(135deg, #fef08a 0%, #facc15 45%, #d97706 100%)'

  return (
    <div
      aria-hidden
      className={`relative inline-flex select-none items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: coreBg,
        border: `2px solid ${innerRing}`,
        boxShadow: `0 2.5px 0 ${rimColor}, 0 4px 8px rgba(30,27,75,0.24), inset 0 1.5px 2px rgba(255,255,255,0.9)`,
      }}
    >
      {/* Inner embossed ring */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          border: `1px dashed ${tone === 'male' ? 'rgba(2,132,199,0.55)' : tone === 'female' ? 'rgba(225,29,72,0.55)' : 'rgba(180,83,9,0.55)'}`,
        }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: Math.max(8, Math.round(size * 0.42)),
            color: tone === 'male' ? '#0369a1' : tone === 'female' ? '#be123c' : '#92400e',
            textShadow: '0 1px 0 rgba(255,255,255,0.75)',
          }}
        >
          ₫
        </span>
      </div>
      {/* Glossy diagonal highlight */}
      <div
        className="pointer-events-none absolute left-[15%] top-[10%] rounded-full bg-white/75"
        style={{ width: size * 0.28, height: size * 0.14, transform: 'rotate(-28deg)' }}
      />
    </div>
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
  /** Increment or change this token whenever a deposit is fully confirmed (2/2) to trigger a coin shower into the pig! */
  coinBurstKey?: number
}

interface FlyingCoinParticle {
  id: number
  startX: number
  startY: number
  midX: number
  delay: number
  tone: 'gold' | 'male' | 'female'
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
  const [droppingCoin, setDroppingCoin] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [bursts, setBursts] = useState<{ id: number; x: number; emoji: string }[]>([])
  const [flyingCoins, setFlyingCoins] = useState<FlyingCoinParticle[]>([])
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

  // Launch a multi-coin shower flying from the screen into the pig's back coin slot!
  const launchCoinShower = (count = 12) => {
    const now = Date.now()
    const tones: ('gold' | 'male' | 'female')[] = ['gold', 'male', 'gold', 'female', 'gold']
    const batch: FlyingCoinParticle[] = Array.from({ length: count }, (_, i) => {
      const angleSpread = (i - (count - 1) / 2) * 26
      return {
        id: now + i,
        startX: angleSpread + (Math.random() * 18 - 9),
        startY: -45 - (i % 3) * 18,
        midX: angleSpread * 0.45,
        delay: i * 0.055,
        tone: tones[i % tones.length],
        size: 24 + (i % 3) * 4,
      }
    })
    setFlyingCoins(batch)
    setJumping(true)
    setTimeout(() => setJumping(false), 750)
    setTimeout(() => {
      setFlyingCoins((curr) => curr.filter((c) => !batch.some((b) => b.id === c.id)))
    }, 1500)
  }

  // Trigger coin shower automatically when coinBurstKey increments (e.g. when 2/2 confirmation completes!)
  useEffect(() => {
    if (typeof coinBurstKey === 'number' && coinBurstKey > 0 && coinBurstKey !== lastBurstKeyRef.current) {
      lastBurstKeyRef.current = coinBurstKey
      launchCoinShower(14)
    }
  }, [coinBurstKey])

  const triggerJump = () => {
    setJumping(true)
    setDroppingCoin(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    const emojis = theme === 'romantic' ? ['💗', '💕', '✨', '💖'] : ['🪙', '✨', '💗', '💰']
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

  const hasCoinFill = typeof liquidFillPct === 'number'
  const clampedFill = hasCoinFill ? Math.max(0, Math.min(100, liquidFillPct)) : 100
  // Accurate vertical mapping: 0% = 0% (100% transparent empty pig); >0% maps linearly across the pig's belly (4% paws to 92% back)
  const visualFill =
    clampedFill <= 0
      ? 0
      : clampedFill >= 100
        ? 95
        : Number((5 + (clampedFill / 100) * 87).toFixed(2))

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
  // Horizontal split across the pig's physical body width (8% left edge to 92% right edge)
  const splitBodyX =
    pctMale <= 0.5
      ? 0
      : pctMale >= 99.5
        ? 100
        : Number((8 + (pctMale / 100) * 84).toFixed(2))

  // Filter & colorize the 3D coins visible inside the transparent piggy bank up to `visualFill%`
  const visibleCoins = useMemo(() => {
    if (visualFill <= 0) return []
    return VAULT_COINS.filter((c) => c.yBottomPct <= visualFill + 1.5).map((c) => {
      // Coins on Nam's side get subtle Sky-Blue gem rims mixed with pure gold; Nữ's side gets Rose-Pink gem rims mixed with pure gold
      const isLeft = c.xPct <= splitBodyX
      const tone: 'gold' | 'male' | 'female' =
        c.id % 3 === 0 ? 'gold' : isLeft ? 'male' : 'female'
      return { ...c, tone }
    })
  }, [visualFill, splitBodyX])

  // Dynamic Pig Quotes reflecting coin accumulation
  const quotes = [
    clampedFill <= 0
      ? `🐷 Bụng heo pha lê đang trống nè! Xác nhận đủ 2/2 để đồng xu đầu tiên bay vào heo nha 🪙`
      : pctMale > pctFemale
        ? `🪙 ${nameMale} đang góp ${pctMale.toFixed(0)}% kho xu · ${nameFemale} (${pctFemale.toFixed(0)}%) cố lên nè! 💕`
        : pctFemale > pctMale
          ? `🪙 ${nameFemale} đang góp ${pctFemale.toFixed(0)}% kho xu · ${nameMale} (${pctMale.toFixed(0)}%) đuổi theo nha! 💕`
          : `⚖️ Kho xu của hai bạn đang cân tài cân sức (${pctMale.toFixed(0)}%) · Tuyệt vời quá! 🪙`,
    `🪙 Bụng heo đã đầy ${clampedFill.toFixed(0)}% xu vàng rồi đó! Chạm vào heo nghe tiếng xu leng keng nha ✨`,
    `✨ Xu xanh của ${nameMale} 💙 lấp lánh bên xu hồng của ${nameFemale} 💗`,
    `🏡 Tích tiểu thành đại, mỗi ngày bỏ ống một ít là bụng heo đầy ắp xu vàng thôi!`,
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
                  'radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(250,204,21,0.28) 45%, rgba(244,63,94,0.22) 80%, transparent 100%)',
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

        {/* Single Tap Coin Drop into Pig's Slot */}
        <AnimatePresence>
          {droppingCoin && (
            <motion.div
              initial={{ y: -8, scale: 0.7, opacity: 0, rotateY: 0 }}
              animate={{ y: spriteHeight * 0.28, scale: [1.15, 0.85], opacity: [1, 1, 0], rotateY: 360 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.48, ease: 'easeIn' }}
              className="pointer-events-none absolute inset-x-0 top-7 z-30 flex justify-center"
            >
              <Coin3DBadge size={32} tone="gold" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CELEBRATION COIN SHOWER: Multiple 3D Coins Flying into the Piggy Bank when 2/2 confirmed! */}
        <AnimatePresence>
          {flyingCoins.map((fc) => (
            <motion.div
              key={fc.id}
              initial={{
                x: fc.startX,
                y: fc.startY,
                scale: 0.4,
                opacity: 0,
                rotate: -45,
              }}
              animate={{
                x: [fc.startX, fc.midX, 0],
                y: [fc.startY, 12, spriteHeight * 0.34],
                scale: [0.5, 1.25, 0.55],
                opacity: [0, 1, 1, 0],
                rotate: [0, 180, 360],
              }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{
                duration: 0.82,
                delay: fc.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="pointer-events-none absolute left-1/2 top-8 z-40 -ml-3.5"
            >
              <Coin3DBadge size={fc.size} tone={fc.tone} />
            </motion.div>
          ))}
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
                'radial-gradient(ellipse at center, rgba(30,27,75,0.34) 0%, rgba(245,158,11,0.28) 48%, rgba(244,63,94,0.22) 78%, transparent 100%)',
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

        {/* LAYER 4: 3D Transparent Crystal Piggy Bank Filled with Visible 3D Coins */}
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
                      y: [0, -28, 3, 0],
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
            {!hasCoinFill ? (
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
                    'drop-shadow(0 0 20px rgba(250, 204, 21, 0.35)) drop-shadow(0 0 20px rgba(244, 63, 94, 0.28)) drop-shadow(0 12px 20px rgba(30, 27, 75, 0.24))',
                }}
              >
                {/* 4A. Translucent Frosted Crystal Glass Piggy Shell (Back glass wall) */}
                <img
                  src={spriteSrc}
                  alt={alt}
                  style={{
                    height: '100%',
                    width: '100%',
                    opacity: 0.42,
                    filter: 'saturate(0.18) brightness(1.24) contrast(1.12)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />

                {/* 4B. TRANSPARENT BELLY VAULT: Visible 3D Gold Coins stacked inside the pig's silhouette */}
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
                  {/* Golden warm ambient glow at the bottom of the coin pile */}
                  {visualFill > 0 && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0"
                      initial={{ height: '0%' }}
                      animate={{ height: `${visualFill}%` }}
                      transition={{ duration: 0.85, ease: 'easeOut' }}
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(56,189,248,0.28) 0%, rgba(250,204,21,0.38) 50%, rgba(251,113,133,0.28) 100%)',
                      }}
                    />
                  )}

                  {/* Stacked 3D Coins inside the Transparent Piggy Bank */}
                  <AnimatePresence initial={false}>
                    {visibleCoins.map((c) => {
                      const coinPx = Math.round(spriteHeight * 0.095 * c.scale)
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ y: -90, opacity: 0, scale: 0.4 }}
                          animate={{ y: 0, opacity: 1, scale: 1, rotate: c.rot }}
                          exit={{ opacity: 0, scale: 0.3 }}
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                            delay: Math.min(0.45, (c.id % 12) * 0.03),
                          }}
                          className="absolute -translate-x-1/2"
                          style={{
                            left: `${c.xPct}%`,
                            bottom: `${c.yBottomPct}%`,
                          }}
                        >
                          <Coin3DBadge size={coinPx} tone={c.tone} />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>

                  {/* Twinkling Gold Sparkles inside the coin pile */}
                  {!reducedMotion &&
                    visualFill > 12 &&
                    [22, 42, 60, 76].map((leftPct, sIdx) => (
                      <motion.span
                        key={sIdx}
                        className="pointer-events-none absolute text-[11px] drop-shadow-[0_0_6px_#fef08a]"
                        style={{
                          left: `${leftPct}%`,
                          bottom: `${Math.min(visualFill - 4, 10 + sIdx * 18)}%`,
                        }}
                        animate={{
                          scale: [0.7, 1.25, 0.7],
                          opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                          duration: 1.6 + sIdx * 0.3,
                          repeat: Infinity,
                          delay: sIdx * 0.35,
                        }}
                      >
                        ✨
                      </motion.span>
                    ))}

                  {/* 4C. Crystal Glass Pig Front Shell & Facial Contour Overlay so eyes/snout/ears & glass reflection shine over the coins */}
                  <img
                    src={spriteSrc}
                    alt=""
                    style={{
                      height: '100%',
                      width: '100%',
                      opacity: 0.32,
                      mixBlendMode: 'multiply',
                      filter: 'contrast(1.22) brightness(1.06)',
                    }}
                    className="pointer-events-none absolute inset-0 block select-none object-contain"
                    draggable={false}
                  />

                  {/* Specular crystal glass sheen across entire body */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.05) 36%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.28) 100%)',
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
