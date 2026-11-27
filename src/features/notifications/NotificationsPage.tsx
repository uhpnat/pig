import { BellRing, ChevronDown, ChevronRight, ChevronUp, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PushConfigModal } from '@/components/PushConfigModal'
import { Button, Card, EmptyState, FadeInItem, PageHeader } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import type { NotificationType } from '@/domain/types'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import { isNotificationForMember, notificationRoute } from '@/lib/pushNotify'

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

const INITIAL_VISIBLE_COUNT = 5

export default function NotificationsPage() {
  const j = useJourney()
  const { state, repo, run, myMemberId, myMember, setChatOpen } = useStore()
  const nav = useNavigate()
  const { perm } = usePushPermission()

  const [configOpen, setConfigOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  const hasMyNativeSub = Boolean(myMember?.pushSubscription?.endpoint)
  const pushReady = perm === 'granted' && hasMyNativeSub

  const hasToday = state.reveals.some(
    (r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }),
  )

  // Only show notifications targeted to THIS member (Nam or Nữ) or shared ('all') notifications!
  const allNotifs = state.notifications.filter((n) => isNotificationForMember(n, myMemberId, j))

  useEffect(() => {
    if (allNotifs.some((n) => !n.read)) {
      const t = setTimeout(() => run(repo.markNotificationsRead()), 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleNotifs = allNotifs.slice(0, visibleCount)
  const remainingCount = Math.max(0, allNotifs.length - visibleCount)

  return (
    <div
      className="min-h-[100dvh] px-4 pb-10"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #fce7f3 0%, #f5efff 42%, #ffeef5 100%)',
      }}
    >
      <PageHeader
        title="Thông báo"
        onBack={() => nav('/')}
        right={
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-white bg-white/90 px-3 py-1.5 text-xs font-black text-[#1e1b4b] shadow-sm active:scale-95"
          >
            <Settings2 size={14} className="text-pink-600" />
            <span>Cài đặt chuông</span>
          </button>
        }
      />

      {/* Compact 1-Line Push Status Pill (opens PushConfigModal when clicked) */}
      <FadeInItem delay={0.04} y={10}>
        <button
          type="button"
          onClick={() => setConfigOpen(true)}
          className="mt-3 flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-2xl border-2 border-white bg-white/90 px-3.5 py-2.5 text-left shadow-sm transition-transform active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white ${
                pushReady
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-pink-500 to-violet-600'
              }`}
            >
              <BellRing size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-[#1e1b4b]">
                {pushReady
                  ? '✅ Đã bật Thông báo đẩy Logo 🐷 Piggy Duo'
                  : '🔔 Bật / Thử thông báo đẩy trên iPhone'}
              </p>
              <p className="truncate text-[10.5px] font-bold text-slate-500">
                Chạm để mở cài đặt chuông & thử thông báo 4 giây
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        </button>
      </FadeInItem>

      {!hasToday && (
        <Card className="!mt-3 !bg-[#fff7e0]" delay={0.06}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-[#1e1b4b]">🐷 Hôm nay chưa mở số tiền!</p>
            <Button size="sm" block={false} onClick={() => nav('/reveal')}>
              Mở ngay
            </Button>
          </div>
        </Card>
      )}

      {/* Paginated Notification History (Compact: shows 5 by default so page is never too long!) */}
      <Card className="!mt-3" delay={0.08}>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="h3">Hoạt động & Thông báo</h2>
          {allNotifs.length > 0 && (
            <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10.5px] font-black text-pink-700">
              Hiển thị {visibleNotifs.length}/{allNotifs.length}
            </span>
          )}
        </div>

        {allNotifs.length ? (
          <>
            <div className="divide-y divide-dashed divide-vio/20">
              {visibleNotifs.map((n) => {
                const target = notificationRoute(n)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (n.type === 'chat') setChatOpen(true)
                      else nav(target.to)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border-0 bg-transparent px-1 py-2.5 text-left transition-colors hover:bg-pink-50/60 active:bg-pink-100/60"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg shadow-sm">
                      {ICON[n.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-xs font-black text-[#1e1b4b]">
                        <span className="truncate">{n.title}</span>
                        {!n.read && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-[#ff4d6d]"
                            aria-label="Chưa đọc"
                          />
                        )}
                      </p>
                      <p className="line-clamp-1 text-[11.5px] font-bold text-slate-600">{n.message}</p>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-slate-400">
                          {fmtDateTime(n.at, j.timezone)}
                        </span>
                        <span className="text-[10.5px] font-black text-indigo-600">
                          {target.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  </button>
                )
              })}
            </div>

            {/* Expand / Collapse Pagination Controls */}
            {allNotifs.length > INITIAL_VISIBLE_COUNT && (
              <div className="mt-2.5 flex items-center justify-center gap-2 border-t border-pink-100 pt-2.5">
                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 8)}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-black text-indigo-700 active:scale-95"
                  >
                    <ChevronDown size={14} />
                    <span>Xem thêm {Math.min(8, remainingCount)} thông báo cũ</span>
                  </button>
                )}
                {visibleCount > INITIAL_VISIBLE_COUNT && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE_COUNT)}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 active:scale-95"
                  >
                    <ChevronUp size={14} />
                    <span>Thu gọn</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            emoji="🔔"
            title="Chưa có thông báo"
            hint="Khi người ấy mở số tiền hay xác nhận, bạn sẽ thấy ở đây."
          />
        )}
      </Card>

      <PushConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  )
}
