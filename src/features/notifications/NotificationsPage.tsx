import { BellRing, Check, ChevronRight, Copy, ExternalLink, Send, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, FadeInItem, PageHeader, Toggle } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import type { NotificationType } from '@/domain/types'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import {
  fireBrowserNotification,
  getNtfyTopic,
  notificationRoute,
  pushNtfyNotification,
  setNtfyTopic,
} from '@/lib/pushNotify'

const ICON: Record<NotificationType, string> = {
  reveal: '🐷',
  partner_confirmed: '💰',
  pending: '⏳',
  milestone: '🎉',
  challenge: '🏅',
  recap: '📬',
  goal: '🎆',
  invite: '💌',
  chat: '💬',
}

export default function NotificationsPage() {
  const j = useJourney()
  const { state, repo, run, toast, setChatOpen } = useStore()
  const nav = useNavigate()
  const { perm, request } = usePushPermission()
  const s = state.settings

  const [topic, setTopic] = useState(() => getNtfyTopic())
  const [testingNtfy, setTestingNtfy] = useState(false)
  const [copiedTopic, setCopiedTopic] = useState(false)

  const hasToday = state.reveals.some(
    (r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }),
  )

  useEffect(() => {
    if (state.notifications.some((n) => !n.read)) {
      const t = setTimeout(() => run(repo.markNotificationsRead()), 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveTopic = () => {
    const clean = setNtfyTopic(topic)
    setTopic(clean)
    toast(`Đã lưu kênh ntfy: ${clean} 🔔`)
  }

  const copyTopic = async () => {
    const clean = setNtfyTopic(topic)
    setTopic(clean)
    try {
      await navigator.clipboard.writeText(clean)
      setCopiedTopic(true)
      setTimeout(() => setCopiedTopic(false), 2000)
      toast(`Đã sao chép tên Topic: ${clean} 📋`)
    } catch {
      toast('Hãy sao chép thủ công mã topic ở ô bên trên nhé', 'error')
    }
  }

  const testNtfyPush = async () => {
    const clean = setNtfyTopic(topic)
    setTopic(clean)
    setTestingNtfy(true)
    try {
      const ok = await pushNtfyNotification(
        `🐷 Piggy Duo (${j.name})`,
        `Thông báo đẩy ntfy cho ${j.members.a.name} & ${j.members.b.name} đã hoạt động 24/7! 💗`,
        '/',
        clean,
      )
      if (ok) {
        toast(`Đã bắn thông báo tới kênh ntfy "${clean}"! Kiểm tra điện thoại nhé 📲`)
      } else {
        toast('Không kết nối được ntfy.sh, kiểm tra mạng rồi thử lại nhé', 'error')
      }
    } finally {
      setTestingNtfy(false)
    }
  }

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
        'Trên iPhone, hãy cài app ntfy ở khung bên trên để nhận thông báo đẩy 24/7 dễ nhất nhé!',
        'error',
      )
    }
  }

  return (
    <div
      className="min-h-[100dvh] px-4 pb-10"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #fce7f3 0%, #f5efff 42%, #ffeef5 100%)',
      }}
    >
      <PageHeader title="Thông báo" onBack={() => nav('/')} />

      {/* 1. NTFY 24/7 MOBILE PUSH NOTIFICATION CARD */}
      <FadeInItem delay={0.04} y={12}>
        <Card className="!mt-4 !border-indigo-200 !bg-gradient-to-br !from-white !via-indigo-50/40 !to-pink-50/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-pink-500 text-white shadow-sm">
                <Smartphone size={18} />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#1e1b4b]">
                  Thông báo đẩy 24/7 qua App ntfy
                </h2>
                <p className="text-[11px] font-bold text-emerald-600">
                  ⚡ Nhận thông báo ngay cả khi đã tắt hẳn app
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/90 p-3 text-xs font-bold leading-relaxed text-slate-600">
            <p className="font-black text-[#1e1b4b]">3 bước bật thông báo trên iPhone & Android:</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>
                Tải app <b>ntfy</b> miễn phí trên{' '}
                <a
                  href="https://apps.apple.com/app/ntfy/id1625396347"
                  target="_blank"
                  rel="noreferrer"
                  className="font-black text-indigo-600 underline"
                >
                  App Store (iOS) <ExternalLink size={11} className="inline" />
                </a>{' '}
                hoặc{' '}
                <a
                  href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-black text-indigo-600 underline"
                >
                  Google Play <ExternalLink size={11} className="inline" />
                </a>
                .
              </li>
              <li>
                Mở app <b>ntfy</b> → bấm dấu <b>+</b> (Subscribe to topic) → dán tên Topic bên dưới vào.
              </li>
              <li>
                Xong! Mỗi khi người ấy <b>quay số, nạp tiền (1/2), duyệt (2/2) hoặc nhắn tin</b>, máy bạn sẽ nổ chuông thông báo ngay!
              </li>
            </ol>
          </div>

          {/* Topic Input + Copy Button */}
          <div className="mt-3">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
              Mã Topic chung của hai bạn (cả 2 máy dùng chung 1 mã này)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onBlur={saveTopic}
                placeholder="piggy_vi_tram"
                className="flex-1 rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 text-sm font-black text-indigo-950 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={copyTopic}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition-transform active:scale-95"
              >
                {copiedTopic ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedTopic ? 'Đã chép' : 'Copy mã'}</span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <Button
              size="sm"
              variant="violet"
              loading={testingNtfy}
              icon={<Send size={15} />}
              onClick={testNtfyPush}
            >
              Bắn thử thông báo qua ntfy ngay
            </Button>
          </div>
        </Card>
      </FadeInItem>

      {!hasToday && (
        <Card className="!bg-[#fff7e0]" delay={0.08}>
          <p className="h3">🐷 Hôm nay chưa mở số tiền!</p>
          <div className="mt-2">
            <Button size="sm" block={false} onClick={() => nav('/reveal')}>
              Mở ngay
            </Button>
          </div>
        </Card>
      )}

      {/* 2. IN-APP NOTIFICATION HISTORY */}
      <Card delay={0.12}>
        <h2 className="h3 mb-1">Lịch sử thông báo gần đây</h2>
        {state.notifications.length ? (
          <div className="divide-y divide-dashed divide-vio/20">
            {state.notifications.map((n) => {
              const target = notificationRoute(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.type === 'chat') setChatOpen(true)
                    else nav(target.to)
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-0 bg-transparent px-1 py-3 text-left transition-colors hover:bg-pink-50/60 active:bg-pink-100/60"
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

      {/* 3. NOTIFICATION PREFERENCES */}
      <Card delay={0.16}>
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
              ? 'Đã bật thêm thông báo trình duyệt khi đang mở app.'
              : 'Ngoài app ntfy 24/7 ở trên, bạn có thể bật thêm thông báo trình duyệt.'}
          </p>
          {perm === 'default' && (
            <Button size="sm" block={false} onClick={enablePush}>
              Bật thêm
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
