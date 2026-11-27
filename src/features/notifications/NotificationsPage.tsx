import { BellRing, Check, ChevronRight, Copy, ExternalLink, Send, Smartphone } from 'lucide-react'
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
  const { state, repo, run, toast, myMember, setChatOpen } = useStore()
  const nav = useNavigate()
  const { perm, request } = usePushPermission()
  const s = state.settings

  const [baseTopic, setBaseTopic] = useState(() => getNtfyBaseTopic())
  const [testingTarget, setTestingTarget] = useState<Gender | null>(null)
  const [testingNativePwa, setTestingNativePwa] = useState(false)
  const [copiedTarget, setCopiedTarget] = useState<Gender | null>(null)

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const memberMale = isBMale ? j.members.b : j.members.a
  const memberFemale = isBMale ? j.members.a : j.members.b
  const myGender: Gender = myMember?.gender === 'male' ? 'male' : 'female'

  const topicMale = getNtfyTopicForGender('male', baseTopic)
  const topicFemale = getNtfyTopicForGender('female', baseTopic)

  const hasToday = state.reveals.some(
    (r) => r.date === new Date().toLocaleDateString('sv-SE', { timeZone: j.timezone }),
  )

  useEffect(() => {
    if (state.notifications.some((n) => !n.read)) {
      const t = setTimeout(() => run(repo.markNotificationsRead()), 1200)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      toast(`⏱️ Hãy thoát ra Màn hình chính hoặc Khóa máy ngay! Chuông sẽ nổ sau ${delaySec} giây…`)
      await new Promise((r) => setTimeout(r, delaySec * 1000))
    }
    try {
      const ok = await pushNtfyNotification(
        `🐷 Chuông thử cho ${targetName} (${gender === 'male' ? 'Nam 👦' : 'Nữ 👧'})`,
        `Khi người ấy quay số, nạp tiền hoặc nhắn tin, điện thoại của ${targetName} sẽ nổ thông báo qua kênh "${fullTopic}"! 💗`,
        '/',
        fullTopic,
      )
      if (ok) {
        toast(`Đã bắn thông báo khẩn (Priority 5) tới máy ${targetName} (${fullTopic})! 📲`)
      } else {
        toast('Không kết nối được ntfy.sh, kiểm tra mạng rồi thử lại nhé', 'error')
      }
    } finally {
      setTestingTarget(null)
    }
  }

  const enablePush = async () => {
    const r = await request()
    if (r === 'granted') {
      toast('Đã bật thông báo Logo Piggy Duo trên iPhone! 🔔')
      await fireBrowserNotification(
        '🐷 Piggy Duo đã bật thông báo!',
        'Chạm vào thông báo này sẽ mở thẳng vào app Piggy Duo trên iPhone của bạn.',
        undefined,
        '/',
      )
    } else if (r === 'denied') {
      toast('Bạn đã chặn thông báo. Hãy bật lại trong Cài đặt iPhone -> Piggy Duo -> Thông báo.', 'error')
    } else if (r === 'unsupported') {
      toast(
        'Trên iPhone: bấm nút Chia sẻ (ở Safari) -> "Thêm vào Màn hình chính", sau đó mở Piggy Duo từ Màn hình chính để bật thông báo có Logo Piggy Duo nhé!',
        'error',
      )
    }
  }

  const testNativePwaPush = async () => {
    if (perm !== 'granted') {
      await enablePush()
      return
    }
    setTestingNativePwa(true)
    toast('⏱️ Hãy thoát ra Màn hình chính hoặc Khóa máy ngay! Sau 4 giây thông báo có Logo Piggy Duo sẽ hiện lên…')
    await new Promise((r) => setTimeout(r, 4000))
    try {
      await fireBrowserNotification(
        `🐷 ${j.name}`,
        `Chạm vào đây để mở thẳng vào app Piggy Duo của ${j.members.a.name} & ${j.members.b.name}! 💗`,
        undefined,
        '/',
      )
    } finally {
      setTestingNativePwa(false)
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

      {/* 1. NTFY 24/7 SPLIT MALE / FEMALE PUSH NOTIFICATION CARD */}
      <FadeInItem delay={0.04} y={12}>
        <Card className="!mt-4 !border-indigo-200 !bg-gradient-to-br !from-white !via-indigo-50/40 !to-pink-50/50">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-pink-500 text-white shadow-sm">
              <Smartphone size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-[#1e1b4b]">
                Thông báo đẩy 24/7 qua App ntfy (Tách riêng Nam & Nữ)
              </h2>
              <p className="text-[11px] font-bold text-emerald-600">
                ⚡ Nam thao tác → báo máy Nữ · Nữ thao tác → báo máy Nam
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/90 p-3 text-xs font-bold leading-relaxed text-slate-600">
            <p className="font-black text-[#1e1b4b]">Hướng dẫn 2 bước trên iPhone & Android:</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
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
                Mở app <b>ntfy</b> → bấm dấu <b>+</b> → máy của ai thì dán đúng <b>mã kênh của người đó</b> ở dưới vào (để khi mình thao tác không bị tự kêu chuông trên máy mình!).
              </li>
            </ol>
          </div>

          {/* Dedicated Topic Cards for Male (_nam) & Female (_nu) */}
          <div className="mt-3 space-y-2.5">
            {(
              [
                {
                  gender: 'male' as const,
                  title: `👦 Máy của ${memberMale.name} (Nam)`,
                  sub: `Nhận thông báo khi ${memberFemale.name} quay số, nạp tiền, duyệt 2/2 hoặc nhắn tin`,
                  topicStr: topicMale,
                  borderClass: myGender === 'male' ? 'border-sky-400 bg-sky-50/85 ring-2 ring-sky-200' : 'border-sky-200 bg-white/90',
                  badgeClass: 'bg-sky-600 text-white',
                  codeClass: 'bg-sky-100/90 text-sky-900 border-sky-300',
                },
                {
                  gender: 'female' as const,
                  title: `👧 Máy của ${memberFemale.name} (Nữ)`,
                  sub: `Nhận thông báo khi ${memberMale.name} quay số, nạp tiền, duyệt 2/2 hoặc nhắn tin`,
                  topicStr: topicFemale,
                  borderClass: myGender === 'female' ? 'border-pink-400 bg-pink-50/85 ring-2 ring-pink-200' : 'border-pink-200 bg-white/90',
                  badgeClass: 'bg-pink-600 text-white',
                  codeClass: 'bg-pink-100/90 text-pink-900 border-pink-300',
                },
              ]
            ).map((item) => (
              <div key={item.gender} className={`rounded-2xl border-2 p-3 transition-all ${item.borderClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#1e1b4b]">{item.title}</span>
                  {myGender === item.gender && (
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ${item.badgeClass}`}>
                      📱 Máy bạn đăng ký mã này
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[10.5px] font-bold text-slate-500">{item.sub}</p>

                <div className="mt-2 flex items-center gap-1.5">
                  <code className={`flex-1 truncate rounded-xl border px-3 py-1.5 font-mono text-xs font-black ${item.codeClass}`}>
                    {item.topicStr}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyGenderTopic(item.gender)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm active:scale-95"
                  >
                    {copiedTarget === item.gender ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedTarget === item.gender ? 'Đã chép' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={testingTarget === item.gender}
                    onClick={() => testGenderPush(item.gender, 4)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>{testingTarget === item.gender ? 'Đợi 4s…' : 'Thử (sau 4s)'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Base Prefix Customization */}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5">
            <span className="text-[10.5px] font-extrabold text-slate-500">Đổi tiền tố kênh chung:</span>
            <input
              type="text"
              value={baseTopic}
              onChange={(e) => setBaseTopic(e.target.value)}
              onBlur={saveBaseTopic}
              placeholder="piggy_vi_tram"
              className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-black text-[#1e1b4b] outline-none focus:border-indigo-400"
            />
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
        <div className="mt-2 rounded-2xl border border-pink-100 bg-pink-50/60 p-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="shrink-0 text-pink-600" size={18} />
            <p className="text-xs font-black text-[#1e1b4b]">
              🐷 Thông báo hiện Logo Piggy Duo & Mở thẳng vào App trên iPhone
            </p>
          </div>
          <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-600">
            {perm === 'granted'
              ? 'Đã kích hoạt! Khi mở Piggy Duo từ Màn hình chính iPhone, thông báo sẽ mang đúng Logo 🐷 Piggy Duo và chạm vào sẽ mở thẳng vào app.'
              : 'Để thông báo hiện Logo 🐷 Piggy Duo và chạm vào mở thẳng app trên iPhone: Tại Safari bấm Chia sẻ -> "Thêm vào Màn hình chính", mở app Piggy Duo ngoài màn hình chính rồi bấm nút Bật bên dưới:'}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {perm !== 'granted' ? (
              <Button size="sm" variant="pink" onClick={enablePush}>
                🔔 Bật thông báo Logo Piggy Duo
              </Button>
            ) : (
              <Button
                size="sm"
                variant="pink"
                loading={testingNativePwa}
                onClick={testNativePwaPush}
              >
                {testingNativePwa ? 'Đang đếm 4 giây… (Hãy khóa máy)' : '🐷 Thử thông báo Logo Piggy Duo (sau 4s)'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
