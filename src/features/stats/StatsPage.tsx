import { ChevronLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, EmptyState } from '@/components/ui'
import { incomeShares, monthlyBudget, plannedShares } from '@/domain/engine'
import { addDays, fmtDate, millions, pct, vnd, weekStart } from '@/domain/format'
import { actualShares, bestStreak, confirmedTotals, cumulativeSeries, currentStreak, dailySeries, estimateCompletion, inPeriod, monthlySeries, PERIOD_LABEL, sumBetween, weeklySeries, type Period } from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'

const A = '#ff7a9c', B = '#8f7cf0'
const tip = { contentStyle: { borderRadius: 14, border: 0, fontWeight: 700, fontSize: 12 }, formatter: (v: unknown) => vnd(Number(v)) }

export default function StatsPage() {
  const j = useJourney()
  const { state, today, progress, motionOff } = useStore()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('3m')

  const d = useMemo(() => {
    const cs = state.contributions
    const inP = inPeriod(cs, period, today)
    const revs = inPeriod(state.reveals, period, today)
    const confirmedInP = inP.filter((c) => c.status === 'confirmed')
    const days = new Set(confirmedInP.map((c) => c.date)).size
    const total = confirmedTotals(cs)
    return {
      total, inPeriod: confirmedTotals(inP), eta: estimateCompletion(j, cs, today),
      monthly: monthlySeries(inP), weekly: weeklySeries(inP), daily: dailySeries(revs).slice(-14), cumulative: cumulativeSeries(inP),
      week: sumBetween(cs, weekStart(today), addDays(weekStart(today), 6)),
      month: sumBetween(cs, `${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`),
      todaySum: sumBetween(cs, today, today),
      avg: days ? confirmedTotals(inP).total / days : 0,
      streak: currentStreak(cs, today), best: bestStreak(cs), actual: actualShares(cs),
    }
  }, [state, period, today, j])

  const plan = plannedShares(j), inc = incomeShares(j), budget = monthlyBudget(j)
  const monthPlannedVsActual = [{ label: 'Tháng này', Kế_hoạch: budget, Thực_tế: d.month }]
  const ratio = [{ name: j.members.a.name, value: d.total.a || 0 }, { name: j.members.b.name, value: d.total.b || 0 }]
  const empty = d.total.total === 0
  const insight = empty ? 'Chưa có khoản góp nào được xác nhận. Mở số tiền hôm nay để bắt đầu 🐷'
    : d.streak >= 3 ? `Hai bạn đang giữ nhịp ${d.streak} ngày liên tiếp – tuyệt vời! 🔥`
    : `Đã tiết kiệm ${pct(progress)} mục tiêu. Mỗi ngày một chút là đủ 💗`

  return (
    <div className="px-4 pb-10 pt-3.5">
      <button type="button" onClick={() => nav('/')} className="chip flex items-center gap-1"><ChevronLeft size={16} /> Quay lại</button>
      <h1 className="h1 mt-2">Thống kê</h1>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Khoảng thời gian">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <Chip key={p} on={period === p} onClick={() => setPeriod(p)} className="shrink-0">{PERIOD_LABEL[p]}</Chip>)}
      </div>

      <Card><p className="muted">Tổng đã tiết kiệm (đã xác nhận)</p><p className="text-[34px] font-black leading-tight">{vnd(d.total.total)}</p>
        <p className="muted">Mục tiêu {vnd(j.goal)} · {pct(progress)} · còn {vnd(Math.max(0, j.goal - d.total.total))}</p>
        <p className="mt-2 rounded-2xl bg-vio/10 p-3 text-sm font-bold">💡 {insight}</p></Card>

      <div className="mt-3.5 grid grid-cols-2 gap-3">
        {[['Hôm nay', vnd(d.todaySum)], ['Tuần này', vnd(d.week)], ['Tháng này', vnd(d.month)], ['TB mỗi ngày góp', vnd(d.avg)], ['Chuỗi hiện tại', `${d.streak} ngày`], ['Chuỗi dài nhất', `${d.best} ngày`]].map(([k, v]) => (
          <div key={k} className="card !mt-0 !p-3.5"><p className="muted !text-xs">{k}</p><p className="text-base font-black">{v}</p></div>
        ))}
      </div>

      {empty ? <Card><EmptyState title="Chưa có dữ liệu để vẽ biểu đồ" hint="Biểu đồ sẽ xuất hiện sau khoản góp đầu tiên." /></Card> : (
        <>
          <Card><h2 className="h3">Tiến độ tích lũy</h2><div className="mt-2 h-48" role="img" aria-label="Biểu đồ tiến độ tích lũy">
            <ResponsiveContainer><AreaChart data={d.cumulative}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={A} stopOpacity={0.5} /><stop offset="1" stopColor={A} stopOpacity={0.05} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#8f7cf033" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={millions} tick={{ fontSize: 10 }} width={42} /><Tooltip {...tip} />
              <Area type="monotone" dataKey="total" name="Tích lũy" stroke={A} strokeWidth={3} fill="url(#cg)" isAnimationActive={!motionOff} /></AreaChart></ResponsiveContainer></div></Card>

          <Card><h2 className="h3">Số tiền mở mỗi ngày (14 ngày gần nhất)</h2><div className="mt-2 h-48" role="img" aria-label="Biểu đồ số tiền mỗi ngày">
            <ResponsiveContainer><BarChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="#8f7cf033" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={millions} tick={{ fontSize: 10 }} width={42} /><Tooltip {...tip} /><Legend />
              <Bar dataKey="a" name={j.members.a.name} fill={A} radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /><Bar dataKey="b" name={j.members.b.name} fill={B} radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /></BarChart></ResponsiveContainer></div></Card>

          <Card><h2 className="h3">Theo tuần</h2><div className="mt-2 h-44" role="img" aria-label="Biểu đồ theo tuần">
            <ResponsiveContainer><BarChart data={d.weekly}><CartesianGrid strokeDasharray="3 3" stroke="#8f7cf033" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={millions} tick={{ fontSize: 10 }} width={42} /><Tooltip {...tip} />
              <Bar dataKey="a" stackId="s" name={j.members.a.name} fill={A} isAnimationActive={!motionOff} /><Bar dataKey="b" stackId="s" name={j.members.b.name} fill={B} radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /></BarChart></ResponsiveContainer></div></Card>

          <Card><h2 className="h3">Theo tháng</h2><div className="mt-2 h-44" role="img" aria-label="Biểu đồ theo tháng">
            <ResponsiveContainer><BarChart data={d.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#8f7cf033" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={millions} tick={{ fontSize: 10 }} width={42} /><Tooltip {...tip} />
              <Bar dataKey="total" name="Tổng" fill="#5fbf6e" radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /></BarChart></ResponsiveContainer></div></Card>

          <Card><h2 className="h3">Kế hoạch so với thực tế (tháng này)</h2><div className="mt-2 h-40">
            <ResponsiveContainer><BarChart data={monthPlannedVsActual}><CartesianGrid strokeDasharray="3 3" stroke="#8f7cf033" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={millions} tick={{ fontSize: 10 }} width={42} /><Tooltip {...tip} /><Legend />
              <Bar dataKey="Kế_hoạch" name="Kế hoạch" fill="#cfc8ee" radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /><Bar dataKey="Thực_tế" name="Thực tế (đã xác nhận)" fill="#5fbf6e" radius={[6, 6, 0, 0]} isAnimationActive={!motionOff} /></BarChart></ResponsiveContainer></div></Card>

          <Card><h2 className="h3">Tỷ lệ đóng góp thực tế</h2><div className="h-44" role="img" aria-label="Biểu đồ tỷ lệ đóng góp">
            <ResponsiveContainer><PieChart><Pie data={ratio} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={3} isAnimationActive={!motionOff}>{ratio.map((_, i) => <Cell key={i} fill={i ? B : A} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer></div></Card>
        </>
      )}

      <Card>
        <h2 className="h3">Ba tỷ lệ khác nhau</h2>
        <table className="mt-2 w-full text-[13px]"><thead><tr className="muted text-left"><th /><th>{j.members.a.name}</th><th>{j.members.b.name}</th></tr></thead><tbody className="font-extrabold">
          <tr><td className="muted py-1">Thu nhập</td><td>{pct(inc.a * 100)}</td><td>{pct(inc.b * 100)}</td></tr>
          <tr><td className="muted py-1">Kế hoạch góp</td><td>{pct(plan.a * 100)}</td><td>{pct(plan.b * 100)}</td></tr>
          <tr><td className="muted py-1">Thực tế đã góp</td><td>{pct(d.actual.a * 100)}</td><td>{pct(d.actual.b * 100)}</td></tr></tbody></table>
      </Card>
      <Card><h2 className="h3">Dự báo (ước tính)</h2>
        <p className="mt-1 text-sm font-bold">{d.eta ? `Với nhịp đã xác nhận hiện tại, hai bạn có thể đạt mục tiêu khoảng ${fmtDate(d.eta.date)} (còn ~${d.eta.days} ngày).` : 'Cần thêm khoản góp đã xác nhận để dự báo.'}</p>
        <p className="muted mt-1 !text-xs">Đây chỉ là ước tính từ số tiền đã xác nhận, không phải cam kết. Ngày kết thúc kế hoạch: {fmtDate(j.endDate)}.</p></Card>
    </div>
  )
}
