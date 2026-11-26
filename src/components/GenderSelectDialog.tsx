import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Avatar, Button, Modal } from '@/components/ui'
import type { Gender, MemberId } from '@/domain/types'
import { useStore } from '@/hooks/useStore'

const CONFIG_KEY = 'piggy_gender_configured'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function GenderSelectDialog({ open: manualOpen, onClose }: Props = {}) {
  const { state, repo, run, toast, myMemberId, setMyMemberId } = useStore()
  const j = state.journey

  const [dismissed, setDismissed] = useState(false)

  // Only auto-open if journey exists, setup is done, and user hasn't already dismissed/configured it on this device
  const isAlreadyConfigured = typeof window !== 'undefined' && localStorage.getItem(CONFIG_KEY) === 'true'
  const needsConfig = !!(
    j &&
    j.setupDone &&
    !isAlreadyConfigured &&
    !dismissed
  )

  const isOpen = manualOpen !== undefined ? manualOpen : needsConfig

  const [selectedUser, setSelectedUser] = useState<MemberId>(myMemberId || 'a')
  const [genA, setGenA] = useState<Gender>('male')
  const [genB, setGenB] = useState<Gender>('female')

  useEffect(() => {
    if (j) {
      setGenA(j.members.a.gender || 'male')
      setGenB(j.members.b.gender || 'female')
      setSelectedUser(myMemberId || 'a')
    }
  }, [j?.id, j?.members.a.gender, j?.members.b.gender, myMemberId])

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
    setMyMemberId(selectedUser)

    const updated = await run(
      repo.updateJourney({
        members: {
          a: { ...j.members.a, gender: genA },
          b: { ...j.members.b, gender: genB },
        },
      }),
    )
    if (updated) {
      const activeName = selectedUser === 'a' ? j.members.a.name : j.members.b.name
      toast(`Đã lưu thiết bị này là của ${activeName}! 💖`)
    }
    onClose?.()
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleDismiss}
      title="📱 Bạn đang dùng máy này là ai?"
    >
      <div className="mt-1 text-center">
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          Hãy chọn bạn là ai để khi <b>mở số hôm nay, xác nhận bỏ ống</b> hay <b>nạp thêm</b>, hệ thống sẽ tự động lưu là do bạn làm nhé!
        </p>

        {/* 2 Member Identity Cards */}
        <div className="mt-4 space-y-3 text-left">
          {/* Member A */}
          <div
            onClick={() => setSelectedUser('a')}
            className={`relative flex cursor-pointer items-center justify-between rounded-2xl p-3.5 border-2 transition-all ${
              selectedUser === 'a'
                ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Avatar value={j.members.a.avatar} size={44} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-[#1e1b4b] truncate">{j.members.a.name}</p>
                  {selectedUser === 'a' && (
                    <span className="flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                      <Check size={10} /> Máy này
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-400">
                  {genA === 'male' ? '👦 Nam (Chàng)' : '👧 Nữ (Nàng)'}
                </p>
              </div>
            </div>

            <div
              className="flex shrink-0 gap-1 bg-slate-100 p-1 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => handleSetA('male')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  genA === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                👦 Nam
              </button>
              <button
                type="button"
                onClick={() => handleSetA('female')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  genA === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                👧 Nữ
              </button>
            </div>
          </div>

          {/* Member B */}
          <div
            onClick={() => setSelectedUser('b')}
            className={`relative flex cursor-pointer items-center justify-between rounded-2xl p-3.5 border-2 transition-all ${
              selectedUser === 'b'
                ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Avatar value={j.members.b.avatar} size={44} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-[#1e1b4b] truncate">{j.members.b.name}</p>
                  {selectedUser === 'b' && (
                    <span className="flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                      <Check size={10} /> Máy này
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-400">
                  {genB === 'male' ? '👦 Nam (Chàng)' : '👧 Nữ (Nàng)'}
                </p>
              </div>
            </div>

            <div
              className="flex shrink-0 gap-1 bg-slate-100 p-1 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => handleSetB('male')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  genB === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                👦 Nam
              </button>
              <button
                type="button"
                onClick={() => handleSetB('female')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  genB === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
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
            Tôi là {selectedUser === 'a' ? j.members.a.name : j.members.b.name} - Lưu & Bắt đầu 💕
          </Button>
          <Button variant="ghost" size="sm" className="w-full !text-slate-400 text-xs" onClick={handleDismiss}>
            Để sau
          </Button>
        </div>
      </div>
    </Modal>
  )
}
