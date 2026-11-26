import { useState, useEffect } from 'react'
import { Check, Pencil } from 'lucide-react'
import { Avatar, Button, Modal } from '@/components/ui'
import type { Gender, MemberId } from '@/domain/types'
import { useStore } from '@/hooks/useStore'

export const ROLE_CONFIG_KEY = 'piggy_role_confirmed_v2'

interface Props {
  open?: boolean
  onClose?: () => void
}

export function GenderSelectDialog({ open: manualOpen, onClose }: Props = {}) {
  const { state, repo, run, toast, myMemberId, setMyMemberId } = useStore()
  const j = state.journey

  const [configuredInSession, setConfiguredInSession] = useState(false)

  // Always require selection on every load/reload until the user explicitly confirms & saves!
  const isAlreadyConfigured =
    configuredInSession ||
    (typeof window !== 'undefined' &&
      localStorage.getItem(ROLE_CONFIG_KEY) === 'true' &&
      (localStorage.getItem('piggy_my_member') === 'a' || localStorage.getItem('piggy_my_member') === 'b'))

  const needsConfig = !!(j && j.setupDone && !isAlreadyConfigured)
  const isOpen = manualOpen !== undefined ? manualOpen : needsConfig

  const [selectedUser, setSelectedUser] = useState<MemberId>(myMemberId || 'a')
  const [genA, setGenA] = useState<Gender>('male')
  const [genB, setGenB] = useState<Gender>('female')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [journeyName, setJourneyName] = useState('')

  useEffect(() => {
    if (j && isOpen) {
      setGenA(j.members.a.gender || 'male')
      setGenB(j.members.b.gender || 'female')
      setNameA(j.members.a.name || 'Bạn 1')
      setNameB(j.members.b.name || 'Bạn 2')
      setJourneyName(j.name || 'Heo Đất Chung')
      setSelectedUser(myMemberId || 'a')
    }
  }, [j?.id, j?.name, j?.members.a.name, j?.members.b.name, j?.members.a.gender, j?.members.b.gender, myMemberId, isOpen])

  if (!j) return null

  const handleSetA = (gender: Gender) => {
    setGenA(gender)
    setGenB(gender === 'male' ? 'female' : 'male')
  }

  const handleSetB = (gender: Gender) => {
    setGenB(gender)
    setGenA(gender === 'male' ? 'female' : 'male')
  }

  const handleCloseAttempt = () => {
    // Only allow closing without saving if already configured before (manualOpen)
    if (isAlreadyConfigured || manualOpen) {
      onClose?.()
    } else {
      toast('Hãy chọn bạn là ai (Nam hay Nữ) rồi bấm Lưu để bắt đầu nhé! 💕')
    }
  }

  const save = async () => {
    const cleanA = nameA.trim() || j.members.a.name || 'Chàng'
    const cleanB = nameB.trim() || j.members.b.name || 'Nàng'
    const cleanJourney = journeyName.trim() || j.name

    try {
      localStorage.setItem(ROLE_CONFIG_KEY, 'true')
      localStorage.setItem('piggy_gender_configured', 'true')
    } catch {}
    setConfiguredInSession(true)
    setMyMemberId(selectedUser)

    const updated = await run(
      repo.updateJourney({
        name: cleanJourney,
        members: {
          a: { ...j.members.a, name: cleanA, gender: genA },
          b: { ...j.members.b, name: cleanB, gender: genB },
        },
      }),
    )
    if (updated) {
      const activeName = selectedUser === 'a' ? cleanA : cleanB
      const activeGen = (selectedUser === 'a' ? genA : genB) === 'male' ? 'Nam 👦' : 'Nữ 👧'
      toast(`Đã lưu: Máy này của ${activeName} (${activeGen})! 💖`)
    }
    onClose?.()
  }

  const displaySelectedName = (selectedUser === 'a' ? nameA : nameB).trim() || (selectedUser === 'a' ? j.members.a.name : j.members.b.name)

  return (
    <Modal
      open={isOpen}
      onClose={handleCloseAttempt}
      title="📱 Tên & Vai trò của hai bạn"
    >
      <div className="mt-1 text-center">
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          Bạn có thể <b>sửa tên</b> của 2 người và chọn ai đang dùng máy này (<b>Nam 👦</b> hay <b>Nữ 👧</b>) ngay bên dưới nhé!
        </p>

        {/* Editable Journey Name */}
        <div className="mt-3 text-left">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
            ✏️ Tên hành trình chung
          </label>
          <input
            type="text"
            value={journeyName}
            maxLength={40}
            onChange={(e) => setJourneyName(e.target.value)}
            placeholder="Nhập tên hành trình..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm font-black text-[#1e1b4b] outline-none focus:border-indigo-400 focus:bg-white"
          />
        </div>

        {/* 2 Member Identity & Editable Name Cards */}
        <div className="mt-3 space-y-2.5 text-left">
          {/* Member A */}
          <div
            onClick={() => setSelectedUser('a')}
            className={`relative cursor-pointer rounded-2xl p-3 border-2 transition-all ${
              selectedUser === 'a'
                ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar value={j.members.a.avatar} size={42} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={nameA}
                        maxLength={24}
                        aria-label="Tên người thứ nhất"
                        onChange={(e) => setNameA(e.target.value)}
                        placeholder="Nhập tên..."
                        className="w-full rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1 pr-6 text-sm font-black text-[#1e1b4b] outline-none focus:border-indigo-500"
                      />
                      <Pencil size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      {genA === 'male' ? '👦 Nam (Chàng)' : '👧 Nữ (Nàng)'}
                    </span>
                    {selectedUser === 'a' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[9.5px] font-black text-white">
                        <Check size={10} /> Đang dùng máy này
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex shrink-0 gap-1 bg-slate-100 p-1 rounded-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleSetA('male')
                    setSelectedUser('a')
                  }}
                  className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
                    genA === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  👦 Nam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetA('female')
                    setSelectedUser('a')
                  }}
                  className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
                    genA === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  👧 Nữ
                </button>
              </div>
            </div>
          </div>

          {/* Member B */}
          <div
            onClick={() => setSelectedUser('b')}
            className={`relative cursor-pointer rounded-2xl p-3 border-2 transition-all ${
              selectedUser === 'b'
                ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar value={j.members.b.avatar} size={42} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={nameB}
                        maxLength={24}
                        aria-label="Tên người thứ hai"
                        onChange={(e) => setNameB(e.target.value)}
                        placeholder="Nhập tên..."
                        className="w-full rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1 pr-6 text-sm font-black text-[#1e1b4b] outline-none focus:border-indigo-500"
                      />
                      <Pencil size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      {genB === 'male' ? '👦 Nam (Chàng)' : '👧 Nữ (Nàng)'}
                    </span>
                    {selectedUser === 'b' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[9.5px] font-black text-white">
                        <Check size={10} /> Đang dùng máy này
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex shrink-0 gap-1 bg-slate-100 p-1 rounded-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleSetB('male')
                    setSelectedUser('b')
                  }}
                  className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
                    genB === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  👦 Nam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetB('female')
                    setSelectedUser('b')
                  }}
                  className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
                    genB === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  👧 Nữ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <Button variant="violet" className="w-full !py-3.5 !text-[15px]" onClick={save}>
            Tôi là {displaySelectedName} ({(selectedUser === 'a' ? genA : genB) === 'male' ? 'Nam 👦' : 'Nữ 👧'}) – Lưu thay đổi 💕
          </Button>
          {(isAlreadyConfigured || manualOpen) && (
            <Button variant="ghost" size="sm" className="w-full !text-slate-400 text-xs" onClick={() => onClose?.()}>
              Đóng
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
