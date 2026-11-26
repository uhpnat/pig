import { motion } from 'framer-motion'
import { pigStage } from '@/domain/stats'
import type { PigConfig } from '@/domain/types'
import { IMG } from '@/lib/assets'
import type { PigMood } from './Pig'

const STYLE_BADGE: Record<PigConfig['style'], string> = {
  crown: IMG.t0,
  baby: IMG.t0,
  round: IMG.t1,
  glasses: IMG.t2,
  hat: IMG.t1,
  hoodie: IMG.t3,
}

/**
 * 3D illustrated hero scene using the extracted 3D pig artwork (`hero.jpg`) + animated coins, hearts, and stage badge.
 */
export function PigScene({
  pig,
  progress,
  mood = 'idle',
  reducedMotion,
}: {
  pig: PigConfig
  progress: number
  mood?: PigMood
  reducedMotion?: boolean
  height?: number
}) {
  const st = pigStage(progress)
  const floats = ['🪙', '💗', '✨', '🪙']
  const styleThumb = STYLE_BADGE[pig.style] || IMG.t0

  return (
    <div className="relative overflow-hidden rounded-[34px] border-[3px] border-white shadow-[0_16px_32px_rgba(140,120,220,.28)]">
      <motion.img
        src={IMG.hero}
        alt={`${pig.name} – ${st.label}`}
        className="block w-full object-cover"
        animate={
          reducedMotion
            ? undefined
            : mood === 'celebrating' || mood === 'happy'
              ? { scale: [1, 1.03, 1], y: [0, -3, 0] }
              : { scale: [1, 1.012, 1] }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {!reducedMotion &&
        floats.map((e, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute text-lg drop-shadow"
            style={{ left: `${14 + i * 22}%`, top: '52%' }}
            animate={{ y: [0, -52 - i * 6, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 3.6 + i * 0.6, repeat: Infinity, delay: i * 0.5 }}
          >
            {e}
          </motion.span>
        ))}

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1.5 pr-3 text-xs font-black text-[#1e1b4b] shadow-sm backdrop-blur-md">
        <img src={styleThumb} alt="" className="h-6 w-6 rounded-full object-cover" />
        <span>{pig.name} · {st.label}</span>
      </div>
    </div>
  )
}
