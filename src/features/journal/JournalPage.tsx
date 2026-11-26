import { Calendar, ChevronLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CoinStackSticker, MoneyBagSticker, StarSticker } from '@/components/Stickers'
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Modal } from '@/components/ui'
import { fmtDate, fmtDateTime, vnd } from '@/domain/format'
import type { Activity, ActivityType } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'

type Filter = 'all' | 'money' | 'challenge' | 'milestone'
const FILTERS: { id: Filter; label: string; types?: ActivityType[] }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'money', label: 'Góp tiền', types: ['contribution', 'confirmation', 'reveal'] },
  { id: 'challenge', label: 'Thử thách', types: ['challenge'] },
  { id: 'milestone', label: 'Cột mốc', types: ['milestone'] },
]

function TimelineIcon({ a, avatar }: { a: Activity; avatar?: string }) {
  if ((a.type === 'confirmation' || a.type === 'contribution') && avatar) {
    return (
      <div className="relative z-10 rounded-full border-2 border-white bg-white p-0.5 shadow-md">
        <Avatar value={avatar} size={44} />
      </div>
    )
  }
  return (
    <div className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white bg-white shadow-md">
      {a.type === 'milestone' ? (
        <StarSticker size={34} />
      ) : a.type === 'reveal' ? (
        <CoinStackSticker size={34} />
      ) : (
        <MoneyBagSticker size={34} />
      )}
    </div>
  )
}

export default function JournalPage() {
  const j = useJourney()
  const { state, repo, run, toast, celebrate } = useStore()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [showSearch, setShowSearch] = useState(false)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [detail, setDetail] = useState<Activity | null>(null)
  const [voidId, setVoidId] = useState<string | null>(null)

  const list = useMemo(() => {
    const types = FILTERS.find((f) => f.id === filter)?.types
    const needle = q.trim().toLowerCase()
    return state.activity.filter(
      (a) =>
        (!types || types.includes(a.type)) &&
        (!from || a.at.slice(0, 10) >= from) &&
        (!needle || `${a.title} ${a.description ?? ''}`.toLowerCase().includes(needle)),
    )
  }, [state.activity, filter, q, from])

  const pending = state.contributions.filter((c) => c.status === 'pending')

  const confirm = async (id: string) => {
    const before = state.milestonesReached.length
    const out = await run(repo.confirmContribution(id))
    if (out) {
      toast('Đã xác nhận khoản góp 💰')
      if (out.milestonesReached.length > before) celebrate(['🎉', '🎆', '🪙'])
    }
  }

  return (
    <div
      className="min-h-[100dvh] px-4 pb-[calc(96px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #e0f2fe 0%, #f5efff 38%, #ffeef5 100%)',
      }}
    >
      {/* Header matching 05_savings_journal.png */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => nav('/')}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="text-[20px] font-black text-[#172554]">Nhật ký tiết kiệm</h1>
        <button
          type="button"
          aria-label="Tìm kiếm & lọc ngày"
          onClick={() => setShowSearch((s) => !s)}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#ff3b6b] shadow-sm"
        >
          <Calendar size={19} strokeWidth={2.3} />
        </button>
      </div>

      {/* 4 Pill Filter Tabs matching 05_savings_journal.png */}
      <div className="mt-3.5 grid grid-cols-4 gap-2" role="group" aria-label="Lọc loại sự kiện">
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`cursor-pointer rounded-full border-0 py-2 text-[13px] font-black transition-all ${
                active
                  ? 'bg-[#d8edff] text-[#0369a1] shadow-sm'
                  : 'bg-white/70 text-[#475569]'
              }`}
              style={{ fontFamily: 'inherit' }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {showSearch && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-white/85 p-3 shadow-sm">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
            <input
              className="field !py-2 !pl-9 !text-sm"
              placeholder="Tìm sự kiện..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="flex items-center justify-between text-xs font-extrabold text-[#1e1b4b]">
            <span>Lọc từ ngày:</span>
            <input
              type="date"
              className="field !w-auto !px-2.5 !py-1.5 !text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Pending confirmations banner */}
      {pending.length > 0 && (
        <Card className="!mt-3.5 !bg-[#fff8e6]">
          <h2 className="h3 text-[#92400e]">⏳ Đang chờ xác nhận ({pending.length})</h2>
          <ul className="mt-2 space-y-2">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <Avatar value={j.members[c.member].avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#1e1b4b]">
                    {j.members[c.member].name} · {vnd(c.amount)}
                  </p>
                  <p className="muted !text-[11px]">{fmtDate(c.date)}</p>
                </div>
                {!c.revealId && (
                  <button type="button" className="chip" onClick={() => setVoidId(c.id)}>
                    Huỷ
                  </button>
                )}
                <Button size="sm" block={false} onClick={() => confirm(c.id)}>
                  Xác nhận
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Vertical Timeline List matching 05_savings_journal.png */}
      <div className="relative mt-4">
        {list.length > 0 ? (
          <div className="relative space-y-3">
            {/* Vertical blue connector line */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-5 left-6 top-3 w-0.5 bg-[#bae6fd]"
            />
            {list.map((a) => {
              const m = a.member ? j.members[a.member] : undefined
              const cleanTitle = a.title.replace(/^[^\p{L}\p{N}]+/u, '')
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setDetail(a)}
                  className="relative flex w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent p-0 text-left"
                  style={{ fontFamily: 'inherit' }}
                >
                  <TimelineIcon a={a} avatar={m?.avatar} />
                  <div className="min-w-0 flex-1 rounded-[22px] border border-white bg-white/95 px-4 py-3 shadow-[0_8px_20px_rgba(143,124,240,.12)]">
                    <p className="text-[15px] font-black text-[#172554]">{cleanTitle}</p>
                    {a.amount != null && a.type !== 'reveal' ? (
                      <p className="mt-0.5 text-[14px] font-black text-[#16a34a]">+{vnd(a.amount)}</p>
                    ) : a.description ? (
                      <p
                        className={`mt-0.5 text-[13px] font-extrabold ${
                          a.type === 'reveal' ? 'text-[#16a34a]' : 'text-[#334155]'
                        }`}
                      >
                        {a.description}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] font-bold text-[#64748b]">
                      {fmtDateTime(a.at, j.timezone)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="Chưa có sự kiện nào"
              hint="Mở số tiền hôm nay để bắt đầu hành trình tiết kiệm nhé!"
            />
          </Card>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết sự kiện">
        {detail && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-base font-black">{detail.title}</p>
            {detail.description && <p className="muted">{detail.description}</p>}
            <p className="muted">🕒 {fmtDateTime(detail.at, j.timezone)}</p>
            {detail.member && <p className="muted">👤 {j.members[detail.member].name}</p>}
            {detail.amount != null && <p className="font-black text-pink">{vnd(detail.amount)}</p>}
            {detail.status && (
              <Badge tone={detail.status === 'done' ? 'ok' : 'warn'}>
                {detail.status === 'done' ? 'Hoàn tất' : 'Chờ xác nhận'}
              </Badge>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!voidId}
        danger
        title="Huỷ khoản chờ xác nhận?"
        message="Khoản này sẽ không được tính vào heo. Bản ghi vẫn được giữ lại trong nhật ký để minh bạch."
        confirmLabel="Huỷ khoản"
        onClose={() => setVoidId(null)}
        onConfirm={() => voidId && run(repo.voidContribution(voidId))}
      />
    </div>
  )
}
