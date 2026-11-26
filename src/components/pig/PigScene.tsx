import { motion } from 'framer-motion'
import { pigStage } from '@/domain/stats'
import type { PigConfig } from '@/domain/types'
import { Pig, PIG_BACKGROUNDS, type PigMood } from './Pig'

const MILESTONE_SKY: Record<number, string> = {
  0: '', 1: '', 2: '', 3: 'linear-gradient(180deg,#ffd9a8,#ffe9f1)', 4: 'linear-gradient(180deg,#ffe58a,#fff3d6)', 5: 'linear-gradient(180deg,#b79cff,#ffd9ea)',
}

/** Environment that grows with milestones. Floating coins/hearts are decorative. */
export function PigScene({ pig, progress, mood = 'idle', reducedMotion, height = 230 }: { pig: PigConfig; progress: number; mood?: PigMood; reducedMotion?: boolean; height?: number }) {
  const st = pigStage(progress)
  const base = PIG_BACKGROUNDS.find((b) => b.id === pig.background)!.css
  const bg = pig.background === 'sky' && MILESTONE_SKY[st.index] ? MILESTONE_SKY[st.index] : base
  const night = pig.background === 'night'
  const floats = ['🪙', '💗', '🪙', '✨', '🪙']
  return (
    <div className="relative overflow-hidden rounded-[36px] border-[3px] border-white shadow-[0_18px_34px_rgba(100,160,255,.3)]" style={{ height, background: bg }}>
      <div className="absolute inset-x-[-10%] bottom-[-30px] h-24 rounded-[50%]" style={{ background: night ? '#5a4aa8' : '#8fd36a' }} />
      {st.index >= 3 && <span className="absolute left-5 top-6 text-2xl" aria-hidden>🌈</span>}
      {st.index >= 5 && <span className="absolute right-5 top-4 text-3xl" aria-hidden>🎆</span>}
      {st.index >= 5 && <span className="absolute bottom-3 right-6 text-4xl" aria-hidden>💎</span>}
      {!reducedMotion && floats.map((e, i) => (
        <motion.span key={i} aria-hidden className="absolute text-xl" style={{ left: `${10 + i * 19}%`, top: '60%' }}
          animate={{ y: [0, -70 - i * 8, 0], opacity: [0, 1, 0] }} transition={{ duration: 4 + i * 0.7, repeat: Infinity, delay: i * 0.6 }}>{e}</motion.span>
      ))}
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <Pig config={pig} progress={progress} mood={mood} size={190} reducedMotion={reducedMotion} />
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#6a4cd8]">{st.label}</span>
    </div>
  )
}
