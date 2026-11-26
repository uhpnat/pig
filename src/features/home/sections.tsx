import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Avatar, Badge, Button, Card, ProgressBar } from '@/components/ui'
import { actualShares, confirmedTotals, estimateCompletion } from '@/domain/stats'
import { incomeShares, plannedShares } from '@/domain/engine'
import { diffDays, fmtDate, millions, pct, vnd } from '@/domain/format'
import { useJourney, useStore } from '@/hooks/useStore'

export function HomeHeader() {
  const j = useJourney()
  const { unread } = useStore()
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex shrink-0 items-center">
        <Avatar value={j.members.a.avatar} size={46} />
        <Avatar value={j.members.b.avatar} size={46} className="-ml-4" />
      </div>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="h2 truncate">{j.name} 💗</h1>
        <p className="muted !text-xs">Cùng nhau tiết kiệm, cùng nhau hạnh phúc!</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link to="/notifications" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-vio shadow">
          <Bell size={20} />
          {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#ff4d6d] px-1 text-[10px] font-black text-white">{unread}</span>}
        </Link>
      </div>
    </header>
  )
}

export function SavingsCard() {
  const j = useJourney()
  const { state, confirmed, pending, progress, today } = useStore()
  const eta = estimateCompletion(j, state.contributions, today)
  return (
    <Card className="!mt-2 !border-[#e6ffd6] text-white" style={{ background: 'linear-gradient(180deg,#a6e27e,#5fbf6e)' }}>
      <p className="text-sm font-extrabold opacity-95">Đã tiết kiệm (đã xác nhận)</p>
      <p className="text-[44px] font-black leading-none tracking-tight [text-shadow:0_3px_0_rgba(30,110,60,.35)]"><AnimatedNumber value={progress} format={(n) => pct(n)} /></p>
      <p className="mt-1 font-extrabold"><AnimatedNumber value={confirmed.total} format={vnd} /> / {vnd(j.goal)}</p>
      <ProgressBar value={progress} className="mt-2.5" track="rgba(255,255,255,.4)" label="Tiến độ mục tiêu" />
      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-extrabold">
        <p>Còn lại<br /><span className="text-base">{vnd(Math.max(0, j.goal - confirmed.total))}</span></p>
        <p className="text-right">Dự kiến xong*<br /><span className="text-base">{eta ? fmtDate(eta.date) : 'Chưa đủ dữ liệu'}</span></p>
      </div>
      {pending.total > 0 && <p className="mt-2 rounded-xl bg-white/25 px-3 py-1.5 text-xs font-extrabold">⏳ {vnd(pending.total)} đang chờ xác nhận – chưa tính vào heo</p>}
      <p className="mt-2 text-[11px] font-semibold opacity-90">*Ước tính từ số tiền đã xác nhận, không phải cam kết.</p>
    </Card>
  )
}

export function MemberCards() {
  const j = useJourney()
  const { state } = useStore()
  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const inc = incomeShares(j)
  const plan = plannedShares(j)
  return (
    <Card className="!mt-3">
      <div className="grid grid-cols-2 gap-4">
        {(['a', 'b'] as const).map((k) => {
          const m = j.members[k]
          return (
            <div key={k}>
              <div className="flex items-center gap-2"><Avatar value={m.avatar} size={38} /><div className="min-w-0"><p className="h3 truncate">{m.name}</p><p className="text-base font-black">{millions(t[k])}</p></div></div>
              <ProgressBar value={actual[k] * 100} className="!mt-2 !h-2" label={`Đóng góp thực tế của ${m.name}`} />
              <dl className="mt-1.5 space-y-0.5 text-[11px]">
                <div className="flex justify-between"><dt className="muted !text-[11px]">Thực góp</dt><dd className="font-black">{pct(actual[k] * 100)}</dd></div>
                <div className="flex justify-between"><dt className="muted !text-[11px]">Kế hoạch</dt><dd className="font-black">{pct(plan[k] * 100)}</dd></div>
                <div className="flex justify-between"><dt className="muted !text-[11px]">Thu nhập</dt><dd className="font-black">{pct(inc[k] * 100)}</dd></div>
              </dl>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function DailyCard({ mood }: { mood?: string }) {
  const j = useJourney()
  const { state, today, goalReached } = useStore()
  const nav = useNavigate()
  void mood
  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')

  if (goalReached) {
    return (
      <Card className="text-center"><h2 className="h2">🎉 Hoàn thành mục tiêu!</h2><p className="muted mt-1">Hai bạn đã chạm đích. Tạo hành trình mới ở tab “Của chúng mình”.</p></Card>
    )
  }
  if (!j.revealEnabled && !reveal) {
    return <Card className="text-center"><h2 className="h3">Mở số tiền hằng ngày đang tắt</h2><p className="muted mt-1">Bật lại trong Cài đặt của “Của chúng mình”.</p></Card>
  }
  if (!reveal) {
    return (
      <Card className="text-center">
        <h2 className="text-base font-black">🐷 Hôm nay tụi mình góp bao nhiêu nhỉ?</h2>
        <p className="muted mb-3 mt-1">Một lần mỗi ngày, cả hai cùng xem kết quả.</p>
        <Button onClick={() => nav('/reveal')}>MỞ SỐ TIỀN HÔM NAY</Button>
      </Card>
    )
  }
  return (
    <Card>
      <div className="flex items-center justify-between"><h2 className="h3">Kết quả hôm nay</h2><Badge tone={allDone ? 'ok' : 'warn'}>{allDone ? 'Đã xác nhận đủ' : 'Chờ xác nhận'}</Badge></div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
        {(['a', 'b'] as const).map((k) => {
          const c = cs.find((x) => x.member === k)
          return (
            <div key={k}>
              <Avatar value={j.members[k].avatar} size={48} className="mx-auto" />
              <p className="mt-1 text-lg font-black text-pink">+{vnd(reveal.amounts[k])}</p>
              <p className="muted !text-xs">{j.members[k].name} {c?.status === 'confirmed' ? '✅' : '⏳'}</p>
            </div>
          )
        })}
      </div>
      <div className="mt-3"><Button variant="violet" onClick={() => nav('/reveal')}>{allDone ? 'Xem chi tiết' : 'Xem & xác nhận'}</Button></div>
    </Card>
  )
}

export function GoalCard() {
  const j = useJourney()
  const { confirmed, today, state } = useStore()
  const left = Math.max(0, diffDays(today, j.endDate))
  const eta = estimateCompletion(j, state.contributions, today)
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>🏆</span><div><p className="muted">Mục tiêu của chúng mình</p><p className="text-lg font-black">{vnd(j.goal)}</p></div></div>
        <div className="text-right"><p className="muted">Còn lại</p><p className="h3">{left >= 60 ? `${Math.round(left / 30)} tháng` : `${left} ngày`}</p></div>
      </div>
      <p className="muted mt-2 !text-xs">Còn thiếu {vnd(Math.max(0, j.goal - confirmed.total))} · Kết thúc {fmtDate(j.endDate)}{eta ? ` · Ước tính xong ${fmtDate(eta.date)}` : ''}</p>
    </Card>
  )
}

