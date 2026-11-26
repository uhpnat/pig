import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActivityRow } from '@/components/ActivityRow'
import { Avatar, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Modal } from '@/components/ui'
import { fmtDate, fmtDateTime, vnd } from '@/domain/format'
import type { Activity, ActivityType, MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'

type Filter = 'all' | 'money' | 'reveal' | 'challenge' | 'milestone' | 'settings'
const FILTERS: { id: Filter; label: string; types?: ActivityType[] }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'money', label: 'Góp tiền', types: ['contribution', 'confirmation'] },
  { id: 'reveal', label: 'Kết quả ngày', types: ['reveal'] },
  { id: 'challenge', label: 'Thử thách', types: ['challenge'] },
  { id: 'milestone', label: 'Cột mốc', types: ['milestone'] },
  { id: 'settings', label: 'Thay đổi quy tắc', types: ['settings'] },
]

export default function JournalPage() {
  const j = useJourney()
  const { state, repo, run, toast, celebrate } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [member, setMember] = useState<MemberId | 'both'>('both')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [detail, setDetail] = useState<Activity | null>(null)
  const [voidId, setVoidId] = useState<string | null>(null)

  const list = useMemo(() => {
    const types = FILTERS.find((f) => f.id === filter)?.types
    const needle = q.trim().toLowerCase()
    return state.activity.filter((a) =>
      (!types || types.includes(a.type)) &&
      (member === 'both' || a.member === member) &&
      (!from || a.at.slice(0, 10) >= from) &&
      (!needle || `${a.title} ${a.description ?? ''}`.toLowerCase().includes(needle)))
  }, [state.activity, filter, member, q, from])

  const pending = state.contributions.filter((c) => c.status === 'pending')

  const confirm = async (id: string) => {
    const before = state.milestonesReached.length
    const out = await run(repo.confirmContribution(id))
    if (out) { toast('Đã xác nhận khoản góp 💰'); if (out.milestonesReached.length > before) celebrate(['🎉', '🎆', '🪙']) }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="h1">Nhật ký tiết kiệm</h1>
      <p className="muted mt-1">Lịch sử tài chính không bị xoá âm thầm – mọi thay đổi đều được ghi lại.</p>

      {pending.length > 0 && (
        <Card className="!bg-[#fff7e0]">
          <h2 className="h3">⏳ Đang chờ xác nhận ({pending.length})</h2>
          <ul className="mt-2 space-y-2">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <Avatar value={j.members[c.member].avatar} size={36} />
                <div className="min-w-0 flex-1"><p className="text-sm font-black">{j.members[c.member].name} · {vnd(c.amount)}</p><p className="muted !text-[11px]">{fmtDate(c.date)}{c.notes ? ` · ${c.notes}` : ''}</p></div>
                {!c.revealId && <button type="button" className="chip" onClick={() => setVoidId(c.id)}>Huỷ</button>}
                <Button size="sm" block={false} onClick={() => confirm(c.id)}>Xác nhận</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="relative mt-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mut" aria-hidden />
        <input className="field !pl-10" placeholder="Tìm trong nhật ký…" aria-label="Tìm kiếm" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc loại sự kiện">
        {FILTERS.map((f) => <Chip key={f.id} on={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0">{f.label}</Chip>)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo thành viên và ngày">
        <Chip on={member === 'both'} onClick={() => setMember('both')}>Cả hai</Chip>
        {(['a', 'b'] as const).map((k) => <Chip key={k} on={member === k} onClick={() => setMember(k)}>{j.members[k].name}</Chip>)}
        <label className="flex items-center gap-1.5 text-xs font-extrabold">Từ ngày <input type="date" className="field !w-auto !px-2 !py-1.5 !text-xs" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      </div>

      <Card>
        {list.length ? list.map((a) => <ActivityRow key={a.id} a={a} journey={j} onClick={() => setDetail(a)} />) : (
          <EmptyState title={state.activity.length ? 'Không có sự kiện phù hợp' : 'Chưa có sự kiện nào'} hint={state.activity.length ? 'Thử đổi bộ lọc nhé.' : 'Mở số tiền hôm nay để nhật ký bắt đầu có chữ.'} />
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết sự kiện">
        {detail && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-base font-black">{detail.title}</p>
            {detail.description && <p className="muted">{detail.description}</p>}
            <p className="muted">🕒 {fmtDateTime(detail.at, j.timezone)}</p>
            {detail.member && <p className="muted">👤 {j.members[detail.member].name}</p>}
            {detail.amount != null && <p className="font-black text-pink">{vnd(detail.amount)}</p>}
            {detail.status && <Badge tone={detail.status === 'done' ? 'ok' : 'warn'}>{detail.status === 'done' ? 'Hoàn tất' : 'Chờ xác nhận'}</Badge>}
            {detail.audit && (
              <div className="rounded-2xl bg-white/60 p-3">
                <p className="h3">Nhật ký kiểm toán (cũ → mới)</p>
                {Object.keys(detail.audit.next).map((k) => (
                  <p key={k} className="mt-1 break-all text-xs"><b>{k}</b>: <span className="text-[#a56a00]">{JSON.stringify(detail.audit!.old[k])}</span> → <span className="text-[#1c9a62]">{JSON.stringify(detail.audit!.next[k])}</span></p>
                ))}
              </div>
            )}
            <p className="muted !text-[11px]">Mã: {detail.id}</p>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!voidId} danger title="Huỷ khoản chờ xác nhận?" message="Khoản này sẽ không được tính vào heo. Bản ghi vẫn được giữ lại trong nhật ký để minh bạch." confirmLabel="Huỷ khoản" onClose={() => setVoidId(null)} onConfirm={() => voidId && run(repo.voidContribution(voidId))} />
    </div>
  )
}
