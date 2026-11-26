import { BellRing, ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Toggle } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import type { NotificationType } from '@/domain/types'

const ICON: Record<NotificationType, string> = { reveal: '🐷', partner_confirmed: '💰', pending: '⏳', milestone: '🎉', challenge: '🏅', recap: '📬', goal: '🎆', invite: '💌' }

export default function NotificationsPage() {
  const j = useJourney()
  const { state, repo, run, toast } = useStore()
  const nav = useNavigate()
  const { perm, request } = usePushPermission()
  const s = state.settings
  const hasToday = state.reveals.some((r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }))

  useEffect(() => { if (state.notifications.some((n) => !n.read)) { const t = setTimeout(() => run(repo.markNotificationsRead()), 1200); return () => clearTimeout(t) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const enablePush = async () => {
    const r = await request()
    if (r === 'granted') toast('Đã bật thông báo trình duyệt 🔔')
    else if (r === 'denied') toast('Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.', 'error')
    else if (r === 'unsupported') toast('Thiết bị này chưa hỗ trợ thông báo đẩy. Thông báo trong app vẫn hoạt động.', 'error')
  }

  return (
    <div className="px-4 pb-10 pt-3.5">
      <button type="button" onClick={() => nav(-1)} className="chip flex items-center gap-1"><ChevronLeft size={16} /> Quay lại</button>
      <h1 className="h1 mt-2">Thông báo</h1>
      {!hasToday && <Card className="!bg-[#fff7e0]"><p className="h3">🐷 Hôm nay chưa mở số tiền!</p><div className="mt-2"><Button size="sm" block={false} onClick={() => nav('/reveal')}>Mở ngay</Button></div></Card>}
      <Card>
        {state.notifications.length ? state.notifications.map((n) => (
          <div key={n.id} className="flex gap-3 border-b border-dashed border-vio/25 py-3 last:border-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow">{ICON[n.type]}</span>
            <div className="min-w-0 flex-1"><p className="h3 flex items-center gap-1.5">{n.title}{!n.read && <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" aria-label="Chưa đọc" />}</p><p className="muted !text-xs">{n.message}</p><p className="muted !text-[11px]">{fmtDateTime(n.at, j.timezone)}</p></div>
          </div>
        )) : <EmptyState emoji="🔔" title="Chưa có thông báo" hint="Khi người ấy mở số tiền hay xác nhận, bạn sẽ thấy ở đây." />}
      </Card>
      <Card>
        <h2 className="h3">Tuỳ chọn thông báo</h2>
        <Toggle checked={s.notifyReveal} onChange={(v) => run(repo.updateSettings({ notifyReveal: v }))} label="Nhắc mở số tiền mỗi ngày" />
        <Toggle checked={s.notifyPartner} onChange={(v) => run(repo.updateSettings({ notifyPartner: v }))} label="Người ấy mở / xác nhận" />
        <Toggle checked={s.notifyRecap} onChange={(v) => run(repo.updateSettings({ notifyRecap: v }))} label="Tổng kết tuần / tháng" />
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/60 p-3">
          <BellRing className="shrink-0 text-vio" />
          <p className="muted flex-1 !text-xs">{perm === 'granted' ? 'Thông báo trình duyệt đã bật.' : perm === 'denied' ? 'Thông báo đang bị chặn trong trình duyệt.' : perm === 'unsupported' ? 'Thiết bị chưa hỗ trợ thông báo đẩy.' : 'Bật thông báo đẩy (tuỳ chọn). Push thật cần backend – xem README.'}</p>
          {perm === 'default' && <Button size="sm" block={false} onClick={enablePush}>Bật</Button>}
        </div>
      </Card>
    </div>
  )
}
