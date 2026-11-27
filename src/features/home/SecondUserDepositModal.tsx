import { Button, Modal } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Contribution, Member, MemberId, Reveal } from '@/domain/types'

interface SecondUserDepositModalProps {
  open: boolean
  onClose: () => void
  reveal: Reveal | undefined
  members: Record<MemberId, Member>
  myMemberId: MemberId
  partnerMemberId: MemberId
  myMember: Member | null
  partnerMember: Member | null
  myDailyC: Contribution | undefined
  partnerDailyC: Contribution | undefined
  myDailyBy: MemberId[]
  partnerDailyBy: MemberId[]
  onConfirm: (c: Contribution) => void
}

export function SecondUserDepositModal({
  open,
  onClose,
  reveal,
  members,
  myMemberId,
  partnerMemberId,
  myMember,
  partnerMember,
  myDailyC,
  partnerDailyC,
  myDailyBy,
  partnerDailyBy,
  onConfirm,
}: SecondUserDepositModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="🔔 Thông báo số tiền phải nạp hôm nay">
      {reveal && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold text-slate-600">
            Hôm nay <b>{members[reveal.initiatedBy].name}</b> đã quay random số tiền cho hai bạn!
          </p>
          <div className="mt-3 rounded-2xl border-2 border-indigo-300 bg-indigo-50/90 p-3.5">
            <p className="text-xs font-black text-indigo-950">
              Số tiền BẠN ({myMember?.name}) cần nạp hôm nay:
            </p>
            <p className="mt-1 text-3xl font-black text-indigo-700 tabular-nums">
              +{vnd(reveal.amounts[myMemberId])}
            </p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              Phần của {partnerMember?.name}: <b>+{vnd(reveal.amounts[partnerMemberId])}</b>
            </p>
          </div>

          <p className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] font-extrabold text-amber-800">
            🔒 Quy tắc quỹ chung: Khi nạp tiền phải được <b>cả 2 người xác nhận chéo của nhau (2/2)</b> mới được tính là đã duyệt vào heo đất!
          </p>

          <div className="mt-3.5 space-y-2">
            {myDailyC && myDailyC.status !== 'confirmed' && !myDailyBy.includes(myMemberId) && (
              <Button variant="violet" onClick={() => onConfirm(myDailyC)}>
                💸 Tôi đã nạp {vnd(reveal.amounts[myMemberId])} (Báo cho {partnerMember?.name} duyệt)
              </Button>
            )}
            {partnerDailyC &&
              partnerDailyC.status !== 'confirmed' &&
              partnerDailyBy.includes(partnerMemberId) &&
              !partnerDailyBy.includes(myMemberId) && (
                <Button variant="pink" onClick={() => onConfirm(partnerDailyC)}>
                  ✅ Duyệt xác nhận {partnerMember?.name} đã nạp {vnd(reveal.amounts[partnerMemberId])} (2/2)
                </Button>
              )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đã hiểu, đóng thông báo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
