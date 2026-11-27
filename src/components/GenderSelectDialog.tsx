import { Check, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, Button, Modal } from '@/components/ui'
import type { Gender, Member, MemberId } from '@/domain/types'
import { useStore } from '@/hooks/useStore'

export const ROLE_CONFIG_KEY = 'piggy_role_confirmed_v2'

interface Props {
  open?: boolean
  onClose?: () => void
}

function MemberIdentityCard({
  member,
  name,
  gender,
  isSelected,
  inputAriaLabel,
  onSelect,
  onNameChange,
  onGenderChange,
}: {
  member: Member
  name: string
  gender: Gender
  isSelected: boolean
  inputAriaLabel: string
  onSelect: () => void
  onNameChange: (val: string) => void
  onGenderChange: (g: Gender) => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-2xl border-2 p-3 transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar value={member.avatar} size={42} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={name}
                maxLength={24}
                aria-label={inputAriaLabel}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Nhập tên..."
                className="w-full rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1 pr-6 text-sm font-black text-[#1e1b4b] outline-none focus:border-indigo-500"
              />
              <Pencil size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">
                {gender === 'male' ? '👦 Nam (Chàng)' : '👧 Nữ (Nàng)'}
              </span>
              {isSelected && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[9.5px] font-black text-white">
                  <Check size={10} /> Đang dùng máy này
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onGenderChange('male')}
            className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
              gender === 'male' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            👦 Nam
          </button>
          <button
            type="button"
            onClick={() => onGenderChange('female')}
            className={`rounded-lg px-2 py-1 text-xs font-black transition-all ${
              gender === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            👧 Nữ
          </button>
        </div>
      </div>
    </div>
  )
}

export function GenderSelectDialog({ open: manualOpen, onClose }: Props = {}) {
  const { state, repo, run, toast, myMemberId, setMyMemberId } = useStore()
  const j = state.journey

  const [configuredInSession, setConfiguredInSession] = useState(false)

  const isAlreadyConfigured =
    configuredInSession ||
    (typeof window !== 'undefined' &&
      localStorage.getItem(ROLE_CONFIG_KEY) === 'true' &&
      (localStorage.getItem('piggy_my_member') === 'a' || localStorage.getItem('piggy_my_member') === 'b'))

  const needsConfig = !!(j && j.setupDone && !isAlreadyConfigured)
  const isOpen = manualOpen !== undefined ? manualOpen : needsConfig

  const [selectedUser, setSelectedUser] = useState<MemberId>(myMemberId || 'a')
  const [genders, setGenders] = useState<Record<MemberId, Gender>>({ a: 'male', b: 'female' })
  const [names, setNames] = useState<Record<MemberId, string>>({ a: '', b: '' })
  const [journeyName, setJourneyName] = useState('')

  useEffect(() => {
    if (j && isOpen) {
      setGenders({
        a: j.members.a.gender || 'male',
        b: j.members.b.gender || 'female',
      })
      setNames({
        a: j.members.a.name || 'Bạn 1',
        b: j.members.b.name || 'Bạn 2',
      })
      setJourneyName(j.name || 'Heo Đất Chung')
      setSelectedUser(myMemberId || 'a')
    }
  }, [j?.id, j?.name, j?.members.a.name, j?.members.b.name, j?.members.a.gender, j?.members.b.gender, myMemberId, isOpen])

  if (!j) return null

  const handleSetGender = (member: MemberId, gender: Gender) => {
    const other: MemberId = member === 'a' ? 'b' : 'a'
    setGenders({
      [member]: gender,
      [other]: gender === 'male' ? 'female' : 'male',
    } as Record<MemberId, Gender>)
    setSelectedUser(member)
  }

  const handleCloseAttempt = () => {
    if (isAlreadyConfigured || manualOpen) {
      onClose?.()
    } else {
      toast('Hãy chọn bạn là ai (Nam hay Nữ) rồi bấm Lưu để bắt đầu nhé! 💕')
    }
  }

  const save = async () => {
    const cleanA = names.a.trim() || j.members.a.name || 'Chàng'
    const cleanB = names.b.trim() || j.members.b.name || 'Nàng'
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
          a: { ...j.members.a, name: cleanA, gender: genders.a },
          b: { ...j.members.b, name: cleanB, gender: genders.b },
        },
      }),
    )
    if (updated) {
      const activeName = selectedUser === 'a' ? cleanA : cleanB
      const activeGen = genders[selectedUser] === 'male' ? 'Nam 👦' : 'Nữ 👧'
      toast(`Đã lưu: Máy này của ${activeName} (${activeGen})! 💖`)
    }
    onClose?.()
  }

  const displaySelectedName =
    names[selectedUser].trim() || j.members[selectedUser].name

  return (
    <Modal open={isOpen} onClose={handleCloseAttempt} title="📱 Tên & Vai trò của hai bạn">
      <div className="mt-1 text-center">
        <p className="text-xs font-semibold leading-relaxed text-slate-500">
          Bạn có thể <b>sửa tên</b> của 2 người và chọn ai đang dùng máy này (<b>Nam 👦</b> hay <b>Nữ 👧</b>) ngay bên dưới nhé!
        </p>

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

        <div className="mt-3 space-y-2.5 text-left">
          {(['a', 'b'] as const).map((id) => (
            <MemberIdentityCard
              key={id}
              member={j.members[id]}
              name={names[id]}
              gender={genders[id]}
              isSelected={selectedUser === id}
              inputAriaLabel={id === 'a' ? 'Tên người thứ nhất' : 'Tên người thứ hai'}
              onSelect={() => setSelectedUser(id)}
              onNameChange={(val) => setNames((prev) => ({ ...prev, [id]: val }))}
              onGenderChange={(g) => handleSetGender(id, g)}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Button variant="violet" className="w-full !py-3.5 !text-[15px]" onClick={save}>
            Tôi là {displaySelectedName} ({genders[selectedUser] === 'male' ? 'Nam 👦' : 'Nữ 👧'}) – Lưu thay đổi 💕
          </Button>
          {(isAlreadyConfigured || manualOpen) && (
            <Button variant="ghost" size="sm" className="w-full text-xs !text-slate-400" onClick={() => onClose?.()}>
              Đóng
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
