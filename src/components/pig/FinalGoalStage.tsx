import { motion } from 'framer-motion'
import { Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui'
import { vnd } from '@/domain/format'
import {
  StageParticles,
  StageSpeechBubble,
  useBurstParticles,
  useStageTilt,
  type MemberStageStat,
} from './StagePrimitives'

interface FinalGoalStageProps {
  journeyName: string
  goalAmount: number
  savedAmount: number
  progressPct: number
  memberMale: MemberStageStat
  memberFemale: MemberStageStat
  reducedMotion?: boolean
  onPoke?: () => void
}

const MILESTONES = [25, 50, 75, 100]

export function FinalGoalStage({
  journeyName,
  goalAmount,
  savedAmount,
  progressPct,
  memberMale,
  memberFemale,
  reducedMotion,
  onPoke,
}: FinalGoalStageProps) {
  const [jumping, setJumping] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)

  const { rotateX, rotateY, handlePointerMove, handlePointerLeave } = useStageTilt(reducedMotion)
  const { bursts, spawnBursts } = useBurstParticles(['✨', '💖', '🌟', '💎', '🎯'])

  const clampedPct = Math.max(0, Math.min(100, progressPct))
  const remaining = Math.max(0, goalAmount - savedAmount)

  const triggerCelebrate = () => {
    setJumping(true)
    onPoke?.()
    setQuoteIdx((q) => q + 1)
    spawnBursts(6)
    setTimeout(() => setJumping(false), 650)
  }

  const quotes = [
    remaining <= 0
      ? `🎉 Chúc mừng ${memberMale.name} & ${memberFemale.name} đã chạm đích ${vnd(goalAmount)}!`
      : `🎯 Còn ${vnd(remaining)} nữa là chạm đích "${journeyName}" rồi!`,
    `💎 Quả cầu ước mơ đã tích lũy được ${clampedPct.toFixed(1)}% chặng đường dài hạn!`,
    `✨ ${memberMale.name} (${memberMale.pct.toFixed(0)}%) & ${memberFemale.name} (${memberFemale.pct.toFixed(0)}%) cùng hướng về đích!`,
  ]
  const currentQuote = quotes[quoteIdx % quotes.length]

  const ringSize = 216
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clampedPct / 100)
  const globeWaterHeight = clampedPct <= 0 ? 0 : Math.max(12, Math.min(96, clampedPct))

  return (
    <div className="relative w-full select-none">
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={triggerCelebrate}
        role="button"
        tabIndex={0}
        aria-label={`Quả cầu mục tiêu ${journeyName} – ${clampedPct.toFixed(1)}%`}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerCelebrate()}
        className="relative flex h-[319px] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden px-4"
        style={{ perspective: 900 }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="h-[250px] w-[290px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(192,132,252,0.42) 0%, rgba(244,114,182,0.3) 50%, rgba(56,189,248,0.18) 80%, transparent 100%)',
            }}
          />
        </div>

        {!reducedMotion &&
          [
            { left: '12%', top: '20%', d: 0 },
            { left: '84%', top: '22%', d: 0.4 },
            { left: '18%', top: '72%', d: 0.8 },
            { left: '82%', top: '70%', d: 1.2 },
          ].map((s, idx) => (
            <motion.span
              key={idx}
              aria-hidden
              className="pointer-events-none absolute text-sm"
              style={{ left: s.left, top: s.top }}
              animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: s.d }}
            >
              ✨
            </motion.span>
          ))}

        <StageSpeechBubble text={currentQuote} />

        {/* CENTERPIECE: 3D Crystal Dream Globe + Circular Progress Ring + Orbiting Couple */}
        <div className="relative mt-6 flex items-center justify-center">
          {(
            [
              { stat: memberMale, side: '-left-[74px] sm:-left-[86px]', y: [-4, 5, -4], ring: 'ring-sky-400', text: 'text-sky-900', pill: 'bg-sky-100 text-sky-700', shadow: 'shadow-[0_8px_20px_rgba(14,165,233,0.22)]' },
              { stat: memberFemale, side: '-right-[74px] sm:-right-[86px]', y: [5, -4, 5], ring: 'ring-pink-400', text: 'text-pink-900', pill: 'bg-pink-100 text-pink-700', shadow: 'shadow-[0_8px_20px_rgba(244,63,94,0.22)]' },
            ] as const
          ).map((item, idx) => (
            <motion.div
              key={idx}
              animate={reducedMotion ? undefined : { y: [...item.y] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              className={`absolute ${item.side} top-1/2 z-20 -translate-y-1/2`}
            >
              <div className={`flex flex-col items-center rounded-2xl border-2 border-white bg-white/90 px-2 py-1.5 text-center ${item.shadow} backdrop-blur-md`}>
                <Avatar value={item.stat.avatar} size={32} className={`ring-2 ${item.ring}`} />
                <span className={`mt-1 max-w-[58px] truncate text-[10px] font-black ${item.text}`}>
                  {item.stat.name}
                </span>
                <span className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black tabular-nums ${item.pill}`}>
                  {item.stat.pct.toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}

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
                  ? { scale: [1, 1.09, 0.96, 1], y: [0, -14, 2, 0] }
                  : { y: [0, -5, 0] }
            }
            transition={
              jumping
                ? { duration: 0.55, ease: 'easeOut' }
                : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative flex items-center justify-center"
          >
            <svg width={ringSize} height={ringSize} className="-rotate-90 drop-shadow-[0_6px_18px_rgba(124,58,237,0.28)]">
              <defs>
                <linearGradient id="goal-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="url(#goal-ring-grad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>

            <div
              className="absolute flex flex-col items-center justify-center overflow-hidden rounded-full border-2 border-white/95 shadow-[inset_0_4px_18px_rgba(255,255,255,0.9),0_12px_28px_rgba(124,58,237,0.2)]"
              style={{
                width: ringSize - 28,
                height: ringSize - 28,
                background:
                  'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.96) 0%, rgba(245,243,255,0.88) 58%, rgba(252,231,243,0.92) 100%)',
              }}
            >
              {globeWaterHeight > 0 && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
                  initial={{ height: '0%' }}
                  animate={{ height: `${globeWaterHeight}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-0 h-[18px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 0 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(167, 139, 250, 0.55)"
                    />
                  </motion.svg>
                  <motion.svg
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    className="absolute left-0 top-[3px] h-[17px] w-[200%]"
                    animate={reducedMotion ? undefined : { x: ['-50%', '0%'] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: 'linear' }}
                  >
                    <path
                      d="M 0 16 Q 50 32 100 16 T 200 16 T 300 16 T 400 16 T 500 16 T 600 16 T 700 16 T 800 16 L 800 32 L 0 32 Z"
                      fill="rgba(244, 114, 182, 0.58)"
                    />
                  </motion.svg>
                  <div
                    className="absolute inset-x-0 bottom-0 top-[10px]"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(167,139,250,0.45) 0%, rgba(236,72,153,0.42) 100%)',
                    }}
                  />
                </motion.div>
              )}

              <div className="relative z-10 flex flex-col items-center px-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-violet-500 to-pink-500 text-2xl shadow-md">
                  {clampedPct >= 100 ? '🏆' : clampedPct >= 50 ? '🏰' : '💎'}
                </div>
                <p className="mt-1.5 text-[28px] font-black leading-none tracking-tight text-[#1e1b4b] tabular-nums drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                  {clampedPct.toFixed(1)}%
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-purple-700 shadow-sm">
                  <Target size={10} /> Mục tiêu cuối kỳ
                </span>
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.18) 100%)',
                }}
              />
            </div>
          </motion.div>
        </div>

        <div className="relative z-20 mt-3 flex items-center gap-1.5">
          {MILESTONES.map((m) => {
            const reached = clampedPct >= m
            return (
              <div
                key={m}
                className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-black transition-all ${
                  reached
                    ? 'border-amber-300 bg-amber-100 text-amber-800 shadow-sm'
                    : 'border-white/90 bg-white/75 text-slate-400'
                }`}
              >
                <Sparkles size={10} className={reached ? 'text-amber-500' : 'text-slate-300'} />
                <span>{m}%</span>
              </div>
            )
          })}
        </div>

        <StageParticles bursts={bursts} />
      </div>
    </div>
  )
}
