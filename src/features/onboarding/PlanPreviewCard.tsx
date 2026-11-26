import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui'
import { addMonths, fmtDate, millions, pct, vnd } from '@/domain/format'
import type { PlanPreview } from '@/domain/engine'
import type { Journey } from '@/domain/types'

/** Live plan calculations; three distinct metrics (income %, planned %, actual %) are labeled separately. */
export function PlanPreviewCard({ plan, journey }: { plan: PlanPreview; journey: Pick<Journey, 'members' | 'startDate' | 'months' | 'goal'> }) {
  const { a, b } = journey.members
  const good = plan.feasibility === 'ok'
  const rows: [string, string][] = [
    ['Tổng thu nhập chung', `${vnd(plan.combinedIncome)}/tháng`],
    ['Tỷ lệ thu nhập', `${a.name} ${pct(plan.income.a * 100)} · ${b.name} ${pct(plan.income.b * 100)}`],
    ['Tỷ lệ góp theo kế hoạch', `${a.name} ${pct(plan.planned.a * 100)} · ${b.name} ${pct(plan.planned.b * 100)}`],
    ['Ngân sách tiết kiệm/tháng', `${vnd(plan.monthlyBudget)} (${millions(plan.memberMonthly.a)} + ${millions(plan.memberMonthly.b)})`],
    ['Trung bình mỗi ngày', vnd(plan.avgPerDay)],
    ['Ước tính khi kết thúc', vnd(plan.estimatedTotal)],
    ['Dự kiến đạt mục tiêu', Number.isFinite(plan.monthsToGoal) ? fmtDate(addMonths(journey.startDate, Math.ceil(plan.monthsToGoal))) : 'Chưa xác định'],
  ]
  return (
    <Card className="!shadow-none" style={{ background: 'rgba(143,124,240,.1)' }} aria-live="polite">
      <h3 className="h3">📊 Dự tính</h3>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-[13px]"><dt className="muted">{k}</dt><dd className="text-right font-extrabold">{v}</dd></div>
        ))}
      </dl>
      <p className={`mt-3 flex items-start gap-2 text-[13px] font-bold ${good ? 'text-[#1c9a62]' : 'text-[#a56a00]'}`}>
        {good ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
        {plan.feasibilityNote}
      </p>
    </Card>
  )
}
