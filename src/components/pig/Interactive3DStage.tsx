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

interface StageProps {
  spriteSrc: string
  alt: string
  theme?: 'meadow' | 'romantic' | 'galaxy' | 'pastel'
  spriteHeight?: number
  reducedMotion?: boolean
  badge?: ReactNode
  onPoke?: () => void
  /**
   * 0..100: When provided, the 3D pig becomes a translucent crystal/glass piggy bank
   * and liquid color + sloshing water waves + bubbles fill up inside the pig's body from bottom to top!
   */
  liquidFillPct?: number
  liquidLabel?: string
}

export function Interactive3DStage({
  spriteSrc,
  alt,
  theme = 'meadow',
  spriteHeight = 205,
  reducedMotion,
  badge,
  onPoke,
  liquidFillPct,
  liquidLabel,
}: StageProps) {
  const [jumping, setJumping] = useState(false)
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
    onPoke?.()
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
    setTimeout(() => setJumping(false), 650)
  }

  const hasLiquid = typeof liquidFillPct === 'number'
  const clampedFill = hasLiquid ? Math.max(0, Math.min(100, liquidFillPct)) : 100
  // Visual fill maps 0% -> 4% (so a tiny puddle at the hooves is visible even at >0) and 100% -> 100%
  const visualFill = clampedFill <= 0 ? 0 : Math.max(8, Math.min(100, clampedFill))

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
      style={{ height: spriteHeight + 55, perspective: 900 }}
    >
      {/* LAYER 1: Drifting Clouds & Floating Ambient Particles */}
      <motion.div style={{ x: bgShiftX }} className="pointer-events-none absolute inset-0">
        {theme !== 'galaxy' && (
          <>
            <motion.div
              className="absolute -left-4 top-3 w-36 opacity-90"
              animate={reducedMotion ? undefined : { x: [0, 18, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FluffyCloud />
            </motion.div>
            <motion.div
              className="absolute -right-6 top-6 w-40 opacity-85"
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
            : theme === 'galaxy'
              ? ['✨', '⭐', '🪙', '✨']
              : ['✨', '🪙', '💗', '✨']
          ).map((em, idx) => (
            <motion.span
              key={idx}
              aria-hidden
              className="absolute text-lg drop-shadow"
              style={{ left: `${12 + idx * 24}%`, top: `${18 + (idx % 2) * 16}%` }}
              animate={{ y: [0, -14, 0], scale: [0.9, 1.15, 0.9], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.6 + idx * 0.5, repeat: Infinity, delay: idx * 0.4 }}
            >
              {em}
            </motion.span>
          ))}
      </motion.div>

      {/* LAYER 2: 3D Ground */}
      {(theme === 'meadow' || theme === 'romantic') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <GrassyHillsSVG variant={theme === 'romantic' ? 'pink' : 'green'} />
        </div>
      )}

      {/* LAYER 3: Dynamic 3D Contact Shadow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 h-6 -translate-x-1/2 rounded-[50%] bg-[#1e1b4b]/25 blur-[3px]"
        style={{ width: spriteHeight * 0.78 }}
        animate={
          reducedMotion
            ? undefined
            : jumping
              ? { scaleX: [1, 0.65, 1.08, 1], opacity: [0.28, 0.12, 0.32, 0.28] }
              : { scaleX: [1, 0.93, 1], opacity: [0.26, 0.2, 0.26] }
        }
        transition={{ duration: jumping ? 0.6 : 2.6, repeat: jumping ? 0 : Infinity, ease: 'easeInOut' }}
      />

      {/* LAYER 4: Separated 3D Cutout Mascot (Translucent Glass + Sloshing Liquid Water Fill when hasLiquid=true) */}
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
                    y: [0, -34, 4, 0],
                    scaleX: [1, 0.92, 1.08, 1],
                    scaleY: [1, 1.08, 0.92, 1],
                    rotateZ: [0, -4, 4, 0],
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
                filter: 'drop-shadow(0 14px 18px rgba(30, 27, 75, 0.26))',
              }}
              className="block select-none object-contain"
              draggable={false}
            />
          ) : (
            <div
              className="relative select-none"
              style={{
                height: spriteHeight,
                filter: 'drop-shadow(0 14px 20px rgba(30, 27, 75, 0.28))',
              }}
            >
              {/* 4A. Translucent Crystal Glass Piggy Shell (Unfilled portion looks like frosted clear crystal glass!) */}
              <img
                src={spriteSrc}
                alt={alt}
                style={{
                  height: spriteHeight,
                  width: 'auto',
                  opacity: 0.36,
                  filter: 'saturate(0.15) brightness(1.22) contrast(1.12)',
                }}
                className="block select-none object-contain"
                draggable={false}
              />

              {/* 4B. Vibrant Full-Color 3D Pig Revealed from Bottom to Top by the Rising Water Level */}
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
                    filter: 'saturate(1.2) contrast(1.04)',
                  }}
                  className="block select-none object-contain"
                  draggable={false}
                />
              </motion.div>

              {/* 4C. Sloshing Liquid Water Waves & Rising Bubbles Masked Strictly to the Pig's Exact 3D Silhouette! */}
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
                {/* Glass rim specular reflection on top of the crystal pig */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.22) 100%)',
                  }}
                />

                {/* Rising Liquid Column */}
                {visualFill > 0 && (
                  <motion.div
                    className="absolute inset-x-0 bottom-0"
                    initial={{ height: '0%' }}
                    animate={{ height: `${visualFill}%` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                  >
                    {/* Back Wave (slower, deeper rose-pink/gold water) */}
                    <motion.svg
                      viewBox="0 0 400 28"
                      preserveAspectRatio="none"
                      className="absolute -top-[18px] left-0 h-[20px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
                    >
                      <path
                        d="M0 14 Q 50 0 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                        fill="rgba(244, 63, 94, 0.55)"
                      />
                    </motion.svg>

                    {/* Front Sloshing Wave (brighter glossy water surface meniscus) */}
                    <motion.svg
                      viewBox="0 0 400 28"
                      preserveAspectRatio="none"
                      className="absolute -top-[15px] left-0 h-[18px] w-[200%]"
                      animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                      transition={{ duration: 2.3, repeat: Infinity, ease: 'linear' }}
                    >
                      <path
                        d="M0 14 Q 50 28 100 14 T 200 14 T 300 14 T 400 14 L 400 28 L 0 28 Z"
                        fill="rgba(255, 255, 255, 0.72)"
                      />
                    </motion.svg>

                    {/* Liquid body tint & Rising Bubbles inside the water */}
                    <div
                      className="relative h-full w-full overflow-hidden"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,110,160,0.28) 0%, rgba(255,61,119,0.22) 60%, rgba(250,204,21,0.25) 100%)',
                      }}
                    >
                      {!reducedMotion &&
                        [18, 36, 54, 72, 84].map((leftPct, bIdx) => (
                          <motion.span
                            key={bIdx}
                            className="absolute bottom-1 rounded-full bg-white/75 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                            style={{
                              left: `${leftPct}%`,
                              width: 5 + (bIdx % 3) * 3,
                              height: 5 + (bIdx % 3) * 3,
                            }}
                            animate={{
                              y: [0, -spriteHeight * (visualFill / 100)],
                              x: [0, bIdx % 2 === 0 ? 6 : -6, 0],
                              opacity: [0, 0.9, 0],
                            }}
                            transition={{
                              duration: 1.8 + bIdx * 0.35,
                              repeat: Infinity,
                              delay: bIdx * 0.4,
                              ease: 'easeIn',
                            }}
                          />
                        ))}
                    </div>
                  </motion.div>
                )}

                {/* Floating Water Level Percentage Pill right on the pig's belly */}
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full border border-white/90 bg-white/85 px-2.5 py-0.5 text-[11px] font-black text-[#e11d48] shadow-md backdrop-blur-sm">
                    💧 {liquidLabel ?? `Tháng này: ${clampedFill.toFixed(0)}%`}
                  </span>
                </div>
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
