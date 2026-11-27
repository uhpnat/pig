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
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ROLE_CONFIG_KEY } from '@/components/GenderSelectDialog'
import { Button, Modal, Toggle } from '@/components/ui'
import type { Gender, MemberId } from '@/domain/types'
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
  const { state, repo, run, toast, myMemberId, setMyMemberId } = useStore()
  const { perm, request } = usePushPermission()
  const s = state.settings

  const [standalone, setStandalone] = useState(() => isStandalonePwa())
  const [testingMember, setTestingMember] = useState<MemberId | null>(null)
  const [enablingMember, setEnablingMember] = useState<MemberId | null>(null)
  const [showNtfyFallback, setShowNtfyFallback] = useState(false)

  const [baseTopic, setBaseTopic] = useState(() => getNtfyBaseTopic())
  const [testingTarget, setTestingTarget] = useState<Gender | null>(null)
  const [copiedTarget, setCopiedTarget] = useState<Gender | null>(null)

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const maleId: MemberId = isBMale ? 'b' : 'a'
  const femaleId: MemberId = isBMale ? 'a' : 'b'
  const memberMale = j.members[maleId]
  const memberFemale = j.members[femaleId]

  const topicMale = getNtfyTopicForGender('male', baseTopic)
  const topicFemale = getNtfyTopicForGender('female', baseTopic)

  // Detect if both members accidentally share the exact same push endpoint
  const isDuplicateSub =
    Boolean(j.members.a.pushSubscription?.endpoint) &&
    j.members.a.pushSubscription?.endpoint === j.members.b.pushSubscription?.endpoint

  useEffect(() => {
    if (open) {
      setStandalone(isStandalonePwa())
    }
  }, [open])

  /**
   * Registers THIS physical iPhone/device exclusively for `targetId` (either Male or Female),
   * and removes this device's push endpoint from the other member so notifications are 100% separate!
   */
  const bindThisDeviceToMember = async (targetId: MemberId) => {
    setEnablingMember(targetId)
    try {
      const otherId: MemberId = targetId === 'a' ? 'b' : 'a'
      const targetMember = j.members[targetId]
      const otherMember = j.members[otherId]

      // 1. Switch this device's active role to targetId
      setMyMemberId(targetId)
      try {
        localStorage.setItem(ROLE_CONFIG_KEY, 'true')
        localStorage.setItem('piggy_gender_configured', 'true')
      } catch {}

      // 2. Request OS notification permission & subscribe to Apple Web Push
      const r = perm === 'granted' ? 'granted' : await request()
      if (r === 'granted') {
        const sub = await subscribeNativeWebPush()
        if (sub) {
          const otherSameEndpoint = otherMember.pushSubscription?.endpoint === sub.endpoint
          await run(
            repo.updateJourney({
              members: {
                ...j.members,
                [targetId]: {
                  ...targetMember,
                  pushSubscription: sub,
                },
                [otherId]: {
                  ...otherMember,
                  pushSubscription: otherSameEndpoint ? undefined : otherMember.pushSubscription,
                },
              },
            }),
          )
        }
        const genderLabel = targetMember.gender === 'male' ? 'Nam 👦' : 'Nữ 👧'
        toast(`Đã gắn máy này nhận thông báo riêng của ${targetMember.name} (${genderLabel})! 🔔`)
        await fireBrowserNotification(
          `🐷 Đã bật chuông riêng cho ${targetMember.name} (${genderLabel})`,
          `Từ giờ khi ${otherMember.name} quay số, nạp tiền hoặc nhắn tin, máy của ${targetMember.name} sẽ nổ thông báo!`,
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
      setEnablingMember(null)
    }
  }

  /**
   * Sends a test push notification specifically to `targetId` (Male or Female):
   * - If `targetId` is the Partner's phone (`targetId !== myMemberId`), sends an instant Apple Web Push over the server to the partner's phone!
   * - If `targetId` is THIS phone (`targetId === myMemberId`), schedules a 4-second delayed push so the user can lock their phone and see it on the Lock Screen!
   */
  const testPushForMember = async (targetId: MemberId) => {
    const targetMember = j.members[targetId]
    const targetSub = targetMember.pushSubscription
    const genderLabel = targetMember.gender === 'male' ? 'Nam 👦' : 'Nữ 👧'
    const isThisPhone = targetId === myMemberId

    if (isThisPhone && perm !== 'granted') {
      await bindThisDeviceToMember(targetId)
      return
    }

    if (!isThisPhone && !targetSub?.endpoint) {
      toast(
        `Máy của ${targetMember.name} (${genderLabel}) chưa bấm "Đăng ký máy này". Hãy mở app trên máy ${targetMember.name} và bấm đăng ký nhé!`,
        'error',
      )
      return
    }

    setTestingMember(targetId)
    const title = `🐷 Chuông riêng cho ${targetMember.name} (${genderLabel})`
    const body = `Khi người ấy mở số, nạp tiền hoặc nhắn tin, chỉ máy của ${targetMember.name} nhận thông báo này! 💗`
    const cfg = repo.getSheetConfig()

    if (!isThisPhone && targetSub?.endpoint) {
      // Instant remote push to Partner's phone!
      try {
        const res = await triggerServerWebPush(
          cfg.appsScriptUrl || '/api/gsheets',
          targetSub,
          { title, body, route: '/?chat=1' },
          0,
          cfg.passcode,
        )
        if (res.sent) {
          toast(`Đã bắn thông báo riêng sang máy của ${targetMember.name} (${genderLabel})! 📲`)
        } else {
          toast(`Đã gửi lệnh báo tới máy ${targetMember.name}! 📲`)
        }
      } finally {
        setTestingMember(null)
      }
      return
    }

    // Testing on THIS phone: 4-second countdown so user can exit/lock phone
    const scheduledInSw = await scheduleServiceWorkerNotification(title, body, '/?chat=1', 4000)
    if (targetSub?.endpoint) {
      void triggerServerWebPush(
        cfg.appsScriptUrl || '/api/gsheets',
        targetSub,
        { title, body, route: '/?chat=1' },
        4000,
        cfg.passcode,
      )
    }
    toast(`⏱️ Thoát ra Màn hình chính hoặc Khóa máy ngay! Sau 4s chuông của ${targetMember.name} sẽ nổ…`)

    setTimeout(async () => {
      if (!scheduledInSw) {
        await fireBrowserNotification(title, body, undefined, '/?chat=1')
      }
      setTestingMember(null)
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
        '/?chat=1',
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
    <Modal open={open} onClose={onClose} title="Thông báo riêng Nam & Nữ 🔔">
      <div className="mt-2 space-y-3">
        {/* 1. Native iOS Home Screen App Push Setup (Split by Male & Female) */}
        <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white via-pink-50/60 to-violet-50/60 p-3">
          <div className="flex items-center gap-2.5">
            <img
              src="./apple-touch-icon.png"
              alt="Piggy Duo Logo"
              className="h-10 w-10 shrink-0 rounded-xl border border-pink-200 object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Tách riêng 2 máy Nam & Nữ
              </span>
              <h3 className="mt-0.5 text-xs font-black leading-snug text-[#1e1b4b]">
                Nam thao tác → Báo máy Nữ · Nữ thao tác → Báo máy Nam
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
                Tại Safari bấm <b>Chia sẻ</b> (<Share size={11} className="inline" />) → <b>Thêm vào MH chính</b>, rồi mở biểu tượng <b>🐷 Piggy Duo</b> ngoài màn hình chính để đăng ký chuông riêng cho từng máy nhé!
              </p>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 text-[11px] font-black text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>Đang mở từ App 🐷 Piggy Duo ngoài Màn hình chính</span>
            </div>
          )}

          {isDuplicateSub && (
            <div className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-2 text-[11px] font-bold text-rose-800">
              ⚠️ Phát hiện cả Nam & Nữ đang bị lưu trùng trên cùng 1 máy! Hãy bấm <b>“Đăng ký máy này là…”</b> ở đúng khung của bạn bên dưới để tách riêng nhé.
            </div>
          )}

          {/* Separate Cards for Male (Nam) and Female (Nữ) */}
          <div className="mt-2.5 space-y-2">
            {(
              [
                {
                  id: maleId,
                  member: memberMale,
                  partner: memberFemale,
                  title: `👦 Máy Nam: ${memberMale.name}`,
                  sub: `Chỉ nổ chuông khi ${memberFemale.name} (Nữ) mở số, nạp tiền hoặc nhắn tin`,
                  activeClass: 'border-sky-400 bg-sky-50/90 ring-2 ring-sky-200',
                  idleClass: 'border-sky-200 bg-white/95',
                  badgeClass: 'bg-sky-600 text-white',
                  btnVariant: 'violet' as const,
                },
                {
                  id: femaleId,
                  member: memberFemale,
                  partner: memberMale,
                  title: `👧 Máy Nữ: ${memberFemale.name}`,
                  sub: `Chỉ nổ chuông khi ${memberMale.name} (Nam) mở số, nạp tiền hoặc nhắn tin`,
                  activeClass: 'border-pink-400 bg-pink-50/90 ring-2 ring-pink-200',
                  idleClass: 'border-pink-200 bg-white/95',
                  badgeClass: 'bg-pink-600 text-white',
                  btnVariant: 'pink' as const,
                },
              ]
            ).map((card) => {
              const isThisDevice = myMemberId === card.id
              const hasSub = Boolean(card.member.pushSubscription?.endpoint) && !isDuplicateSub
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border-2 p-2.5 transition-all ${
                    isThisDevice ? card.activeClass : card.idleClass
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-black text-[#1e1b4b]">{card.title}</span>
                    {isThisDevice ? (
                      <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ${card.badgeClass}`}>
                        📱 Máy bạn đang cầm
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-600">
                        Máy người ấy
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10.5px] font-bold text-slate-500">{card.sub}</p>

                  <p
                    className={`mt-1 text-[10.5px] font-extrabold ${
                      hasSub ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {hasSub
                      ? `✅ Đã gắn thông báo riêng cho máy ${card.member.name}`
                      : `⏳ Chưa gắn thông báo riêng trên máy ${card.member.name}`}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(!isThisDevice || !hasSub || perm !== 'granted') && (
                      <Button
                        size="sm"
                        block={false}
                        variant={card.btnVariant}
                        loading={enablingMember === card.id}
                        onClick={() => bindThisDeviceToMember(card.id)}
                        className="flex-1 !py-1.5 !text-[11px]"
                      >
                        <BellRing size={13} />
                        <span>Đăng ký máy này là {card.member.name}</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      block={false}
                      variant="ghost"
                      loading={testingMember === card.id}
                      onClick={() => testPushForMember(card.id)}
                      className="flex-1 !py-1.5 !text-[11px]"
                    >
                      <Send size={12} />
                      <span>
                        {testingMember === card.id
                          ? isThisDevice
                            ? 'Đợi 4s (Hãy khóa máy)…'
                            : 'Đang bắn…'
                          : isThisDevice
                            ? `Thử chuông ${card.member.name} (sau 4s)`
                            : `Bắn thử sang máy ${card.member.name}`}
                      </span>
                    </Button>
                  </div>
                </div>
              )
            })}
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
                <p className="text-[10px] font-bold text-slate-500">Cũng đã chia 2 mã kênh riêng _nam và _nu</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${showNtfyFallback ? 'rotate-180' : ''}`}
            />
          </button>

          {showNtfyFallback && (
            <div className="mt-2.5 space-y-2 border-t border-dashed border-slate-200 pt-2.5">
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
