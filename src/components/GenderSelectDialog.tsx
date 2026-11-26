import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Avatar, Button, Modal } from '@/components/ui'
import type { Gender } from '@/domain/types'
import { useStore } from '@/hooks/useStore'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function GenderSelectDialog({ open: manualOpen, onClose }: Props = {}) {
  const { state, repo, run, toast } = useStore()
  const j = state.journey

  // If manualOpen is provided, obey it.
  // Otherwise, automatically open if journey exists, setup is done, and either member's gender is not set!
  const needsConfig = !!(j && j.setupDone && (!j.members.a.gender || !j.members.b.gender))
  const isOpen = manualOpen !== undefined ? manualOpen : needsConfig

  const [genA, setGenA] = useState<Gender>('male')
  const [genB, setGenB] = useState<Gender>('female')

  useEffect(() => {
    if (j) {
      setGenA(j.members.a.gender || 'male')
      setGenB(j.members.b.gender || 'female')
    }
  }, [j?.id, j?.members.a.gender, j?.members.b.gender])

  if (!j) return null

  const handleSelectPreset = (a: Gender, b: Gender) => {
    setGenA(a)
    setGenB(b)
  }

  const save = async () => {
    const updated = await run(
      repo.updateJourney({
        members: {
          a: { ...j.members.a, gender: genA },
          b: { ...j.members.b, gender: genB },
        },
      }),
    )
    if (updated) {
      toast('Đã lưu vai trò Nam & Nữ của hai bạn! 💖')
      onClose?.()
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        // Only allow close if already configured or if manually opened
        if (!needsConfig || manualOpen) onClose?.()
      }}
      title="💕 Ai là Chàng, ai là Nàng?"
    >
      <div className="mt-2 text-center">
        <p className="text-xs font-bold text-[#64748b] leading-relaxed">
          Hãy chọn ai là <b>Nam 👦 (Chàng 💙)</b> và ai là <b>Nữ 👧 (Nàng 💗)</b> để heo đất hiển thị màu nước và lời nhắn chính xác nhất nhé!
          <br />
          <span className="text-[#a855f7] font-extrabold">(Lưu 1 lần duy nhất, lần sau không hỏi lại)</span>
        </p>

        {/* 2 Quick Preset Choices */}
        <div className="mt-4 grid gap-2.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectPreset('male', 'female')}
            className={`flex items-center justify-between rounded-2xl border-2 p-3 text-left transition-all ${
              genA === 'male' && genB === 'female'
                ? 'border-[#38bdf8] bg-sky-50 shadow-md ring-2 ring-sky-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar value={j.members.a.avatar} size={42} />
              <div>
                <p className="text-sm font-black text-[#1e1b4b]">{j.members.a.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-black text-white">
                  👦 Nam (Chàng)
                </span>
              </div>
            </div>
            <div className="text-center font-bold text-slate-300">💖</div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-sm font-black text-[#1e1b4b]">{j.members.b.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-black text-white">
                  👧 Nữ (Nàng)
                </span>
              </div>
              <Avatar value={j.members.b.avatar} size={42} />
            </div>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectPreset('female', 'male')}
            className={`flex items-center justify-between rounded-2xl border-2 p-3 text-left transition-all ${
              genA === 'female' && genB === 'male'
                ? 'border-[#ff7aa2] bg-pink-50 shadow-md ring-2 ring-pink-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar value={j.members.a.avatar} size={42} />
              <div>
                <p className="text-sm font-black text-[#1e1b4b]">{j.members.a.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-black text-white">
                  👧 Nữ (Nàng)
                </span>
              </div>
            </div>
            <div className="text-center font-bold text-slate-300">💖</div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-sm font-black text-[#1e1b4b]">{j.members.b.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-black text-white">
                  👦 Nam (Chàng)
                </span>
              </div>
              <Avatar value={j.members.b.avatar} size={42} />
            </div>
          </motion.button>
        </div>

        {/* Custom Individual Pickers */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 border border-slate-200/80 text-left">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">
            Hoặc tự chọn chi tiết từng người
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            {/* Member A */}
            <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-center shadow-sm">
              <Avatar value={j.members.a.avatar} size={36} className="mx-auto" />
              <p className="mt-1 text-xs font-black text-[#1e1b4b] truncate">{j.members.a.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setGenA('male')}
                  className={`rounded-lg py-1 text-xs font-black transition-colors ${
                    genA === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👦 Nam
                </button>
                <button
                  type="button"
                  onClick={() => setGenA('female')}
                  className={`rounded-lg py-1 text-xs font-black transition-colors ${
                    genA === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👧 Nữ
                </button>
              </div>
            </div>

            {/* Member B */}
            <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-center shadow-sm">
              <Avatar value={j.members.b.avatar} size={36} className="mx-auto" />
              <p className="mt-1 text-xs font-black text-[#1e1b4b] truncate">{j.members.b.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setGenB('male')}
                  className={`rounded-lg py-1 text-xs font-black transition-colors ${
                    genB === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👦 Nam
                </button>
                <button
                  type="button"
                  onClick={() => setGenB('female')}
                  className={`rounded-lg py-1 text-xs font-black transition-colors ${
                    genB === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👧 Nữ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Button variant="violet" className="w-full !py-3.5 !text-[16px]" onClick={save}>
            Lưu vai trò & Tiếp tục 💗
          </Button>
        </div>
      </div>
    </Modal>
  )
}
