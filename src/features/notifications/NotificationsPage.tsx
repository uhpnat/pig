import { BellRing, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Toggle } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import { fireBrowserNotification, notificationRoute } from '@/lib/pushNotify'
import type { NotificationType } from '@/domain/types'

const ICON: Record<NotificationType, string> = {
  reveal: '🐷',
  partner_confirmed: '💰',
  pending: '⏳',
  milestone: '🎉',
  challenge: '🏅',
  recap: '📬',
  goal: '🎆',
  invite: '💌',
}

export default function NotificationsPage() {
  const j = useJourney()
  const { state, repo, run, toast } = useStore()
  const nav = useNavigate()
  const { perm, request } = usePushPermission()
  const s = state.settings
  const hasToday = state.reveals.some(
    (r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }),
  )

  useEffect(() => {
    if (state.notifications.some((n) => !n.read)) {
      const t = setTimeout(() => run(repo.markNotificationsRead()), 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const enablePush = async () => {
    const r = await request()
    if (r === 'granted') {
      toast('Đã bật thông báo đẩy trên thiết bị! 🔔')
      await fireBrowserNotification(
        '🐷 Piggy Duo đã bật thông báo!',
        'Mỗi khi hai bạn mở số tiền hoặc xác nhận góp, thông báo sẽ hiện ngay trên màn hình.',
        undefined,
        '/notifications',
      )
    } else if (r === 'denied') {
      toast('Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.', 'error')
    } else if (r === 'unsupported') {
      toast(
        'Trên iPhone, hãy chọn "Thêm vào Màn hình chính" rồi mở app từ màn hình chính để bật thông báo đẩy nhé!',
        'error',
      )
    }
  }

  const testPush = async () => {
    if (perm !== 'granted') {
      await enablePush()
      return
    }
    await fireBrowserNotification(
      '🐷 Thử chuông Piggy Duo!',
      `Heo đất "${j.name}" chào ${j.members.a.name} & ${j.members.b.name} 💗`,
      undefined,
      '/',
    )
    toast('Đã bắn thử thông báo đẩy! 🔔')
  }

  return (
    <div
      className="min-h-[100dvh] px-4 pb-10"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #fce7f3 0%, #f5efff 40%, #ffeef5 100%)',
      }}
    >
      <button
        type="button"
        onClick={() => nav('/')}
        className="chip flex items-center gap-1"
      >
        <ChevronLeft size={16} /> Trang chủ
      </button>
      <h1 className="h1 mt-2">Thông báo</h1>
      {!hasToday && (
        <Card className="!bg-[#fff7e0]">
          <p className="h3">🐷 Hôm nay chưa mở số tiền!</p>
          <div className="mt-2">
            <Button size="sm" block={false} onClick={() => nav('/reveal')}>
              Mở ngay
            </Button>
          </div>
        </Card>
      )}
      <Card>
        {state.notifications.length ? (
          <div className="divide-y divide-dashed divide-vio/20">
            {state.notifications.map((n) => {
              const target = notificationRoute(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => nav(target.to)}
                  className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-1 py-3 text-left transition-colors hover:bg-pink-50/60 active:bg-pink-100/60 rounded-2xl"
                  style={{ fontFamily: 'inherit' }}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow">
                    {ICON[n.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="h3 flex items-center gap-1.5 text-[#1e1b4b]">
                      <span className="truncate">{n.title}</span>
                      {!n.read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-[#ff4d6d]"
                          aria-label="Chưa đọc"
                        />
                      )}
                    </p>
                    <p className="muted !text-xs">{n.message}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="muted !text-[11px]">{fmtDateTime(n.at, j.timezone)}</span>
                      <span className="text-[11px] font-black text-indigo-600">
                        {target.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" />
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState
            emoji="🔔"
            title="Chưa có thông báo"
            hint="Khi người ấy mở số tiền hay xác nhận, bạn sẽ thấy ở đây."
          />
        )}
      </Card>
      <Card>
        <h2 className="h3">Tuỳ chọn thông báo</h2>
        <Toggle
          checked={s.notifyReveal}
          onChange={(v) => run(repo.updateSettings({ notifyReveal: v }))}
          label="Nhắc mở số tiền mỗi ngày"
        />
        <Toggle
          checked={s.notifyPartner}
          onChange={(v) => run(repo.updateSettings({ notifyPartner: v }))}
          label="Người ấy mở / xác nhận"
        />
        <Toggle
          checked={s.notifyRecap}
          onChange={(v) => run(repo.updateSettings({ notifyRecap: v }))}
          label="Tổng kết tuần / tháng"
        />
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/60 p-3">
          <BellRing className="shrink-0 text-vio" />
          <p className="muted flex-1 !text-xs">
            {perm === 'granted'
              ? 'Đã bật thông báo đẩy (PWA / Trình duyệt). Mỗi khi thao tác hoặc người ấy thao tác trên Google Sheet, máy sẽ báo chuông & hiện banner!'
              : perm === 'denied'
                ? 'Thông báo đang bị chặn trong cài đặt trình duyệt.'
                : perm === 'unsupported'
                  ? 'Trên iPhone: bấm Chia sẻ -> "Thêm vào Màn hình chính" rồi mở app ngoài màn hình chính để bật Push.'
                  : 'Bật thông báo đẩy lên màn hình điện thoại mỗi khi có thao tác mới.'}
          </p>
          {perm === 'default' && (
            <Button size="sm" block={false} onClick={enablePush}>
              Bật ngay
            </Button>
          )}
        </div>
        <div className="mt-3">
          <Button size="sm" variant="violet" onClick={testPush}>
            <Send size={15} className="mr-1.5 inline" /> Bắn thử thông báo đẩy ngay
          </Button>
        </div>
      </Card>
    </div>
  )
}
