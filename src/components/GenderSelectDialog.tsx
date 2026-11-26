import { useState, useEffect } from 'react'
import { Avatar, Button, Modal } from '@/components/ui'
import type { Gender } from '@/domain/types'
import { useStore } from '@/hooks/useStore'

const CONFIG_KEY = 'piggy_gender_configured'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function GenderSelectDialog({ open: manualOpen, onClose }: Props = {}) {
  const { state, repo, run, toast } = useStore()
  const j = state.journey

  const [dismissed, setDismissed] = useState(false)

  // Only auto-open if journey exists, setup is done, gender is missing, and user hasn't already dismissed/configured it
  const isAlreadyConfigured = typeof window !== 'undefined' && localStorage.getItem(CONFIG_KEY) === 'true'
  const needsConfig = !!(
    j &&
    j.setupDone &&
    (!j.members.a.gender || !j.members.b.gender) &&
    !isAlreadyConfigured &&
    !dismissed
  )

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

  const handleSetA = (gender: Gender) => {
    setGenA(gender)
    setGenB(gender === 'male' ? 'female' : 'male')
  }

  const handleSetB = (gender: Gender) => {
    setGenB(gender)
    setGenA(gender === 'male' ? 'female' : 'male')
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(CONFIG_KEY, 'true')
    } catch {}
    onClose?.()
  }

  const save = async () => {
    try {
      localStorage.setItem(CONFIG_KEY, 'true')
    } catch {}
    setDismissed(true)
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
    }
    onClose?.()
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleDismiss}
      title="👫 Vai trò của hai bạn"
    >
      <div className="mt-1 text-center">
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          Chỉ cần chọn Nam hoặc Nữ cho từng bạn để hiển thị màu nước và mascot phù hợp nhất nhé!
        </p>

        {/* 2 Clean Member Rows */}
        <div className="mt-4 space-y-3 text-left">
          {/* Member A */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Avatar value={j.members.a.avatar} size={42} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black text-[#1e1b4b] truncate">{j.members.a.name}</p>
                <p className="text-[11px] font-bold text-slate-400">Bạn thứ nhất</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm">
              <button
                type="button"
                onClick={() => handleSetA('male')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  genA === 'male'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                👦 Nam
              </button>
              <button
                type="button"
                onClick={() => handleSetA('female')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  genA === 'female'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                👧 Nữ
              </button>
            </div>
          </div>

          {/* Member B */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Avatar value={j.members.b.avatar} size={42} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black text-[#1e1b4b] truncate">{j.members.b.name}</p>
                <p className="text-[11px] font-bold text-slate-400">Bạn thứ hai</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm">
              <button
                type="button"
                onClick={() => handleSetB('male')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  genB === 'male'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                👦 Nam
              </button>
              <button
                type="button"
                onClick={() => handleSetB('female')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  genB === 'female'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                👧 Nữ
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <Button variant="violet" className="w-full !py-3.5 !text-[15px]" onClick={save}>
            Lưu vai trò 💕
          </Button>
          <Button variant="ghost" size="sm" className="w-full !text-slate-400 text-xs" onClick={handleDismiss}>
            Để sau
          </Button>
        </div>
      </div>
    </Modal>
  )
}
