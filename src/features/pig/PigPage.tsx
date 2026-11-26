import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pencil, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import type { PigConfig } from '@/domain/types'

const PIG_AVATARS: { id: PigConfig['style']; label: string; thumb: string; sprite: string }[] = [
  { id: 'crown', label: 'Heo đồng xu vàng', thumb: IMG.t0, sprite: IMG.spriteHero },
  { id: 'round', label: 'Heo kính râm', thumb: IMG.t1, sprite: IMG.spriteShades },
  { id: 'glasses', label: 'Heo kính cận', thumb: IMG.t2, sprite: IMG.spriteGlasses },
  { id: 'hoodie', label: 'Heo áo hoodie', thumb: IMG.t3, sprite: IMG.spriteHoodie },
]

export default function PigPage() {
  const j = useJourney()
  const { repo, run, celebrate, toast } = useStore()
  const nav = useNavigate()
  const [pig, setPig] = useState<PigConfig>(j.pig)
  const idx = Math.max(0, PIG_AVATARS.findIndex((a) => a.id === pig.style))
  const current = PIG_AVATARS[idx] || PIG_AVATARS[0]

  const cycle = (dir: -1 | 1) => {
    const nextIdx = (idx + dir + PIG_AVATARS.length) % PIG_AVATARS.length
    setPig((p) => ({ ...p, style: PIG_AVATARS[nextIdx].id }))
  }

  const save = async () => {
    if (!pig.name.trim()) return toast('Hãy đặt tên cho heo nhé!', 'error')
    const ok = j.setupDone
      ? await run(repo.updateJourney({ pig: { ...pig, name: pig.name.trim() } }))
      : await run(repo.saveJourney({ ...j, pig: { ...pig, name: pig.name.trim() }, setupDone: true }))
    if (ok) {
      celebrate()
      nav(j.setupDone ? '/couple' : '/')
    }
  }

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col justify-between overflow-hidden px-5 pb-12"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 45%, #f5f3ff 78%, #dcfce7 100%)',
      }}
    >
      <div>
        {/* Top Back Arrow */}
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => nav(j.setupDone ? '/couple' : '/welcome')}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/70 text-[#1e1b4b] shadow-sm"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        {/* Title & Subtitle */}
        <h1 className="mt-2 text-center text-[26px] font-black tracking-tight text-[#172554]">
          Tạo heo của bạn
        </h1>
        <p className="mt-1 text-center text-[14px] font-extrabold text-[#3b4b75]">
          Chọn avatar và đặt tên cho heo nhé!
        </p>

        {/* Big Rounded 3D Pig Preview Frame with Left/Right Arrows & Edit Badge */}
        <div className="relative mx-auto mt-6 flex max-w-[320px] items-center justify-center">
          <button
            type="button"
            aria-label="Kiểu trước"
            onClick={() => cycle(-1)}
            className="absolute left-0 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 bg-white/85 text-[#1e1b4b] shadow-md transition-transform active:scale-90"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="relative grid h-[230px] w-[255px] place-items-center overflow-visible rounded-[46px] border-[4px] border-white bg-gradient-to-b from-[#d8ebff] via-[#eef5ff] to-[#dcfce7] shadow-[0_18px_36px_rgba(110,130,220,.32)]">
            {/* Dynamic 3D ground contact shadow */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-3 h-6 w-44 rounded-[50%] bg-[#1e1b4b]/22 blur-[3px]"
              animate={{ scaleX: [1, 0.9, 1], opacity: [0.24, 0.16, 0.24] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating cutout 3D pig sprite popping out of the frame */}
            <motion.img
              key={current.id}
              src={current.sprite}
              alt={current.label}
              initial={{ scale: 0.8, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: [0, -7, 0], opacity: 1 }}
              transition={{ y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, duration: 0.25 }}
              style={{ filter: 'drop-shadow(0 12px 16px rgba(30,27,75,.25))' }}
              className="relative z-10 h-[205px] w-auto select-none object-contain"
            />
          </div>

          <label
            htmlFor="pig-name-input"
            aria-label="Sửa tên heo"
            className="absolute bottom-2 right-12 z-20 grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-white bg-white text-[#1e1b4b] shadow-lg"
          >
            <Pencil size={18} strokeWidth={2.5} />
          </label>

          <button
            type="button"
            aria-label="Kiểu tiếp theo"
            onClick={() => cycle(1)}
            className="absolute right-0 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 bg-white/85 text-[#1e1b4b] shadow-md transition-transform active:scale-90"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* 4 Circular Avatar Thumbnails matching 02_pig_customization.png */}
        <div className="mt-6 flex items-center justify-center gap-3.5" role="radiogroup" aria-label="Chọn avatar heo">
          {PIG_AVATARS.map((a) => {
            const active = pig.style === a.id
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={a.label}
                onClick={() => setPig((p) => ({ ...p, style: a.id }))}
                className={`h-[70px] w-[70px] cursor-pointer overflow-hidden rounded-full border-[3.5px] bg-white p-0.5 transition-all ${
                  active
                    ? 'scale-105 border-[#d946ef] shadow-[0_8px_20px_rgba(217,70,239,.35)]'
                    : 'border-white opacity-90 shadow-md'
                }`}
              >
                <img src={a.thumb} alt={a.label} className="h-full w-full rounded-full object-cover" />
              </button>
            )
          })}
        </div>

        {/* Pill Input: User Icon + Pig Name + Heart */}
        <div className="mx-auto mt-6 flex max-w-[340px] items-center gap-3 rounded-full border-2 border-white bg-white/95 px-5 py-3.5 shadow-[0_10px_24px_rgba(140,150,220,.2)]">
          <User size={22} className="shrink-0 text-[#1e1b4b]" strokeWidth={2.3} />
          <input
            id="pig-name-input"
            value={pig.name}
            maxLength={24}
            onChange={(e) => setPig((p) => ({ ...p, name: e.target.value }))}
            placeholder="Heo Nhà Mình"
            className="min-w-0 flex-1 border-0 bg-transparent text-[17px] font-black text-[#1e1b4b] outline-none"
          />
          <span className="shrink-0 text-lg text-[#64748b]" aria-hidden>
            ♡
          </span>
        </div>

        {/* Big Glossy Pink Button: Xác nhận */}
        <div className="mx-auto mt-5 max-w-[340px]">
          <Button onClick={save} className="!py-4 !text-[18px]">
            Xác nhận
          </Button>
        </div>
      </div>

      {/* Grassy Meadow Footer matching mockup */}
      <div
        aria-hidden
        className="pointer-events-none -mx-5 -mb-12 mt-8 h-20 rounded-t-[50%] bg-gradient-to-b from-[#a3e635] to-[#65a30d] opacity-85 shadow-inner"
      />
    </div>
  )
}
