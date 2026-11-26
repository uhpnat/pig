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
 * Interactive 3D Piggy Duo Slot / Capsule Machine:
 * - Top: Cute 3D cutout Pig Mascot sitting on the golden-trimmed 3D arcade crown with flashing bulbs!
 * - Center: Twin 3D glass reels side-by-side (left reel for Person A in sky-blue, right reel for Person B in rose-pink),
 *   with spinning 3D coin & number drums when rolling!
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
  const bulbs = [0, 1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="relative mx-auto mt-1 w-full max-w-[360px] select-none px-2 pt-10 pb-2">
      {/* Ambient glowing aura behind the 3D machine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-10 bottom-4 rounded-full bg-gradient-to-b from-[#f472b6]/40 via-[#a855f7]/35 to-[#fde047]/35 blur-2xl"
      />

      {/* TOP MASCOT: Cutout 3D Pig sitting on top of the Slot Machine Crown */}
      <motion.div
        className="pointer-events-none relative z-20 -mb-7 flex justify-center"
        animate={
          reducedMotion
            ? undefined
            : rolling
              ? { y: [0, -10, 0], scaleX: [1, 1.06, 0.95, 1], scaleY: [1, 0.94, 1.06, 1] }
              : { y: [0, -5, 0] }
        }
        transition={{ duration: rolling ? 0.38 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={IMG.spriteHero}
          alt={journey.pig.name}
          className="h-[115px] w-auto object-contain"
          style={{ filter: 'drop-shadow(0 10px 14px rgba(30, 10, 80, 0.35))' }}
        />
      </motion.div>

      {/* MAIN 3D ARCADE CABINET + RIGHT-HAND 3D LEVER */}
      <div className="relative flex items-center justify-center">
        {/* 3D Slot Machine Body */}
        <motion.div
          animate={
            reducedMotion || !rolling
              ? undefined
              : {
                  y: [0, -2, 2, -1, 0],
                  rotateZ: [0, -0.7, 0.7, -0.4, 0],
                }
          }
          transition={{ duration: 0.28, repeat: Infinity }}
          className="relative z-10 w-full rounded-[34px] border-[3.5px] border-[#fde047] p-3.5 shadow-[0_20px_40px_rgba(30,10,90,.45),inset_0_4px_0_rgba(255,255,255,.55),inset_0_-8px_16px_rgba(60,20,140,.45)]"
          style={{
            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 48%, #5b21b6 100%)',
          }}
        >
          {/* Top Marquee Light Bulbs */}
          <div className="mb-2.5 flex items-center justify-around rounded-full bg-[#3b0764]/60 px-3 py-1.5 shadow-inner">
            {bulbs.map((b) => (
              <motion.span
                key={b}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: b % 2 === 0 ? '#fde047' : '#ff5c8a',
                  boxShadow: b % 2 === 0 ? '0 0 8px #fde047' : '0 0 8px #ff5c8a',
                }}
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: rolling ? [0.3, 1, 0.3] : [0.65, 1, 0.65],
                        scale: rolling ? [0.85, 1.25, 0.85] : 1,
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
          <div className="grid grid-cols-2 gap-2.5 rounded-[24px] bg-[#2e1065]/75 p-2.5 shadow-[inset_0_4px_10px_rgba(0,0,0,.45)]">
            {(['a', 'b'] as const).map((k, idx) => {
              const m = journey.members[k]
              const isA = idx === 0
              const accent = isA ? '#2563eb' : '#e11d48'
              const pillBg = isA ? 'from-[#dbeafe] to-[#eff6ff]' : 'from-[#fce7f3] to-[#fff1f2]'
              const borderCol = isA ? 'border-[#93c5fd]' : 'border-[#f9a8d4]'

              return (
                <div
                  key={k}
                  className={`relative overflow-hidden rounded-[20px] border-2 ${borderCol} bg-gradient-to-b ${pillBg} px-2.5 pb-3 pt-2.5 text-center shadow-[inset_0_3px_6px_rgba(255,255,255,.9),0_6px_12px_rgba(0,0,0,.22)]`}
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
                    <div className="rounded-full border-2 border-white bg-white p-0.5 shadow-md">
                      <Avatar value={m.avatar} size={46} />
                    </div>
                    <span
                      className="mt-1 max-w-full truncate rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-black shadow-sm"
                      style={{ color: accent }}
                    >
                      {m.name}
                    </span>
                  </div>

                  {/* 3D Spinning Number Drum Window */}
                  <div className="relative z-10 mt-2 flex h-12 items-center justify-center overflow-hidden rounded-xl border border-white bg-white/95 px-1.5 shadow-inner">
                    <motion.div
                      key={rolling ? `roll-${amounts[k]}` : revealed ? `rev-${amounts[k]}` : 'idle'}
                      initial={rolling && !reducedMotion ? { y: -18, opacity: 0.5 } : revealed ? { scale: 0.7 } : false}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: rolling ? 0.07 : 0.3, type: revealed && !rolling ? 'spring' : 'tween' }}
                      className="truncate text-[16px] font-black tabular-nums tracking-tight"
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
          <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-[#3b0764]/70 px-3.5 py-1.5 text-[11px] font-black text-[#fde047] shadow-inner">
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

        {/* RIGHT-SIDE 3D GOLDEN SLOT LEVER (Pullable!) */}
        <button
          type="button"
          onClick={onPullLever}
          disabled={rolling}
          aria-label="Kéo cần gạt quay số"
          className="relative -ml-1.5 flex h-28 w-8 cursor-pointer flex-col items-center justify-start border-0 bg-transparent p-0 focus:outline-none"
        >
          {/* Lever Mount Hinge */}
          <span className="absolute bottom-6 left-0 h-7 w-3.5 rounded-r-lg border border-[#fde047] bg-gradient-to-b from-[#c084fc] to-[#6b21a8] shadow-md" />
          {/* Animated Arm + 3D Red/Gold Ball */}
          <motion.div
            animate={
              rolling
                ? { rotateX: [0, 55, 0], y: [0, 26, 0] }
                : { y: [0, -3, 0] }
            }
            transition={{ duration: rolling ? 0.55 : 2.2, repeat: rolling ? 0 : Infinity }}
            className="flex flex-col items-center"
          >
            {/* 3D Glossy Ball Handle */}
            <span
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow-[0_6px_14px_rgba(225,29,72,.5)]"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ffe4e6 0%, #fb7185 35%, #e11d48 100%)',
              }}
            >
              <span className="h-2 w-2 -translate-x-1 -translate-y-1 rounded-full bg-white/80" />
            </span>
            {/* Metallic Lever Shaft */}
            <span className="-mt-1 h-14 w-2 rounded-full bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#b45309] shadow" />
          </motion.div>
        </button>
      </div>
    </div>
  )
}
