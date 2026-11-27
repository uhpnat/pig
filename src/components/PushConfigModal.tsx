import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Send,
  Share,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Modal, Toggle } from '@/components/ui'
import type { Gender } from '@/domain/types'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import {
  fireBrowserNotification,
  getNtfyBaseTopic,
  getNtfyTopicForGender,
  pushNtfyNotification,
  setNtfyBaseTopic,
} from '@/lib/pushNotify'
import {
  isStandalonePwa,
  scheduleServiceWorkerNotification,
  subscribeNativeWebPush,
  triggerServerWebPush,
} from '@/lib/webPush'

interface PushConfigModalProps {
  open: boolean
  onClose: () => void
}

export function PushConfigModal({ open, onClose }: PushConfigModalProps) {
  const j = useJourney()
  const { state, repo, run, toast, myMemberId, myMember, partnerMember } = useStore()
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

  useEffect(() => {
    if (open) {
      setStandalone(isStandalonePwa())
    }
  }, [open])

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
    <Modal open={open} onClose={onClose} title="Cài đặt thông báo đẩy 🔔">
      <div className="mt-2 space-y-3">
        {/* 1. Native iOS Home Screen App Push Setup */}
        <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white via-pink-50/60 to-violet-50/60 p-3">
          <div className="flex items-center gap-2.5">
            <img
              src="./apple-touch-icon.png"
              alt="Piggy Duo Logo"
              className="h-10 w-10 shrink-0 rounded-xl border border-pink-200 object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Khuyên dùng trên iPhone
              </span>
              <h3 className="mt-0.5 text-xs font-black leading-snug text-[#1e1b4b]">
                Thông báo Trực Tiếp Logo 🐷 & Mở thẳng vào App
              </h3>
            </div>
          </div>

          {!standalone ? (
            <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 text-[11px] font-bold text-amber-950">
              <div className="flex items-center gap-1 font-black text-amber-900">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>Đang mở bằng Safari (chưa phải App Màn hình chính)</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Tại Safari bấm <b>Chia sẻ</b> (<Share size={11} className="inline" />) → <b>Thêm vào MH chính</b>, rồi mở biểu tượng <b>🐷 Piggy Duo</b> ngoài màn hình chính để bật thông báo nhé!
              </p>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 text-[11px] font-black text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>Đang chạy trực tiếp từ App 🐷 Piggy Duo ngoài Màn hình chính</span>
            </div>
          )}

          {/* Connection status for both devices */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-pink-100 bg-white/90 px-2.5 py-1.5 text-[10.5px] font-bold">
              <p className="font-black text-[#1e1b4b]">
                {myGender === 'male' ? '👦' : '👧'} Máy bạn ({myMember?.name})
              </p>
              <p className={`mt-0.5 font-extrabold ${perm === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {perm === 'granted'
                  ? hasMyNativeSub
                    ? '✅ Đã kết nối Push 🐷'
                    : '✅ Đã bật quyền'
                  : '⏳ Chưa bật'}
              </p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-white/90 px-2.5 py-1.5 text-[10.5px] font-bold">
              <p className="font-black text-[#1e1b4b]">
                {myGender === 'male' ? '👧' : '👦'} Máy {partnerMember?.name}
              </p>
              <p className={`mt-0.5 font-extrabold ${hasPartnerNativeSub ? 'text-emerald-600' : 'text-slate-500'}`}>
                {hasPartnerNativeSub ? '✅ Đã kết nối Push 🐷' : '⏳ Chờ máy kia bật'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 grid gap-2">
            {perm !== 'granted' || !hasMyNativeSub ? (
              <Button size="sm" variant="pink" loading={enablingPush} onClick={enableNativePiggyPush}>
                <BellRing size={14} className="mr-1 inline" />
                {perm === 'granted' ? '🐷 Kích hoạt kết nối Push cho máy này' : '🔔 Bật thông báo Logo 🐷 Piggy Duo'}
              </Button>
            ) : null}

            <Button
              size="sm"
              variant={perm === 'granted' ? 'pink' : 'violet'}
              loading={testingNativePwa}
              onClick={testNativePwaPush}
            >
              <Sparkles size={14} className="mr-1 inline" />
              {testingNativePwa
                ? 'Đang đếm 4 giây… Hãy thoát / Khóa máy ngay!'
                : '🐷 Thử thông báo Logo Piggy Duo (sau 4 giây)'}
            </Button>
          </div>
        </div>

        {/* 2. Notification Event Toggles */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2">
          <p className="text-xs font-black text-[#1e1b4b]">Nhận thông báo khi:</p>
          <Toggle
            checked={s.notifyReveal}
            onChange={(v) => run(repo.updateSettings({ notifyReveal: v }))}
            label="Nhắc mở số tiền mỗi ngày"
          />
          <Toggle
            checked={s.notifyPartner}
            onChange={(v) => run(repo.updateSettings({ notifyPartner: v }))}
            label="Người ấy mở số / nạp tiền / nhắn tin"
          />
          <Toggle
            checked={s.notifyRecap}
            onChange={(v) => run(repo.updateSettings({ notifyRecap: v }))}
            label="Tổng kết tuần / tháng"
          />
        </div>

        {/* 3. Optional ntfy fallback (collapsed) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5">
          <button
            type="button"
            onClick={() => setShowNtfyFallback((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent p-0 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-700">
                <Smartphone size={14} />
              </span>
              <div>
                <p className="text-[11.5px] font-black text-slate-700">Kênh dự phòng qua App ntfy (Tùy chọn)</p>
                <p className="text-[10px] font-bold text-slate-500">Dành cho máy không cài được App ra màn hình chính</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${showNtfyFallback ? 'rotate-180' : ''}`}
            />
          </button>

          {showNtfyFallback && (
            <div className="mt-2.5 border-t border-dashed border-slate-200 pt-2.5 space-y-2">
              <p className="text-[10.5px] font-bold text-slate-500">
                Tải{' '}
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
                và dán mã kênh theo giới tính:
              </p>
              {(
                [
                  {
                    gender: 'male' as const,
                    title: `👦 Máy ${memberMale.name} (Nam)`,
                    topicStr: topicMale,
                    codeClass: 'bg-sky-100/90 text-sky-900 border-sky-300',
                  },
                  {
                    gender: 'female' as const,
                    title: `👧 Máy ${memberFemale.name} (Nữ)`,
                    topicStr: topicFemale,
                    codeClass: 'bg-pink-100/90 text-pink-900 border-pink-300',
                  },
                ]
              ).map((item) => (
                <div key={item.gender} className="rounded-xl border border-slate-200 bg-white p-2">
                  <span className="text-[11px] font-black text-[#1e1b4b]">{item.title}</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <code className={`flex-1 truncate rounded-lg border px-2 py-1 font-mono text-[11px] font-black ${item.codeClass}`}>
                      {item.topicStr}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyGenderTopic(item.gender)}
                      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-black text-slate-700"
                    >
                      {copiedTarget === item.gender ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedTarget === item.gender ? 'Đã chép' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={testingTarget === item.gender}
                      onClick={() => testGenderPush(item.gender, 4)}
                      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-0 bg-slate-700 px-2 py-1 text-[10.5px] font-black text-white disabled:opacity-50"
                    >
                      <Send size={10} />
                      <span>{testingTarget === item.gender ? '4s…' : 'Thử'}</span>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1">
                <span className="text-[10px] font-extrabold text-slate-500">Đổi tiền tố kênh:</span>
                <input
                  type="text"
                  value={baseTopic}
                  onChange={(e) => setBaseTopic(e.target.value)}
                  onBlur={saveBaseTopic}
                  placeholder="piggy_vi_tram"
                  className="w-32 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-right text-[11px] font-black text-[#1e1b4b] outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
