import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Send,
  Share,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, FadeInItem, PageHeader, Toggle } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import type { Gender, NotificationType } from '@/domain/types'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import {
  fireBrowserNotification,
  getNtfyBaseTopic,
  getNtfyTopicForGender,
  notificationRoute,
  pushNtfyNotification,
  setNtfyBaseTopic,
} from '@/lib/pushNotify'
import {
  isStandalonePwa,
  scheduleServiceWorkerNotification,
  subscribeNativeWebPush,
  triggerServerWebPush,
} from '@/lib/webPush'

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
  const { state, repo, run, toast, myMemberId, myMember, partnerMember, setChatOpen } = useStore()
  const nav = useNavigate()
  const { perm, request } = usePushPermission()
  const s = state.settings

  const [standalone, setStandalone] = useState(() => isStandalonePwa())
  const [testingNativePwa, setTestingNativePwa] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)
  const [showNtfyFallback, setShowNtfyFallback] = useState(false)

  const [baseTopic, setBaseTopic] = useState(() => getNtfyBaseTopic())
  const [testingTarget, setTestingTarget] = useState<Gender | null>(null)
  const [copiedTarget, setCopiedTarget] = useState<Gender | null>(null)

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const memberMale = isBMale ? j.members.b : j.members.a
  const memberFemale = isBMale ? j.members.a : j.members.b
  const myGender: Gender = myMember?.gender === 'male' ? 'male' : 'female'

  const topicMale = getNtfyTopicForGender('male', baseTopic)
  const topicFemale = getNtfyTopicForGender('female', baseTopic)

  const hasMyNativeSub = Boolean(myMember?.pushSubscription?.endpoint)
  const hasPartnerNativeSub = Boolean(partnerMember?.pushSubscription?.endpoint)

  const hasToday = state.reveals.some(
    (r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }),
  )

  useEffect(() => {
    setStandalone(isStandalonePwa())
    if (state.notifications.some((n) => !n.read)) {
      const t = setTimeout(() => run(repo.markNotificationsRead()), 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const enableNativePiggyPush = async () => {
    setEnablingPush(true)
    try {
      const r = await request()
      if (r === 'granted') {
        const sub = await subscribeNativeWebPush()
        if (sub && myMember) {
          await run(
            repo.updateJourney({
              members: {
                ...j.members,
                [myMemberId]: {
                  ...myMember,
                  pushSubscription: sub,
                },
              },
            }),
          )
        }
        toast('Đã bật Thông báo Trực tiếp có Logo 🐷 Piggy Duo! 🔔')
        await fireBrowserNotification(
          `🐷 ${j.name} đã bật thông báo!`,
          'Từ giờ thông báo sẽ hiện đúng Logo 🐷 Piggy Duo và chạm vào sẽ mở thẳng vào App!',
          undefined,
          '/',
        )
      } else if (r === 'denied') {
        toast('Bạn đã chặn thông báo. Hãy vào Cài đặt iPhone -> Thông báo -> Piggy Duo để bật lại nhé.', 'error')
      } else {
        toast(
          'Trên iPhone: Hãy mở Piggy Duo từ biểu tượng 🐷 ngoài Màn hình chính (không mở trong Safari) rồi bấm Bật nhé!',
          'error',
        )
      }
    } finally {
      setEnablingPush(false)
    }
  }

  /**
   * Schedules a 4-second delayed notification INSIDE the Service Worker (`e.waitUntil`).
   * Even when the user immediately swipes to the iPhone Home Screen or locks the phone,
   * the Service Worker stays alive for 4 seconds and pops up the notification on the Lock Screen
   * with the 🐷 Piggy Duo App Icon — and tapping it launches straight into the Piggy Duo app!
   */
  const testNativePwaPush = async () => {
    if (perm !== 'granted') {
      await enableNativePiggyPush()
      return
    }
    setTestingNativePwa(true)
    const targetName = myMember?.name || 'bạn'
    const title = `🐷 ${j.name} · Thông báo cho ${targetName}`
    const body = `Chạm vào thông báo này để vào thẳng App Piggy Duo (không qua Safari)! 💗`

    const scheduledInSw = await scheduleServiceWorkerNotification(title, body, '/', 4000)
    // Also trigger a server-side 4-second delayed Apple Web Push via Google Apps Script if pushSubscription exists!
    const mySub = myMember?.pushSubscription
    const cfg = repo.getSheetConfig()
    if (mySub?.endpoint) {
      void triggerServerWebPush(
        cfg.appsScriptUrl || '/api/gsheets',
        mySub,
        { title, body, route: '/' },
        4000,
        cfg.passcode,
      )
    }
    toast('⏱️ Thoát ra Màn hình chính hoặc Khóa máy ngay! Sau 4 giây thông báo Logo 🐷 Piggy Duo sẽ nổ…')

    setTimeout(async () => {
      if (!scheduledInSw) {
        await fireBrowserNotification(title, body, undefined, '/')
      }
      setTestingNativePwa(false)
    }, 4200)
  }

  const saveBaseTopic = () => {
    const clean = setNtfyBaseTopic(baseTopic)
    setBaseTopic(clean)
  }

  const copyGenderTopic = async (gender: Gender) => {
    const cleanBase = setNtfyBaseTopic(baseTopic)
    setBaseTopic(cleanBase)
    const fullTopic = getNtfyTopicForGender(gender, cleanBase)
    try {
      await navigator.clipboard.writeText(fullTopic)
      setCopiedTarget(gender)
      setTimeout(() => setCopiedTarget(null), 2000)
      toast(`Đã chép mã kênh của ${gender === 'male' ? memberMale.name : memberFemale.name}: ${fullTopic} 📋`)
    } catch {
      toast('Hãy sao chép thủ công mã kênh bên dưới nhé', 'error')
    }
  }

  const testGenderPush = async (gender: Gender, delaySec = 0) => {
    const cleanBase = setNtfyBaseTopic(baseTopic)
    setBaseTopic(cleanBase)
    const fullTopic = getNtfyTopicForGender(gender, cleanBase)
    const targetName = gender === 'male' ? memberMale.name : memberFemale.name
    setTestingTarget(gender)
    if (delaySec > 0) {
      toast(`⏱️ Đợi ${delaySec} giây sẽ gửi qua ntfy…`)
      await new Promise((r) => setTimeout(r, delaySec * 1000))
    }
    try {
      const ok = await pushNtfyNotification(
        `🐷 Chuông thử cho ${targetName} (${gender === 'male' ? 'Nam 👦' : 'Nữ 👧'})`,
        `Khi người ấy quay số, nạp tiền hoặc nhắn tin, điện thoại của ${targetName} sẽ nổ thông báo! 💗`,
        '/',
        fullTopic,
      )
      if (ok) {
        toast(`Đã bắn thông báo tới kênh ${fullTopic}! 📲`)
      } else {
        toast('Không kết nối được ntfy.sh, kiểm tra mạng rồi thử lại nhé', 'error')
      }
    } finally {
      setTestingTarget(null)
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

      {/* 1. PRIMARY: NATIVE PIGGY DUO HOME SCREEN APP PUSH (WITH 🐷 LOGO & DIRECT APP LAUNCH!) */}
      <FadeInItem delay={0.04} y={12}>
        <Card className="!mt-4 !border-2 !border-pink-300 !bg-gradient-to-br !from-white !via-pink-50/70 !to-violet-50/70 shadow-md">
          <div className="flex items-start gap-2.5">
            <img
              src="./apple-touch-icon.png"
              alt="Piggy Duo Logo"
              className="h-11 w-11 shrink-0 rounded-2xl border border-pink-200 object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white">
                  Khuyên dùng trên iPhone
                </span>
              </div>
              <h2 className="mt-1 text-sm font-black leading-snug text-[#1e1b4b]">
                Thông báo Trực Tiếp từ App Piggy Duo (Hiện Logo 🐷 & Mở thẳng vào App)
              </h2>
            </div>
          </div>

          {/* Why ntfy opened Safari vs how Native Home Screen App works */}
          <div className="mt-2.5 rounded-2xl border border-pink-200/80 bg-white/90 p-3 text-xs font-bold leading-relaxed text-slate-600">
            <p className="font-black text-[#1e1b4b]">
              💡 Vì sao trước đó không hiện Logo 🐷 và bị nhảy sang Safari?
            </p>
            <p className="mt-1 text-[11.5px]">
              Trên iPhone, mọi thông báo phát ra từ app trung gian <b>ntfy</b> đều bị Apple bắt buộc gắn logo của ntfy và ép mở link bằng trình duyệt <b>Safari</b>.
            </p>
            <p className="mt-1 text-[11.5px] text-pink-700">
              👉 Để thông báo hiện đúng <b>Logo 🐷 Piggy Duo</b> trên màn hình khóa và <b>bấm vào chuyển thẳng vào App Piggy Duo</b>, bạn hãy dùng chế độ <b>Thông báo trực tiếp của App ngoài Màn hình chính</b> bên dưới (và tắt thông báo trong app ntfy đi nhé!):
            </p>
          </div>

          {/* Status Check: Are we inside Safari or inside the Standalone Home Screen App? */}
          {!standalone ? (
            <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3 text-xs font-bold text-amber-950">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>Bạn đang mở bằng trình duyệt (Safari), chưa phải App ngoài Màn hình chính!</span>
              </div>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed">
                <li>
                  Ở thanh dưới cùng của Safari, bấm nút <b>Chia sẻ</b> (<Share size={12} className="inline" /> hình vuông có mũi tên hướng lên).
                </li>
                <li>
                  Kéo xuống chọn <b>“Thêm vào MH chính” (Add to Home Screen)</b> → bấm <b>Thêm</b>.
                </li>
                <li>
                  Thoát Safari, mở biểu tượng <b>🐷 Piggy Duo</b> ngoài Màn hình chính iPhone rồi quay lại mục này bấm <b>Bật thông báo</b>!
                </li>
              </ol>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-black text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>Tuyệt vời! Bạn đang mở trực tiếp từ App 🐷 Piggy Duo ngoài Màn hình chính.</span>
            </div>
          )}

          {/* Member Push Subscription Status Badges */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-pink-100 bg-white/90 px-2.5 py-2 text-[11px] font-bold">
              <p className="font-black text-[#1e1b4b]">
                {myGender === 'male' ? '👦' : '👧'} Máy bạn ({myMember?.name})
              </p>
              <p className={`mt-0.5 font-extrabold ${perm === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {perm === 'granted'
                  ? hasMyNativeSub
                    ? '✅ Đã kết nối Push Logo 🐷'
                    : '✅ Đã cấp quyền thông báo'
                  : '⏳ Chưa bật trên máy này'}
              </p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-white/90 px-2.5 py-2 text-[11px] font-bold">
              <p className="font-black text-[#1e1b4b]">
                {myGender === 'male' ? '👧' : '👦'} Máy {partnerMember?.name}
              </p>
              <p className={`mt-0.5 font-extrabold ${hasPartnerNativeSub ? 'text-emerald-600' : 'text-slate-500'}`}>
                {hasPartnerNativeSub ? '✅ Đã kết nối Push Logo 🐷' : '⏳ Chờ máy người ấy bấm Bật'}
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-3 grid gap-2">
            {perm !== 'granted' || !hasMyNativeSub ? (
              <Button
                size="md"
                variant="pink"
                loading={enablingPush}
                onClick={enableNativePiggyPush}
              >
                <BellRing size={16} className="mr-1 inline" />
                {perm === 'granted'
                  ? '🐷 Kích hoạt kết nối Push Logo Piggy Duo cho máy này'
                  : '🔔 Bật thông báo Logo 🐷 Piggy Duo & Mở thẳng vào App'}
              </Button>
            ) : null}

            <Button
              size="md"
              variant={perm === 'granted' ? 'pink' : 'violet'}
              loading={testingNativePwa}
              onClick={testNativePwaPush}
            >
              <Sparkles size={16} className="mr-1 inline" />
              {testingNativePwa
                ? 'Đang đếm 4 giây… Hãy thoát ra Màn hình chính / Khóa máy ngay!'
                : '🐷 Thử thông báo Logo Piggy Duo & Mở thẳng App (sau 4 giây)'}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
            💡 Bấm nút thử ở trên rồi <b>vuốt thoát ra Màn hình chính iPhone (hoặc khóa máy) ngay</b>. Sau 4 giây thông báo có <b>Logo 🐷 Piggy Duo</b> sẽ nổ, chạm vào là vào thẳng App!
          </p>
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
      </Card>

      {/* 4. OPTIONAL NTFY FALLBACK (COLLAPSED BY DEFAULT SO IT DOESN'T CONFUSE WITH SAFARI REDIRECT) */}
      <FadeInItem delay={0.2} y={10}>
        <Card className="!border-slate-200 !bg-white/75">
          <button
            type="button"
            onClick={() => setShowNtfyFallback((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent p-0 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-700">
                <Smartphone size={16} />
              </span>
              <div>
                <h2 className="text-xs font-black text-slate-700">
                  Kênh dự phòng qua App ntfy (Tùy chọn)
                </h2>
                <p className="text-[10.5px] font-bold text-slate-500">
                  Lưu ý: Thông báo từ app ntfy sẽ hiện logo ntfy và mở bằng Safari
                </p>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`shrink-0 text-slate-400 transition-transform ${showNtfyFallback ? 'rotate-180' : ''}`}
            />
          </button>

          {showNtfyFallback && (
            <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
              <div className="rounded-2xl border border-indigo-100 bg-white/90 p-3 text-xs font-bold leading-relaxed text-slate-600">
                <p className="font-black text-[#1e1b4b]">Nếu bạn chỉ muốn nhận thông báo có Logo 🐷 Piggy Duo và vào thẳng App:</p>
                <p className="mt-1 text-[11px] text-rose-600">
                  👉 Hãy mở app <b>ntfy</b> và xóa/tắt kênh bên dưới đi để không bị nhận trùng thông báo nhảy sang Safari nhé.
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Còn nếu dùng máy không cài được App ra màn hình chính, bạn mới cần tải{' '}
                  <a
                    href="https://apps.apple.com/app/ntfy/id1625396347"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-indigo-600 underline"
                  >
                    ntfy (iOS) <ExternalLink size={10} className="inline" />
                  </a>{' '}
                  / {' '}
                  <a
                    href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-indigo-600 underline"
                  >
                    Android <ExternalLink size={10} className="inline" />
                  </a>{' '}
                  và dán mã kênh riêng Nam/Nữ bên dưới:
                </p>
              </div>

              <div className="mt-3 space-y-2.5">
                {(
                  [
                    {
                      gender: 'male' as const,
                      title: `👦 Máy của ${memberMale.name} (Nam)`,
                      topicStr: topicMale,
                      borderClass: myGender === 'male' ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200 bg-white/90',
                      codeClass: 'bg-sky-100/90 text-sky-900 border-sky-300',
                    },
                    {
                      gender: 'female' as const,
                      title: `👧 Máy của ${memberFemale.name} (Nữ)`,
                      topicStr: topicFemale,
                      borderClass: myGender === 'female' ? 'border-pink-300 bg-pink-50/70' : 'border-slate-200 bg-white/90',
                      codeClass: 'bg-pink-100/90 text-pink-900 border-pink-300',
                    },
                  ]
                ).map((item) => (
                  <div key={item.gender} className={`rounded-2xl border p-2.5 ${item.borderClass}`}>
                    <span className="text-xs font-black text-[#1e1b4b]">{item.title}</span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <code className={`flex-1 truncate rounded-xl border px-2.5 py-1 font-mono text-xs font-black ${item.codeClass}`}>
                        {item.topicStr}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyGenderTopic(item.gender)}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm active:scale-95"
                      >
                        {copiedTarget === item.gender ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedTarget === item.gender ? 'Đã chép' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={testingTarget === item.gender}
                        onClick={() => testGenderPush(item.gender, 4)}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border-0 bg-slate-700 px-2.5 py-1 text-[11px] font-black text-white shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <Send size={11} />
                        <span>{testingTarget === item.gender ? 'Đợi 4s…' : 'Thử ntfy'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5">
                <span className="text-[10.5px] font-extrabold text-slate-500">Đổi tiền tố kênh ntfy:</span>
                <input
                  type="text"
                  value={baseTopic}
                  onChange={(e) => setBaseTopic(e.target.value)}
                  onBlur={saveBaseTopic}
                  placeholder="piggy_vi_tram"
                  className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-black text-[#1e1b4b] outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}
        </Card>
      </FadeInItem>
    </div>
  )
}
