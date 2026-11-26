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
      className="pointer-events-none block h-[105px] w-full select-none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant === 'pink' ? '#BBF7D0' : '#A3E635'} />
          <stop offset="100%" stopColor={variant === 'pink' ? '#4ADE80' : '#65A30D'} />
        </linearGradient>
        <linearGradient id="hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BEF264" />
          <stop offset="55%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#4D7C0F" />
        </linearGradient>
      </defs>
      <path d="M-20 80 Q 110 18 240 55 T 460 45 L 460 130 L -20 130 Z" fill="url(#hill-back)" opacity="0.85" />
      <path d="M-20 55 Q 220 5 460 60 L 460 130 L -20 130 Z" fill="url(#hill-front)" />
      {[
        { x: 52, y: 68, s: 1 },
        { x: 96, y: 82, s: 0.75 },
        { x: 356, y: 66, s: 1.05 },
        { x: 392, y: 80, s: 0.8 },
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
  spriteHeight = 225,
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
  const rotateX = useTransform(sy, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-14, 14])
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
    const emojis = theme === 'romantic' ? ['💗', '💕', '✨', '💖'] : ['💧', '🪙', '💗', '✨']
    const now = Date.now()
    setBursts((b) => [
      ...b.slice(-8),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: now + i,
        x: 22 + i * 14 + (Math.random() * 8 - 4),
        emoji: emojis[i % emojis.length],
      })),
    ])
    setTimeout(() => {
      setJumping(false)
      setDroppingCoin(false)
    }, 700)
  }

  const hasLiquid = typeof liquidFillPct === 'number'
  const clampedFill = hasLiquid ? Math.max(0, Math.min(100, liquidFillPct)) : 100
  const visualFill = clampedFill <= 0 ? 0 : Math.max(8, Math.min(100, clampedFill))

  // Identify Male (Chàng / Sky Blue) vs Female (Nàng / Rose Pink)
  const isBMale = membersShare?.b?.gender === 'male' || membersShare?.a?.gender === 'female'
  const memberMale = isBMale ? membersShare?.b : membersShare?.a
  const memberFemale = isBMale ? membersShare?.a : membersShare?.b

  const nameMale = memberMale?.name ?? 'Chàng'
  const nameFemale = memberFemale?.name ?? 'Nàng'
  const pctMale = memberMale?.pct ?? 50
  const pctFemale = memberFemale?.pct ?? 50

  // Dynamic Pig Quotes reflecting who is contributing more or less
  const quotes = [
    pctMale > pctFemale
      ? `👑 Chàng (${nameMale}) đang dẫn đầu (${pctMale.toFixed(0)}%) · Nàng (${nameFemale}) cố lên nè! 💕`
      : pctFemale > pctMale
        ? `👑 Nàng (${nameFemale}) đang dẫn đầu (${pctFemale.toFixed(0)}%) · Chàng (${nameMale}) đuổi theo nha! 💕`
        : `⚖️ Chàng & Nàng đang hòa nhau (${pctMale.toFixed(0)}%) · Cùng cố gắng nhé! 💗`,
    `🐷 Heo no ${clampedFill.toFixed(0)}% rồi đó! Chạm vào em để bỏ thêm xu nha 🪙`,
    `✨ Tích tiểu thành đại, chẳng mấy chốc về chung một nhà! 🏡`,
    `💧 Nước xanh của Chàng (${nameMale}) & Nước hồng của Nàng (${nameFemale}) nè! 🌊`,
  ]
  const currentQuote = quotes[quoteIdx % quotes.length]

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={triggerJump}
      role="button"
      tabIndex={0}
      aria-label={`${alt} – chạm để tương tác 3D`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerJump()}
      className="relative w-full cursor-pointer select-none overflow-hidden"
      style={{ height: spriteHeight + 70, perspective: 900 }}
    >
      {/* LAYER 1: Drifting Clouds & Floating Ambient Particles */}
      <motion.div style={{ x: bgShiftX }} className="pointer-events-none absolute inset-0">
        {theme !== 'galaxy' && (
          <>
            <motion.div
              className="absolute -left-4 top-4 w-36 opacity-90"
              animate={reducedMotion ? undefined : { x: [0, 18, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FluffyCloud />
            </motion.div>
            <motion.div
              className="absolute -right-6 top-8 w-40 opacity-85"
              animate={reducedMotion ? undefined : { x: [0, -20, 0] }}
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
              className="absolute text-lg drop-shadow"
              style={{ left: `${12 + idx * 24}%`, top: `${22 + (idx % 2) * 16}%` }}
              animate={{ y: [0, -14, 0], scale: [0.9, 1.15, 0.9], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.6 + idx * 0.5, repeat: Infinity, delay: idx * 0.4 }}
            >
              {em}
            </motion.span>
          ))}
      </motion.div>

      {/* Floating Animated Speech Bubble ("Heo Đất Nói") */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: -6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        key={currentQuote}
        className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center px-4"
      >
        <div className="relative flex max-w-[340px] items-center gap-1.5 rounded-full border-2 border-white bg-white/95 px-3.5 py-1.5 text-center text-xs font-black text-[#1e1b4b] shadow-[0_8px_20px_rgba(40,25,90,.15)] backdrop-blur-md">
          <span className="truncate">{currentQuote}</span>
          {/* Small cute speech triangle pointer */}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white bg-white" />
        </div>
      </motion.div>

      {/* Coin Dropping Animation into Pig's Slot */}
      <AnimatePresence>
        {droppingCoin && (
          <motion.div
            initial={{ y: 0, scale: 0.6, opacity: 0 }}
            animate={{ y: spriteHeight * 0.28, scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeIn' }}
            className="pointer-events-none absolute inset-x-0 top-7 z-30 flex justify-center text-3xl drop-shadow-[0_4px_12px_rgba(250,204,21,.6)]"
          >
            🪙
          </motion.div>
        )}
      </AnimatePresence>

      {/* LAYER 2: 3D Ground */}
      {(theme === 'meadow' || theme === 'romantic') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <GrassyHillsSVG variant={theme === 'romantic' ? 'pink' : 'green'} />
        </div>
      )}

      {/* LAYER 3: Dynamic 3D Contact Shadow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-1/2 h-7 -translate-x-1/2 rounded-[50%] bg-[#1e1b4b]/26 blur-[3px]"
        style={{ width: spriteHeight * 0.96 }}
        animate={
          reducedMotion
            ? undefined
            : jumping
              ? { scaleX: [1, 0.65, 1.08, 1], opacity: [0.28, 0.12, 0.32, 0.28] }
              : { scaleX: [1, 0.93, 1], opacity: [0.26, 0.2, 0.26] }
        }
        transition={{ duration: jumping ? 0.6 : 2.6, repeat: jumping ? 0 : Infinity, ease: 'easeInOut' }}
      />

      {/* LAYER 4: Separated 3D Cutout Mascot (Dual Liquid Water Fill reflecting who contributed more/less) */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
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
                    y: [0, -36, 4, 0],
                    scaleX: [1, 0.9, 1.1, 1],
                    scaleY: [1, 1.1, 0.9, 1],
                    rotateZ: [0, -5, 5, 0],
                  }
                : {
                    y: [0, -7, 0],
                    scaleX: [1, 1.02, 1],
                    scaleY: [1, 0.985, 1],
                  }
          }
          transition={
            jumping
              ? { duration: 0.6, ease: 'easeOut' }
              : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
          }
          className="relative"
        >
          {!hasLiquid ? (
            <img
              src={spriteSrc}
              alt={alt}
              style={{
                height: spriteHeight,
                width: 'auto',
                filter: 'drop-shadow(0 14px 22px rgba(30, 27, 75, 0.28))',
              }}
              className="block select-none object-contain"
              draggable={false}
            />
          ) : (
            <div
              className="relative select-none"
              style={{
                height: spriteHeight,
                filter:
                  'drop-shadow(0 0 28px rgba(56, 189, 248, 0.42)) drop-shadow(0 0 28px rgba(244, 63, 94, 0.42)) drop-shadow(0 14px 22px rgba(30, 27, 75, 0.25))',
              }}
            >
              {/* 4A. Translucent Frosted Crystal Glass Piggy Shell (Unfilled portion stays transparent) */}
              <img
                src={spriteSrc}
                alt={alt}
                style={{
                  height: spriteHeight,
                  width: 'auto',
                  opacity: 0.38,
                  filter: 'saturate(0.15) brightness(1.25) contrast(1.12)',
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
                    height: spriteHeight,
                    width: 'auto',
                    filter: 'brightness(1.08) saturate(1.25) contrast(1.06)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />
              </motion.div>

              {/* 4C. DUAL SLOSHING WATER WAVES (Vivid Sky Blue for Nam, Vibrant Rose Pink for Nữ, rising by monthly %) */}
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
                {/* Specular crystal glass reflection on top */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.24) 100%)',
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
                          <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.92" />
                          <stop offset={`${Math.max(20, Math.min(80, pctMale))}%`} stopColor="#d946ef" stopOpacity="0.88" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.92" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 14 Q 50 0 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                        fill="url(#wave-grad-back)"
                      />
                    </motion.svg>

                    {/* Front Sloshing Wave (glowing crest) */}
                    <motion.svg
                      viewBox="0 0 400 28"
                      preserveAspectRatio="none"
                      className="absolute -top-[15px] left-0 h-[19px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                    >
                      <path
                        d="M0 14 Q 50 28 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                        fill="rgba(255, 255, 255, 0.85)"
                      />
                    </motion.svg>

                    {/* Vivid Glowing Dual Liquid Body (shows high-contrast ratio of Male vs Female) */}
                    <div
                      className="relative h-full w-full overflow-hidden"
                      style={{
                        background: `linear-gradient(90deg, rgba(14,165,233,0.68) 0%, rgba(56,189,248,0.62) ${Math.max(12, pctMale - 10)}%, rgba(244,63,94,0.62) ${Math.min(88, pctMale + 10)}%, rgba(225,29,72,0.68) 100%)`,
                        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.45)',
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
                                opacity: [0, 1, 0],
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

              {/* Floating Dual Contribution & Monthly Fill Pill - raised up to bottom-10 with z-20 so it is NEVER clipped */}
              <div className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center justify-center gap-1 px-3 pointer-events-none">
                {membersShare ? (
                  <div className="flex items-center gap-2 rounded-full border-2 border-white/95 bg-white/95 px-3.5 py-1 shadow-[0_6px_20px_rgba(30,27,75,0.2)] backdrop-blur-md text-[11px] font-black">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                      💧 Tháng: {clampedFill.toFixed(0)}%
                    </span>
                    <span className={`flex items-center gap-1 ${pctMale >= pctFemale ? 'text-sky-600 font-black' : 'text-slate-600'}`}>
                      {pctMale > pctFemale && '👑'} 👦 <span className="underline decoration-sky-400 decoration-2">{nameMale}</span>: {pctMale.toFixed(0)}%
                    </span>
                    <span className="text-slate-300 font-bold">|</span>
                    <span className={`flex items-center gap-1 ${pctFemale >= pctMale ? 'text-pink-600 font-black' : 'text-slate-600'}`}>
                      {pctFemale > pctMale && '👑'} 👧 <span className="underline decoration-pink-400 decoration-2">{nameFemale}</span>: {pctFemale.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <span className="rounded-full border-2 border-white/95 bg-white/90 px-3 py-1 text-xs font-black text-[#e11d48] shadow-md backdrop-blur-md">
                    💧 {liquidLabel ?? `Tháng này: ${clampedFill.toFixed(0)}%`}
                  </span>
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
  )
}
