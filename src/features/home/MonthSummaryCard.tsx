import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { IconButton, MemberSplitBar } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Member } from '@/domain/types'

interface MonthSummaryCardProps {
  selectedMonthKey: string
  curMonthKey: string
  allMonths: string[]
  monthSaved: number
  memberMale: Member
  memberFemale: Member
  pctMale: number
  pctFemale: number
  moneyMale: number
  moneyFemale: number
  onSelectMonth: (ym: string) => void
  onOpenHistory: () => void
}

export function MonthSummaryCard({
  selectedMonthKey,
  curMonthKey,
  allMonths,
  monthSaved,
  memberMale,
  memberFemale,
  pctMale,
  pctFemale,
  moneyMale,
  moneyFemale,
  onSelectMonth,
  onOpenHistory,
}: MonthSummaryCardProps) {
  const selectedMonthIdx = allMonths.indexOf(selectedMonthKey)

  return (
    <div className="rounded-2xl border border-sky-100/90 bg-gradient-to-r from-sky-50/80 via-white to-pink-50/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-700">
              📅 Heo tháng {selectedMonthKey.slice(5)}/{selectedMonthKey.slice(0, 4)}
            </span>
            {selectedMonthKey !== curMonthKey && (
              <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[9.5px] font-black text-amber-800">
                Tháng cũ
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xl font-black text-[#1e1b4b] tabular-nums">
            <AnimatedNumber value={monthSaved} format={(n) => vnd(Math.round(n))} />
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {allMonths.length > 1 && (
            <>
              <IconButton
                label="Tháng trước"
                size="sm"
                disabled={selectedMonthIdx >= allMonths.length - 1}
                onClick={() =>
                  selectedMonthIdx < allMonths.length - 1 &&
                  onSelectMonth(allMonths[selectedMonthIdx + 1])
                }
                className="!h-7 !w-7 !border !border-slate-200 !bg-white !text-slate-600 !shadow-none"
              >
                <ChevronLeft size={14} />
              </IconButton>
              <IconButton
                label="Tháng sau"
                size="sm"
                disabled={selectedMonthIdx <= 0}
                onClick={() =>
                  selectedMonthIdx > 0 && onSelectMonth(allMonths[selectedMonthIdx - 1])
                }
                className="!h-7 !w-7 !border !border-slate-200 !bg-white !text-slate-600 !shadow-none"
              >
                <ChevronRight size={14} />
              </IconButton>
            </>
          )}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex cursor-pointer items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 shadow-sm transition-transform active:scale-95"
          >
            <History size={13} /> DS tháng ({allMonths.length})
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-black">
        <span className="text-sky-700">
          👦 {memberMale.name}: {vnd(moneyMale)} ({pctMale.toFixed(0)}%)
        </span>
        <span className="text-pink-700">
          👧 {memberFemale.name}: {vnd(moneyFemale)} ({pctFemale.toFixed(0)}%)
        </span>
      </div>
      <MemberSplitBar
        pctMale={pctMale}
        pctFemale={pctFemale}
        hasData={monthSaved > 0}
        className="mt-1.5"
      />
    </div>
  )
}
