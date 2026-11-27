import { Calendar } from 'lucide-react'
import { Button, MemberSplitBar, Modal } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Contribution, Member } from '@/domain/types'

interface MonthHistoryModalProps {
  open: boolean
  onClose: () => void
  allMonths: string[]
  selectedMonthKey: string
  curMonthKey: string
  contributions: Contribution[]
  isBMale: boolean
  memberMale: Member
  memberFemale: Member
  onSelectMonth: (ym: string) => void
}

export function MonthHistoryModal({
  open,
  onClose,
  allMonths,
  selectedMonthKey,
  curMonthKey,
  contributions,
  isBMale,
  memberMale,
  memberFemale,
  onSelectMonth,
}: MonthHistoryModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="📜 Danh sách các tháng của Heo">
      <div className="mt-2 space-y-2.5">
        <p className="text-xs font-bold text-slate-500">
          Chọn một tháng bất kỳ để xem lại lọ tiết kiệm và số tiền 2 bạn đã góp trong tháng đó:
        </p>
        <div className="max-h-[55dvh] space-y-2 overflow-y-auto pr-1">
          {allMonths.map((ym) => {
            const mCs = contributions.filter(
              (c) => c.status === 'confirmed' && c.date.startsWith(ym),
            )
            const mTot = mCs.reduce((s, c) => s + c.amount, 0)
            const mA = mCs.filter((c) => c.member === 'a').reduce((s, c) => s + c.amount, 0)
            const mB = mCs.filter((c) => c.member === 'b').reduce((s, c) => s + c.amount, 0)
            const mMale = isBMale ? mB : mA
            const mFemale = isBMale ? mA : mB
            const mPctMale = mTot > 0 ? (mMale / mTot) * 100 : 0
            const mPctFemale = mTot > 0 ? (mFemale / mTot) * 100 : 0
            const isSelected = ym === selectedMonthKey
            const isCurrent = ym === curMonthKey

            return (
              <button
                key={ym}
                type="button"
                onClick={() => {
                  onSelectMonth(ym)
                  onClose()
                }}
                className={`w-full cursor-pointer rounded-2xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                    : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-indigo-600" />
                    <span className="text-sm font-black text-[#1e1b4b]">
                      Tháng {ym.slice(5)}/{ym.slice(0, 4)}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-black text-emerald-700">
                        Hiện tại
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-rose-600 tabular-nums">
                    {vnd(mTot)}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="text-sky-700">
                    👦 {memberMale.name}: {vnd(mMale)} ({mPctMale.toFixed(0)}%)
                  </span>
                  <span className="text-pink-700">
                    👧 {memberFemale.name}: {vnd(mFemale)} ({mPctFemale.toFixed(0)}%)
                  </span>
                </div>

                <MemberSplitBar
                  pctMale={mPctMale}
                  pctFemale={mPctFemale}
                  hasData={mTot > 0}
                  heightClass="h-1.5"
                  className="mt-1.5 bg-white !p-0"
                />
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  )
}
