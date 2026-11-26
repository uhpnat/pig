import { motion, type TargetAndTransition } from 'framer-motion'
import { useId } from 'react'
import { pigStage } from '@/domain/stats'
import type { PigConfig } from '@/domain/types'

export type PigMood = 'idle' | 'happy' | 'eating' | 'dancing' | 'sleeping' | 'celebrating' | 'coin' | 'milestone'

export const PIG_STYLES: { id: PigConfig['style']; label: string; emoji: string }[] = [
  { id: 'baby', label: 'Heo con hồng', emoji: '🍼' },
  { id: 'round', label: 'Heo tròn', emoji: '⚪' },
  { id: 'glasses', label: 'Heo đeo kính', emoji: '🕶️' },
  { id: 'crown', label: 'Heo vương miện', emoji: '👑' },
  { id: 'hat', label: 'Heo đội mũ', emoji: '🎩' },
  { id: 'hoodie', label: 'Heo mặc hoodie', emoji: '🧥' },
]
export const PIG_COLORS = ['#ffb3c1', '#ffc9a8', '#ffe08a', '#bde8c8', '#b9d8ff', '#d6c4ff']
export const PIG_BACKGROUNDS: { id: PigConfig['background']; label: string; css: string }[] = [
  { id: 'sky', label: 'Bầu trời', css: 'linear-gradient(180deg,#9fd8ff,#e8f9d9)' },
  { id: 'garden', label: 'Vườn hoa', css: 'linear-gradient(180deg,#d9f7c8,#fff0c9)' },
  { id: 'sunset', label: 'Hoàng hôn', css: 'linear-gradient(180deg,#ffc2d6,#ffe8c2)' },
  { id: 'night', label: 'Đêm sao', css: 'linear-gradient(180deg,#4a3d9a,#9a86e8)' },
]

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`
}

const MOODS: Record<PigMood, { body: TargetAndTransition; dur: number }> = {
  idle: { body: { y: [0, -5, 0] }, dur: 2.6 },
  happy: { body: { y: [0, -10, 0], rotate: [0, -3, 3, 0] }, dur: 1.2 },
  eating: { body: { scaleY: [1, 0.94, 1.03, 1], y: [0, 2, -3, 0] }, dur: 0.7 },
  dancing: { body: { rotate: [-6, 6, -6], y: [0, -8, 0] }, dur: 0.8 },
  sleeping: { body: { scale: [1, 1.025, 1] }, dur: 3.2 },
  celebrating: { body: { y: [0, -18, 0], rotate: [-5, 5, -5] }, dur: 0.65 },
  coin: { body: { scale: [1, 1.08, 1], y: [0, -6, 0] }, dur: 0.6 },
  milestone: { body: { y: [0, -22, 0], scale: [1, 1.1, 1] }, dur: 0.9 },
}

interface Props {
  config: Pick<PigConfig, 'style' | 'color' | 'name'>
  /** 0-100; only drives the cosmetic growth stage */
  progress?: number
  mood?: PigMood
  size?: number
  reducedMotion?: boolean
  className?: string
}

/**
 * Pure presentational mascot. Swap this component (or render a sprite sheet / Lottie inside it)
 * to upgrade artwork – no financial logic lives here.
 */
export function Pig({ config, progress = 0, mood = 'idle', size = 200, reducedMotion, className }: Props) {
  const gid = useId().replace(/:/g, '')
  const stage = pigStage(progress)
  const gold = stage.index >= 4
  const body = gold ? '#ffd36b' : config.color
  const snout = shade(body, -0.12)
  const ear = shade(body, -0.08)
  const scale = (config.style === 'baby' ? 0.82 : 0.9) + Math.min(progress, 100) / 700 + (config.style === 'round' ? 0.06 : 0)
  const rx = config.style === 'round' ? 76 : 72
  const sleeping = mood === 'sleeping'
  const m = MOODS[mood]
  const showCrown = config.style === 'crown' || gold
  const acc = stage.index >= 3 && config.style === 'baby' // growth reward: baby pig gets a bow at 50%

  return (
    <motion.svg width={size} height={size * 0.9} viewBox="0 0 200 180" role="img" aria-label={`${config.name} – ${stage.label}`} className={className} style={{ filter: 'drop-shadow(0 10px 8px rgba(120,60,100,.3))', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`sh${gid}`} cx=".38" cy=".3" r=".8"><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#c8407a" stopOpacity=".4" /></radialGradient>
      </defs>
      <ellipse cx="100" cy="166" rx="60" ry="8" fill="#7a4a80" opacity=".22" />
      <motion.g style={{ originX: '100px', originY: '150px' }} animate={reducedMotion ? undefined : m.body} transition={{ duration: m.dur, repeat: Infinity, ease: 'easeInOut' }}>
        <g transform={`translate(100 95) scale(${scale}) translate(-100 -95)`}>
          <polygon points="48,52 70,22 90,50" fill={ear} />
          <polygon points="152,52 130,22 110,50" fill={ear} />
          {config.style === 'hoodie' && <ellipse cx="100" cy="148" rx="68" ry="32" fill="#8ec5ff" />}
          <ellipse cx="100" cy="100" rx={rx} ry="62" fill={body} />
          <ellipse cx="100" cy="100" rx={rx} ry="62" fill={`url(#sh${gid})`} />
          <ellipse cx="72" cy="62" rx="26" ry="11" fill="#fff" opacity=".55" transform="rotate(-28 72 62)" />
          <rect x="88" y="40" width="24" height="5" rx="2" fill="#a0476a" />
          <ellipse cx="100" cy="114" rx="27" ry="19" fill={snout} />
          <ellipse cx="92" cy="106" rx="10" ry="4" fill="#fff" opacity=".45" />
          <ellipse cx="91" cy="114" rx="4" ry="6" fill="#a0476a" />
          <ellipse cx="109" cy="114" rx="4" ry="6" fill="#a0476a" />
          {sleeping ? (
            <g stroke="#3b2a4a" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M62 94q8 7 16 0" /><path d="M122 94q8 7 16 0" /></g>
          ) : (
            <g>
              <circle cx="70" cy="92" r="7" fill="#3b2a4a" /><circle cx="130" cy="92" r="7" fill="#3b2a4a" />
              <circle cx="72" cy="89" r="2.5" fill="#fff" /><circle cx="132" cy="89" r="2.5" fill="#fff" />
            </g>
          )}
          <circle cx="50" cy="108" r="9" fill="#ff8fa3" opacity=".6" /><circle cx="150" cy="108" r="9" fill="#ff8fa3" opacity=".6" />
          {(mood === 'happy' || mood === 'celebrating' || mood === 'milestone') && <path d="M88 134q12 10 24 0" stroke="#a0476a" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
          {config.style === 'glasses' && <g fill="none" stroke="#6a4cd8" strokeWidth="4"><circle cx="70" cy="92" r="16" /><circle cx="130" cy="92" r="16" /><path d="M86 92h28" /></g>}
          {showCrown && <polygon points="74,44 78,14 92,32 100,8 108,32 122,14 126,44" fill="#ffc83d" stroke="#e29b00" strokeWidth="3" />}
          {config.style === 'hat' && !gold && <g><ellipse cx="100" cy="44" rx="48" ry="9" fill="#5b8def" /><path d="M68 44q4-34 32-34t32 34z" fill="#7aa5ff" /></g>}
          {acc && <g><circle cx="132" cy="48" r="9" fill="#ff5c85" /><circle cx="152" cy="52" r="9" fill="#ff5c85" /><circle cx="142" cy="50" r="5" fill="#ffd36b" /></g>}
          {config.style === 'baby' && !acc && <circle cx="100" cy="30" r="13" fill="#ffc83d" stroke="#e29b00" strokeWidth="3" />}
        </g>
      </motion.g>
      {sleeping && <motion.text x="150" y="40" fontSize="22" fontWeight="900" fill="#8f7cf0" animate={reducedMotion ? undefined : { y: [40, 24], opacity: [1, 0] }} transition={{ duration: 2, repeat: Infinity }}>Z z</motion.text>}
      {(mood === 'coin' || mood === 'eating') && !reducedMotion && (
        <motion.circle cx="100" cy="0" r="11" fill="#ffd36b" stroke="#e29b00" strokeWidth="3" animate={{ cy: [-10, 80], opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} />
      )}
    </motion.svg>
  )
}
