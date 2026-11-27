import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Send,
  Share,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Modal, Toggle } from '@/components/ui'
import { usePushPermission } from '@/hooks/usePwa'
import { useJourney, useStore } from '@/hooks/useStore'
import { fireBrowserNotification } from '@/lib/pushNotify'
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
  const { state, repo, run, toast, myMemberId, myMember, partnerMemberId, partnerMember } = useStore()
  const { perm, request } = usePushPermission()
  const s = state.settings

  const [standalone, setStandalone] = useState(() => isStandalonePwa())
  const [enabling, setEnabling] = useState(false)
  const [testingSelf, setTestingSelf] = useState(false)
  const [testingPartner, setTestingPartner] = useState(false)

  const mySub = myMember?.pushSubscription
  const partnerSub = partnerMember?.pushSubscription
  const hasMySub = Boolean(mySub?.endpoint)
  const hasPartnerSub = Boolean(partnerSub?.endpoint) && partnerSub?.endpoint !== mySub?.endpoint

  useEffect(() => {
    if (open) {
      setStandalone(isStandalonePwa())
    }
  }, [open])

  /**
   * Automatically binds THIS device to the currently logged-in member (`myMemberId`)
   * and clears this device's endpoint from the partner's profile if it was ever duplicated.
   */
  const enablePushAuto = async () => {
    setEnabling(true)
    try {
      const r = perm === 'granted' ? 'granted' : await request()
      if (r === 'granted') {
        const sub = await subscribeNativeWebPush()
        if (sub && myMember && partnerMember) {
          const partnerSameEndpoint = partnerMember.pushSubscription?.endpoint === sub.endpoint
          await run(
            repo.updateJourney({
              members: {
                ...j.members,
                [myMemberId]: {
                  ...myMember,
                  pushSubscription: sub,
                },
                [partnerMemberId]: {
                  ...partnerMember,
                  pushSubscription: partnerSameEndpoint ? undefined : partnerMember.pushSubscription,
                },
              },
            }),
          )
        }
        toast(`Đã bật thông báo tự động cho máy của ${myMember?.name}! 🔔`)
        await fireBrowserNotification(
          `🐷 Đã bật thông báo cho ${myMember?.name}!`,
          `Từ giờ khi ${partnerMember?.name} mở số, nạp tiền hoặc nhắn tin, máy của bạn sẽ nhận thông báo ngay!`,
          undefined,
          '/',
        )
      } else if (r === 'denied') {
        toast('Bạn đã chặn thông báo. Hãy vào Cài đặt iPhone -> Thông báo -> Our Little Bank để bật lại nhé.', 'error')
      } else {
        toast(
          'Trên iPhone: Hãy mở Our Little Bank từ biểu tượng ngoài Màn hình chính (không mở trong Safari) rồi bấm Bật nhé!',
          'error',
        )
      }
    } finally {
      setEnabling(false)
    }
  }

  const testMyPhoneAfter4s = async () => {
    if (perm !== 'granted' || !hasMySub) {
      await enablePushAuto()
      return
    }
    setTestingSelf(true)
    const title = `🐷 ${j.name} · Thông báo cho ${myMember?.name}`
    const body = `Chạm vào thông báo này để mở thẳng vào App Our Little Bank! 💗`
    const cfg = repo.getSheetConfig()

    const scheduledInSw = await scheduleServiceWorkerNotification(title, body, '/?chat=1', 4000)
    if (mySub?.endpoint) {
      void triggerServerWebPush(
        cfg.appsScriptUrl || '/api/gsheets',
        mySub,
        { title, body, route: '/?chat=1' },
        4000,
        cfg.passcode,
      )
    }
    toast('⏱️ Thoát ra Màn hình chính hoặc Khóa máy ngay! Sau 4 giây chuông sẽ nổ…')

    setTimeout(async () => {
      if (!scheduledInSw) {
        await fireBrowserNotification(title, body, undefined, '/?chat=1')
      }
      setTestingSelf(false)
    }, 4200)
  }

  const testPartnerPhoneNow = async () => {
    if (!hasPartnerSub || !partnerSub?.endpoint) {
      toast(`Máy của ${partnerMember?.name} chưa bật thông báo. Khi ${partnerMember?.name} mở app và bấm Bật thông báo là sẽ tự nhận diện ngay!`, 'error')
      return
    }
    setTestingPartner(true)
    try {
      const cfg = repo.getSheetConfig()
      const title = `🐷 ${myMember?.name} gọi ${partnerMember?.name} ơi!`
      const body = `Chạm vào đây để mở thẳng vào App Our Little Bank của đôi mình nhé! 💗`
      await triggerServerWebPush(
        cfg.appsScriptUrl || '/api/gsheets',
        partnerSub,
        { title, body, route: '/?chat=1' },
        0,
        cfg.passcode,
      )
      toast(`Đã bắn thông báo sang máy của ${partnerMember?.name}! 📲`)
    } finally {
      setTestingPartner(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cài đặt thông báo 🔔">
      <div className="mt-2 space-y-3">
        {/* 1. Auto-detected Push Card */}
        <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white via-pink-50/60 to-violet-50/60 p-3.5">
          <div className="flex items-center gap-2.5">
            <img
              src="./apple-touch-icon.png"
              alt="Our Little Bank Logo"
              className="h-10 w-10 shrink-0 rounded-xl border border-pink-200 object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#1e1b4b]">
                Tự động nhận diện: Máy của {myMember?.name}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                Khi {partnerMember?.name} thao tác hoặc nhắn tin → tự báo về máy bạn
              </p>
            </div>
          </div>

          {!standalone ? (
            <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 text-[11px] font-bold text-amber-950">
              <div className="flex items-center gap-1 font-black text-amber-900">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>Đang mở bằng Safari (chưa phải App Màn hình chính)</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Tại Safari bấm <b>Chia sẻ</b> (<Share size={11} className="inline" />) → <b>Thêm vào MH chính</b>, rồi mở biểu tượng <b>Our Little Bank</b> ngoài màn hình chính để bật thông báo nhé!
              </p>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 text-[11px] font-black text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>
                {perm === 'granted' && hasMySub
                  ? `Đã kết nối thông báo tự động cho máy ${myMember?.name}`
                  : 'Đang mở từ App Our Little Bank ngoài Màn hình chính'}
              </span>
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {(perm !== 'granted' || !hasMySub) && (
              <Button size="sm" variant="pink" loading={enabling} onClick={enablePushAuto}>
                <BellRing size={14} />
                <span>Bật thông báo đẩy cho máy {myMember?.name}</span>
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="violet"
                loading={testingSelf}
                onClick={testMyPhoneAfter4s}
                className="!text-[11px]"
              >
                <BellRing size={13} />
                <span>{testingSelf ? 'Đợi 4s…' : 'Thử máy mình (4s)'}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={testingPartner}
                onClick={testPartnerPhoneNow}
                className="!text-[11px]"
              >
                <Send size={13} />
                <span>{testingPartner ? 'Đang gửi…' : `Gọi máy ${partnerMember?.name}`}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Notification Event Toggles */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2">
          <p className="text-xs font-black text-[#1e1b4b]">Tuỳ chọn chuông báo:</p>
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
      </div>
    </Modal>
  )
}
