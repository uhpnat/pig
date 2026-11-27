import { PlusCircle, Sparkles } from 'lucide-react'
import { Avatar, Badge, Button, Card, SectionHeader } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Contribution, Member, MemberId, Reveal } from '@/domain/types'

interface DailyConfirmationCardProps {
  goalReached: boolean
  reveal: Reveal | undefined
  allDone: boolean
  myMemberId: MemberId
  partnerMemberId: MemberId
  myMember: Member | null
  partnerMember: Member | null
  members: Record<MemberId, Member>
  myDailyC: Contribution | undefined
  partnerDailyC: Contribution | undefined
  myDailyBy: MemberId[]
  partnerDailyBy: MemberId[]
  extraPending: Contribution[]
  onConfirm: (c: Contribution) => void
  onOpenReveal: () => void
  onOpenTopUp: () => void
}

export function DailyConfirmationCard({
  goalReached,
  reveal,
  allDone,
  myMemberId,
  partnerMemberId,
  myMember,
  partnerMember,
  members,
  myDailyC,
  partnerDailyC,
  myDailyBy,
  partnerDailyBy,
  extraPending,
  onConfirm,
  onOpenReveal,
  onOpenTopUp,
}: DailyConfirmationCardProps) {
  if (goalReached) {
    return (
      <Card className="!mt-0 text-center">
        <h2 className="h2">🎉 Hoàn thành mục tiêu!</h2>
        <p className="muted mt-1">Hai bạn đã chạm đích xuất sắc!</p>
      </Card>
    )
  }

  if (!reveal) {
    return (
      <div className="rounded-2xl border border-purple-100 bg-white p-3.5 text-center shadow-sm">
        <p className="text-xs font-black text-purple-700">
          <Sparkles size={13} className="mr-1 inline" /> Hôm nay chưa mở số tiền
        </p>
        <Button variant="violet" className="mt-2.5 w-full !py-3 !text-sm" onClick={onOpenReveal}>
          🎰 {myMember?.name} kéo cần gạt mở số ngay
        </Button>
      </div>
    )
  }

  const isMyMale = myMember?.gender === 'male'
  const myDone = myDailyC?.status === 'confirmed'
  const iConfirmedMine = myDailyBy.includes(myMemberId)

  const partnerDone = partnerDailyC?.status === 'confirmed'
  const partnerReported = partnerDailyBy.includes(partnerMemberId)
  const iApprovedPartner = partnerDailyBy.includes(myMemberId)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
      <SectionHeader
        title="🎲 Xác nhận tiền hôm nay"
        right={
          <Badge tone={allDone ? 'ok' : 'warn'}>
            {allDone ? 'Đã duyệt đủ 2/2 ✅' : 'Duyệt chéo 2 người ⏳'}
          </Badge>
        }
      />

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {/* My Daily Card */}
        <div
          className={`rounded-2xl border-2 p-2.5 text-center ${
            isMyMale ? 'border-sky-300 bg-sky-50/75' : 'border-pink-300 bg-pink-50/75'
          }`}
        >
          <div className="flex min-w-0 items-center justify-center gap-1">
            <Avatar value={myMember?.avatar || 'boy'} size={24} />
            <span className="truncate text-xs font-black text-[#1e1b4b]">{myMember?.name}</span>
            <span className="shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[8.5px] font-black text-white">
              Bạn
            </span>
          </div>
          <p className={`mt-1 text-base font-black tabular-nums ${isMyMale ? 'text-sky-700' : 'text-pink-700'}`}>
            +{vnd(reveal.amounts[myMemberId])}
          </p>
          {myDone ? (
            <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-black text-emerald-700">
              Đã vào quỹ (2/2) ✅
            </span>
          ) : iConfirmedMine ? (
            <div className="mt-1.5 rounded-xl bg-amber-100/90 px-2 py-1 text-[10px] font-black text-amber-800">
              ⏳ Đã nạp (1/2) · Chờ {partnerMember?.name}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => myDailyC && onConfirm(myDailyC)}
              className={`mt-1.5 w-full cursor-pointer rounded-xl border-0 py-1.5 text-xs font-black text-white shadow-sm active:scale-95 ${
                isMyMale
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600'
              }`}
            >
              💸 Tôi đã nạp ({myDailyBy.length}/2)
            </button>
          )}
        </div>

        {/* Partner Daily Card */}
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-2.5 text-center">
          <div className="flex min-w-0 items-center justify-center gap-1">
            <Avatar value={partnerMember?.avatar || 'girl'} size={24} />
            <span className="truncate text-xs font-black text-[#1e1b4b]">{partnerMember?.name}</span>
          </div>
          <p className="mt-1 text-base font-black text-purple-800 tabular-nums">
            +{vnd(reveal.amounts[partnerMemberId])}
          </p>
          {partnerDone ? (
            <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-black text-emerald-800">
              Đã vào quỹ (2/2) ✅
            </span>
          ) : iApprovedPartner ? (
            <div className="mt-1.5 rounded-xl border border-amber-300 bg-amber-100 px-2 py-1.5 text-[10px] font-black text-amber-950">
              ⏳ Đã duyệt (1/2) · Chờ {partnerMember?.name}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => partnerDailyC && onConfirm(partnerDailyC)}
              className={`mt-1.5 w-full cursor-pointer rounded-xl border-0 px-2 py-1.5 text-xs font-black text-white shadow-md transition-transform active:scale-95 ${
                partnerReported
                  ? 'animate-pulse bg-gradient-to-r from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600'
              }`}
            >
              {partnerReported
                ? `✅ Duyệt ${partnerMember?.name} (2/2)`
                : `✅ Xác nhận cho ${partnerMember?.name}`}
            </button>
          )}
        </div>
      </div>

      {/* Extra Pending Top-Ups needing 2-person cross-confirmation */}
      {extraPending.length > 0 && (
        <div className="mt-2.5 space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-2">
          {extraPending.map((c) => {
            const cBy = c.confirmedBy ?? []
            const iConfirmed = cBy.includes(myMemberId)
            const owner = members[c.member]
            const other = members[c.member === 'a' ? 'b' : 'a']
            return (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
                <span className="truncate text-xs font-black text-[#1e1b4b]">
                  ➕ {owner.name} nạp +{vnd(c.amount)} ({cBy.length}/2)
                </span>
                {iConfirmed ? (
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    Chờ {other.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onConfirm(c)}
                    className="shrink-0 cursor-pointer rounded-lg border-0 bg-emerald-600 px-2.5 py-1 text-[10.5px] font-black text-white shadow-sm active:scale-95"
                  >
                    ✅ Duyệt (2/2)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Compact extra deposit & slot machine links */}
      <div className="mt-2.5 flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={onOpenTopUp}
          className="flex cursor-pointer items-center gap-1 rounded-full border-0 bg-pink-50 px-3 py-1 text-xs font-black text-pink-600 active:scale-95"
        >
          <PlusCircle size={14} /> Nạp thêm vào quỹ
        </button>
        <button
          type="button"
          onClick={onOpenReveal}
          className="cursor-pointer border-0 bg-transparent text-xs font-extrabold text-indigo-600 hover:underline"
        >
          🎰 Xem lồng quay →
        </button>
      </div>
    </div>
  )
}
