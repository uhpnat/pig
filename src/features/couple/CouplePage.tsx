import { Copy, Download, RefreshCw, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Card, Chip, ConfirmDialog, ProgressBar, Toggle } from '@/components/ui'
import { incomeShares, plannedShares } from '@/domain/engine'
import { durationLabel, fmtDate, fmtDateTime, pct, vnd } from '@/domain/format'
import { actualShares } from '@/domain/stats'
import { useChallenges, useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import { EditRulesDialog } from './EditRulesDialog'
import { GoogleSheetsCard } from './GoogleSheetsCard'
import { InstallGuide } from './InstallGuide'

const MODE = { proportional: 'Theo thu nhập', equal: 'Chia đều', custom: 'Tuỳ chỉnh' } as const

export default function CouplePage() {
  const j = useJourney()
  const { state, repo, run, confirmed, progress, toast } = useStore()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [install, setInstall] = useState(false)
  const [del, setDel] = useState(false)
  const done = useChallenges().filter((c) => c.status === 'completed')
  const s = state.settings
  const inc = incomeShares(j), plan = plannedShares(j), actual = actualShares(state.contributions)
  const changes = state.activity.filter((a) => a.type === 'settings').slice(0, 5)

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast('Đã sao chép 📋') } catch { toast('Không sao chép được – hãy chép tay nhé', 'error') }
  }
  const exportData = async () => {
    const blob = new Blob([await repo.exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'piggy-duo-export.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  const set = (p: Parameters<typeof repo.updateSettings>[0]) => run(repo.updateSettings(p))

  return (
    <div className="px-4 pt-4">
      <h1 className="h1">Của chúng mình ❤️</h1>
      <div className="mt-3 overflow-hidden rounded-[34px] border-[3px] border-white shadow-[0_14px_30px_rgba(100,160,255,.3)]"><img src={IMG.duo} alt="Hai bạn và chú heo" className="block w-full" /></div>
      <p className="mt-2.5 text-center font-extrabold">Cùng nhau, chúng ta có thể<br />đạt được nhiều hơn! 💕</p>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          {(['a', 'b'] as const).map((k) => (
            <div key={k} className="text-center">
              <Avatar value={j.members[k].avatar} size={56} className="mx-auto" />
              <p className="h3 mt-1">{j.members[k].name}</p>
              <p className="muted !text-[11px]">{j.members[k].role === 'owner' ? 'Chủ hành trình' : 'Thành viên'} · từ {fmtDate(j.members[k].joinedAt)}</p>
              <p className="muted">{vnd(j.members[k].income)}/tháng</p>
              <p className="mt-1 text-sm font-black">{vnd(confirmed[k])}</p>
              <ProgressBar value={actual[k] * 100} className="!mt-1 !h-2" label={`Thực góp ${j.members[k].name}`} />
              <p className="muted mt-1 !text-[11px]">Thu nhập {pct(inc[k] * 100)} · Kế hoạch {pct(plan[k] * 100)} · Thực góp {pct(actual[k] * 100)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        {[['Mục tiêu chung', vnd(j.goal)], ['Đã tiết kiệm', `${vnd(confirmed.total)} (${pct(progress)})`], ['Thời gian', `${durationLabel(j.months)} · ${fmtDate(j.startDate)} → ${fmtDate(j.endDate)}`], ['Cách chia', MODE[j.fairness]], ['Xác nhận khoản góp', j.requireConfirmation ? 'Bắt buộc' : 'Tự động']].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1 text-sm"><span className="muted">{k}</span><b className="text-right">{v}</b></div>
        ))}
      </Card>

      <Card>
        <h2 className="h3">🏆 Cột mốc & thành tựu chung</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {state.milestonesReached.map((m) => <span key={m} className="pill">🎯 {m}%</span>)}
          {done.map(({ def }) => <span key={def.id} className="pill">{def.reward.icon} {def.title}</span>)}
          {!state.milestonesReached.length && !done.length && <p className="muted">Chưa có thành tựu – cứ từ từ nhé 🐷</p>}
        </div>
      </Card>

      <GoogleSheetsCard />

      <Card>
        <h2 className="h3">💌 Mời người ấy</h2>
        {state.invite ? (
          <>
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/60 p-3">
              <div><p className="muted !text-xs">Mã mời (hết hạn {fmtDateTime(state.invite.expiresAt, j.timezone)})</p><p className="text-2xl font-black tracking-[.2em]">{state.invite.code}</p></div>
              <div className="flex gap-2">
                <button type="button" aria-label="Sao chép mã" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow" onClick={() => copy(state.invite!.code)}><Copy size={18} /></button>
                <button type="button" aria-label="Tạo mã mới" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow" onClick={() => run(repo.regenerateInvite())}><RefreshCw size={18} /></button>
              </div>
            </div>
            <p className="muted mt-2 !text-xs">Chế độ demo lưu dữ liệu trên máy này (đồng bộ giữa các tab). Để dùng trên 2 điện thoại, kết nối Supabase – xem README.</p>
          </>
        ) : <p className="muted mt-1">Chưa có mã mời.</p>}
      </Card>

      <Card>
        <h2 className="h3">⚙️ Cài đặt</h2>
        <div className="mt-2 grid gap-2.5">
          <Button variant="ghost" size="sm" onClick={() => setEdit(true)}>✏️ Sửa mục tiêu, thu nhập & quy tắc</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/pig')}>🐷 Tuỳ chỉnh heo</Button>
        </div>
        <Toggle checked={j.revealEnabled} onChange={(v) => run(repo.updateJourney({ revealEnabled: v }))} label="Mở số tiền hằng ngày" hint="Tắt nếu muốn tạm dừng nghi thức." />
        <Toggle checked={s.sound} onChange={(v) => set({ sound: v })} label="Âm thanh" />
        <Toggle checked={s.haptics} onChange={(v) => set({ haptics: v })} label="Rung phản hồi" hint="Nếu thiết bị hỗ trợ." />
        <Toggle checked={s.animations === 'auto'} onChange={(v) => set({ animations: v ? 'auto' : 'off' })} label="Hiệu ứng chuyển động" hint="Tự tôn trọng cài đặt “giảm chuyển động” của hệ điều hành." />
        <span className="label">Giao diện</span>
        <div className="flex gap-2">{([['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']] as const).map(([id, l]) => <Chip key={id} on={s.theme === id} onClick={() => set({ theme: id })}>{l}</Chip>)}</div>
        <div className="mt-3 grid gap-2.5">
          <Button variant="ghost" size="sm" onClick={() => nav('/notifications')}>🔔 Thông báo</Button>
          <Button variant="ghost" size="sm" onClick={() => setInstall(true)}><Smartphone size={16} className="mr-1 inline" /> Cài đặt app</Button>
          <Button variant="ghost" size="sm" onClick={exportData}><Download size={16} className="mr-1 inline" /> Xuất dữ liệu</Button>
          <Button size="sm" onClick={() => setDel(true)} className="!bg-none !bg-[#e5484d] !shadow-none">🗑️ Xoá hành trình</Button>
        </div>
      </Card>

      <Card>
        <h2 className="h3">📝 Nhật ký thay đổi quy tắc</h2>
        {changes.length ? changes.map((c) => <p key={c.id} className="muted mt-1.5 !text-xs">{fmtDateTime(c.at, j.timezone)} – {c.description}</p>) : <p className="muted mt-1">Chưa có thay đổi nào.</p>}
      </Card>
      <p className="muted mt-4 pb-2 text-center !text-[11px]">Piggy Duo chỉ ghi lại cam kết và khoản góp, không giữ hay chuyển tiền thật.</p>

      <EditRulesDialog open={edit} onClose={() => setEdit(false)} />
      <InstallGuide open={install} onClose={() => setInstall(false)} />
      <ConfirmDialog open={del} danger title="Xoá toàn bộ hành trình?" message="Mọi khoản góp, nhật ký và thử thách trên máy này sẽ bị xoá và không thể hoàn tác. Hãy xuất dữ liệu trước nếu cần lưu lại." confirmLabel="Xoá hành trình" onClose={() => setDel(false)} onConfirm={async () => { if (await run(repo.reset())) nav('/welcome') }} />
    </div>
  )
}
