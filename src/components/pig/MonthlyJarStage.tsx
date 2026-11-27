import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui'
import {
  GrassyHillsSVG,
  StageParticles,
  StageSpeechBubble,
  useBurstParticles,
  useStageTilt,
  type MemberStageStat,
} from './StagePrimitives'

interface MonthlyJarStageProps {
  monthLabel: string
  fillPct: number
  savedAmount: number
  memberMale: MemberStageStat
  memberFemale: MemberStageStat
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
  const [drops, setDrops] = useState<DropParticle[]>([])
  const lastBurstRef = useRef<number | undefined>(coinBurstKey)

  const { rotateX, rotateY, handlePointerMove, handlePointerLeave } = useStageTilt(reducedMotion)
  const { bursts, spawnBursts } = useBurstParticles(['💧', '✨', '🪙', '💙'])

  const clampedFill = Math.max(0, Math.min(100, fillPct))

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
    spawnBursts(5)
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
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="h-[240px] w-[280px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(56,189,248,0.32) 52%, rgba(52,211,153,0.18) 85%, transparent 100%)',
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <GrassyHillsSVG variant="green" heightClass="h-[95px]" />
        </div>

        <StageSpeechBubble text={currentQuote} />

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
          {(
            [
              { stat: memberMale, side: '-left-[86px] sm:-left-[98px]', y: [-3, 4, -3], ring: 'ring-sky-400', text: 'text-sky-900', pill: 'bg-sky-100 text-sky-700', shadow: 'shadow-[0_8px_20px_rgba(14,165,233,0.18)]' },
              { stat: memberFemale, side: '-right-[86px] sm:-right-[98px]', y: [4, -3, 4], ring: 'ring-pink-400', text: 'text-pink-900', pill: 'bg-pink-100 text-pink-700', shadow: 'shadow-[0_8px_20px_rgba(244,63,94,0.18)]' },
            ] as const
          ).map((item, idx) => (
            <motion.div
              key={idx}
              animate={reducedMotion ? undefined : { y: [...item.y] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className={`absolute ${item.side} top-1/2 z-20 -translate-y-1/2`}
            >
              <div className={`flex flex-col items-center rounded-2xl border-2 border-white bg-white/92 px-2.5 py-1.5 text-center ${item.shadow} backdrop-blur-md`}>
                <Avatar value={item.stat.avatar} size={30} className={`ring-2 ${item.ring}`} />
                <span className={`mt-1 max-w-[60px] truncate text-[10px] font-black ${item.text}`}>
                  {item.stat.name}
                </span>
                <span className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black tabular-nums ${item.pill}`}>
                  {item.stat.pct.toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}

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
            {/* Jar Lid */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="h-3 w-20 rounded-t-xl border-2 border-white bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-sm">
                <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-amber-800/45" />
              </div>
              <div className="h-2.5 w-[112px] rounded-full border-2 border-white bg-gradient-to-b from-white to-sky-100 shadow-sm" />
            </div>

            {/* Jar Glass Body */}
            <div
              className="relative -mt-0.5 h-[188px] w-[158px] overflow-hidden rounded-[36px] border-[3px] border-white/95 shadow-[0_14px_34px_rgba(14,165,233,0.24),inset_0_4px_16px_rgba(255,255,255,0.9)]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(224,242,254,0.38) 55%, rgba(255,255,255,0.58) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {[25, 50, 75].map((tick) => (
                <div
                  key={tick}
                  className="pointer-events-none absolute right-2.5 z-20 flex items-center gap-1"
                  style={{ bottom: `${tick}%` }}
                >
                  <span className="h-[1.5px] w-2.5 rounded-full bg-slate-400/45" />
                </div>
              ))}

              {waterHeightPct > 0 && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 overflow-hidden"
                  initial={{ height: '0%' }}
                  animate={{ height: `${waterHeightPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
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

                  <div
                    className="absolute inset-x-0 bottom-0 top-[9px]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(56,189,248,0.92) 0%, rgba(14,165,233,0.94) 55%, rgba(2,132,199,0.98) 100%)',
                    }}
                  />

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

              <div
                aria-hidden
                className="pointer-events-none absolute bottom-4 left-2.5 top-4 w-3 rounded-full bg-gradient-to-b from-white/75 via-white/30 to-white/10"
              />
            </div>

            <div aria-hidden className="mt-1.5 h-3.5 w-32 rounded-[50%] bg-sky-900/20 blur-[3px]" />
          </motion.div>
        </div>

        <StageParticles bursts={bursts} />
      </div>
    </div>
  )
}
