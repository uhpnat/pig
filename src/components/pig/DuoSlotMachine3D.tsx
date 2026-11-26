import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Journey, MemberId } from '@/domain/types'
import { IMG } from '@/lib/assets'

interface Props {
  journey: Journey
  rolling: boolean
  revealed: boolean
  amounts: Record<MemberId, number>
  reducedMotion?: boolean
  onPullLever?: () => void
}

/**
 * Interactive 3D Piggy Duo Slot / Capsule Machine (Full-Width Hero Scale):
 * - Top: Large 3D cutout Pig Mascot sitting on the golden-trimmed 3D arcade crown with flashing bulbs!
 * - Center: Twin 3D glass reels side-by-side (left reel for Person A in sky-blue, right reel for Person B in rose-pink),
 *   with large spinning 3D coin & number drums when rolling!
 * - Right side: A 3D golden ball-top Lever that pulls down when rolling starts!
 * - Bottom: Golden coin chute that spits out coins when amounts are revealed!
 */
export function DuoSlotMachine3D({
  journey,
  rolling,
  revealed,
  amounts,
  reducedMotion,
  onPullLever,
}: Props) {
  const bulbs = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <div className="relative mx-auto w-full max-w-[415px] select-none pl-1.5 pr-4 pt-2 pb-1">
      {/* Ambient glowing aura behind the 3D machine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-6 bottom-2 rounded-full bg-gradient-to-b from-[#f472b6]/45 via-[#a855f7]/40 to-[#fde047]/40 blur-2xl"
      />

      {/* TOP MASCOT: Large Cutout 3D Pig sitting centered on top of the Slot Machine Crown */}
      <motion.div
        className="pointer-events-none relative z-20 -mb-8 flex justify-center"
        animate={
          reducedMotion
            ? undefined
            : rolling
              ? { y: [0, -12, 0], scaleX: [1, 1.07, 0.94, 1], scaleY: [1, 0.93, 1.07, 1] }
              : { y: [0, -6, 0] }
        }
        transition={{ duration: rolling ? 0.38 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={IMG.spriteHero}
          alt={journey.pig.name}
          className="h-[152px] w-auto object-contain"
          style={{ filter: 'drop-shadow(0 12px 18px rgba(30, 10, 80, 0.38))' }}
        />
      </motion.div>

      {/* MAIN 3D ARCADE CABINET + RIGHT-HAND 3D LEVER */}
      <div className="relative mx-auto w-full">
        {/* 3D Slot Machine Body */}
        <motion.div
          animate={
            reducedMotion || !rolling
              ? undefined
              : {
                  y: [0, -2.5, 2.5, -1.5, 0],
                  rotateZ: [0, -0.7, 0.7, -0.4, 0],
                }
          }
          transition={{ duration: 0.28, repeat: Infinity }}
          className="relative z-10 w-full rounded-[36px] border-[4px] border-[#fde047] p-4 shadow-[0_24px_48px_rgba(30,10,90,.48),inset_0_4px_0_rgba(255,255,255,.55),inset_0_-8px_16px_rgba(60,20,140,.45)]"
          style={{
            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 48%, #5b21b6 100%)',
          }}
        >
          {/* Top Marquee Light Bulbs */}
          <div className="mb-3 flex items-center justify-around rounded-full bg-[#3b0764]/65 px-4 py-2 shadow-inner">
            {bulbs.map((b) => (
              <motion.span
                key={b}
                className="h-3 w-3 rounded-full"
                style={{
                  background: b % 2 === 0 ? '#fde047' : '#ff5c8a',
                  boxShadow: b % 2 === 0 ? '0 0 10px #fde047' : '0 0 10px #ff5c8a',
                }}
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: rolling ? [0.3, 1, 0.3] : [0.65, 1, 0.65],
                        scale: rolling ? [0.85, 1.3, 0.85] : 1,
                      }
                }
                transition={{
                  duration: rolling ? 0.35 : 1.4,
                  repeat: Infinity,
                  delay: (b % 2) * 0.18,
                }}
              />
            ))}
          </div>

          {/* TWIN 3D GLASS REEL WINDOWS (Left: Member A, Right: Member B) */}
          <div className="grid grid-cols-2 gap-3 rounded-[26px] bg-[#2e1065]/80 p-3 shadow-[inset_0_4px_12px_rgba(0,0,0,.48)]">
            {(['a', 'b'] as const).map((k, idx) => {
              const m = journey.members[k]
              const isA = idx === 0
              const accent = isA ? '#2563eb' : '#e11d48'
              const pillBg = isA ? 'from-[#dbeafe] to-[#eff6ff]' : 'from-[#fce7f3] to-[#fff1f2]'
              const borderCol = isA ? 'border-[#93c5fd]' : 'border-[#f9a8d4]'

              return (
                <div
                  key={k}
                  className={`relative overflow-hidden rounded-[22px] border-2 ${borderCol} bg-gradient-to-b ${pillBg} px-3 pb-3.5 pt-3 text-center shadow-[inset_0_3px_6px_rgba(255,255,255,.92),0_6px_14px_rgba(0,0,0,.24)]`}
                >
                  {/* 3D Curved Drum Cylindrical Shading Overlay */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(30,27,75,0.14) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 76%, rgba(30,27,75,0.16) 100%)',
                    }}
                  />

                  {/* Member Avatar + Name Header inside Reel */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="rounded-full border-2 border-white bg-white p-1 shadow-md">
                      <Avatar value={m.avatar} size={62} />
                    </div>
                    <span
                      className="mt-1.5 max-w-full truncate rounded-full bg-white/95 px-3 py-0.5 text-xs font-black shadow-sm"
                      style={{ color: accent }}
                    >
                      {m.name}
                    </span>
                  </div>

                  {/* 3D Spinning Number Drum Window */}
                  <div className="relative z-10 mt-2.5 flex h-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white/95 px-2 shadow-inner">
                    <motion.div
                      key={rolling ? `roll-${amounts[k]}` : revealed ? `rev-${amounts[k]}` : 'idle'}
                      initial={rolling && !reducedMotion ? { y: -22, opacity: 0.5 } : revealed ? { scale: 0.7 } : false}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: rolling ? 0.07 : 0.3, type: revealed && !rolling ? 'spring' : 'tween' }}
                      className="truncate text-[19px] font-black tabular-nums tracking-tight"
                      style={{ color: accent }}
                    >
                      {rolling || revealed ? `+${vnd(amounts[k])}` : '🪙 ??? 🪙'}
                    </motion.div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Golden Coin Tray / Dispenser Slot */}
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#3b0764]/75 px-4 py-2 text-xs font-black text-[#fde047] shadow-inner">
            <span>🎰 QUAY ĐÔI CÔNG BẰNG</span>
            <span>
              {rolling
                ? 'ĐANG QUAY...'
                : revealed
                  ? `TỔNG: +${vnd(amounts.a + amounts.b)}`
                  : '1 LẦN / NGÀY'}
            </span>
          </div>
        </motion.div>

        {/* RIGHT-SIDE 3D GOLDEN SLOT LEVER */}
        <button
          type="button"
          onClick={onPullLever}
          disabled={rolling}
          aria-label="Kéo cần gạt quay số"
          className="absolute -right-4 top-1/2 z-20 flex h-36 w-8 -translate-y-1/2 cursor-pointer flex-col items-center justify-start border-0 bg-transparent p-0 focus:outline-none"
        >
          {/* Lever Mount Hinge attached to the right wall of the cabinet */}
          <span className="absolute bottom-7 left-0 h-8 w-3.5 rounded-r-lg border border-[#fde047] bg-gradient-to-b from-[#c084fc] to-[#6b21a8] shadow-md" />
          {/* Animated Arm + 3D Red/Gold Ball */}
          <motion.div
            animate={
              rolling
                ? { rotateX: [0, 55, 0], y: [0, 32, 0] }
                : { y: [0, -4, 0] }
            }
            transition={{ duration: rolling ? 0.55 : 2.2, repeat: rolling ? 0 : Infinity }}
            className="ml-2 flex flex-col items-center"
          >
            {/* 3D Glossy Ball Handle */}
            <span
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow-[0_6px_14px_rgba(225,29,72,.5)]"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ffe4e6 0%, #fb7185 35%, #e11d48 100%)',
              }}
            >
              <span className="h-2 w-2 -translate-x-0.5 -translate-y-0.5 rounded-full bg-white/80" />
            </span>
            {/* Metallic Lever Shaft */}
            <span className="-mt-1 h-16 w-2.5 rounded-full bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#b45309] shadow" />
          </motion.div>
        </button>
      </div>
    </div>
  )
}
