import { Avatar, Badge } from '@/components/ui'
import { fmtDateTime, vnd } from '@/domain/format'
import type { Activity, Journey } from '@/domain/types'

const STATUS = { pending: { t: 'Chờ xác nhận', tone: 'warn' }, done: { t: 'Hoàn tất', tone: 'ok' } } as const

export function ActivityRow({ a, journey, onClick }: { a: Activity; journey: Journey; onClick?: () => void }) {
  const m = a.member ? journey.members[a.member] : null
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="relative flex w-full gap-3 border-b border-dashed border-vio/25 py-3 text-left last:border-0" style={onClick ? { background: 'none', borderLeft: 0, borderRight: 0, borderTop: 0, color: 'inherit', fontFamily: 'inherit', cursor: 'pointer' } : undefined}>
      {m ? <Avatar value={m.avatar} size={40} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow" aria-hidden>🐷</span>}
      <div className="min-w-0 flex-1">
        <p className="h3 leading-snug">{a.title}</p>
        {a.description && <p className="muted mt-0.5 !text-xs">{a.description}</p>}
        <p className="muted mt-0.5 !text-[11px] !font-semibold">{fmtDateTime(a.at, journey.timezone)}</p>
      </div>
      <div className="shrink-0 text-right">
        {a.amount != null && <p className="text-sm font-black text-pink">+{vnd(a.amount)}</p>}
        {a.status && <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].t}</Badge>}
      </div>
    </Tag>
  )
}
