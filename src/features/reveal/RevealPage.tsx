import { motion } from 'framer-motion'
import { ChevronLeft, Lock, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DuoSlotMachine3D } from '@/components/pig/DuoSlotMachine3D'
import { GenderSelectDialog } from '@/components/GenderSelectDialog'
import { Avatar, Badge, Button, Modal } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { Contribution, MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'

export default function RevealPage() {
  const j = useJourney()
  const {
    state,
    repo,
    run,
    today,
    goalReached,
    motionOff,
    celebrate,
    toast,
    myMemberId,
    myMember,
    partnerMemberId,
    partnerMember,
  } = useStore()
  const nav = useNavigate()
  const reveal = state.reveals.find((r) => r.date === today)
  const [rolling, setRolling] = useState(false)
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [ticker, setTicker] = useState<Record<MemberId, number>>({ a: 0, b: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => () => clearInterval(timer.current), [])

  // Auto-open deposit notification popup if today's reveal already exists when entering /reveal
  useEffect(() => {
    if (reveal && !rolling) {
      setResultModalOpen(true)
    }
  }, [reveal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')
  const sound = state.settings.sound

  const start = async () => {
    if (rolling) return
    // Strictly 1 random roll per day!
    if (reveal) {
      setResultModalOpen(true)
      toast(`Hôm nay ${j.members[reveal.initiatedBy].name} đã quay số rồi! Mỗi ngày chỉ quay 1 lần nhé 🔒`)
      return
    }
    setResultModalOpen(false)
    const scale = (j.goal / Math.max(1, j.months * 30)) * 2
    const randomTick = () => ({
      a: Math.max(10_000, Math.round((Math.random() * scale * 0.7) / 10_000) * 10_000),
      b: Math.max(10_000, Math.round((Math.random() * scale * 0.5) / 10_000) * 10_000),
    })
    setTicker(randomTick())
    setRolling(true)
    haptic(state.settings, 40)
    const t0 = Date.now()
    const dur = motionOff ? 300 : 2500
    timer.current = setInterval(() => {
      setTicker(randomTick())
      beep(state.settings, 'tick')
    }, 80)
    if (!motionOff) celebrate(['🪙'])
    const out = await run(repo.revealToday(myMemberId, false))
    const wait = Math.max(0, dur - (Date.now() - t0))
    setTimeout(() => {
      clearInterval(timer.current)
      setRolling(false)
      if (!out) return
      setResultModalOpen(true)
      if (out.created) {
        celebrate(['🎊', '🪙', '✨', '💗'])
        haptic(state.settings, [60, 40, 60])
        beep(state.settings, 'win')
      } else {
        toast('Người ấy vừa mở số hôm nay rồi – đây là số tiền cần nạp hôm nay! 💗')
      }
    }, out?.created === false ? 0 : wait)
  }

  const confirmByMe = async (c: Contribution) => {
    const before = state.milestonesReached.length
    const out = await run(repo.confirmContribution(c.id, myMemberId))
    if (!out) return
    haptic(state.settings, 35)
    const updatedC = out.contributions.find((x) => x.id === c.id)
    if (updatedC?.status === 'confirmed') {
      celebrate(['🪙', '🎉', '✨', '💗'])
      beep(state.settings, 'win')
      toast(`Đã duyệt hoàn tất (2/2)! Tiền của ${j.members[c.member].name} đã vào heo đất 🐷🎉`)
    } else {
      toast(
        c.member === myMemberId
          ? `Đã báo nạp (1/2)! Đang chờ ${partnerMember?.name} xác nhận chéo nhé ⏳`
          : `Đã xác nhận cho ${partnerMember?.name} (1/2)! ⏳`,
      )
    }
    if (out.milestonesReached.length > before) celebrate(['🎉', '🎆', '✨', '🪙'])
  }

  const displayAmounts = rolling ? ticker : reveal ? reveal.amounts : { a: 0, b: 0 }

  return (
    <div
      className="fixed inset-0 z-10 flex flex-col justify-between overflow-hidden px-4"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(180deg, #5b3dc8 0px, #5b3dc8 76px, #8e6ee8 54%, #fde8f1 100%)',
      }}
    >
      {/* 1. Top Floating Controls */}
      <div className="relative z-10 flex shrink-0 items-center justify-between">
        {reveal || goalReached ? (
          <button
            type="button"
            onClick={() => nav('/')}
            className="chip flex items-center gap-1 !bg-white/25 !py-1.5 !text-white backdrop-blur-sm"
          >
            <ChevronLeft size={16} /> Trang chủ
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-3 py-1 text-[11px] font-black text-[#1e1b4b] shadow">
            🌟 Người đầu tiên vào hôm nay – Hãy quay số nhé!
          </span>
        )}
        <button
          type="button"
          onClick={() => run(repo.updateSettings({ sound: !sound }))}
          aria-pressed={sound}
          aria-label="Bật/tắt âm thanh"
          className="chip flex items-center gap-1 !bg-white/25 !py-1.5 !text-white backdrop-blur-sm"
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Âm thanh
        </button>
      </div>

      {/* 2. Header Title */}
      <div className="relative z-10 shrink-0 text-center">
        <h1 className="text-[20px] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(30,10,90,.45)]">
          {reveal
            ? `Đã mở số ngày hôm nay (${j.members[reveal.initiatedBy].name} quay)`
            : 'Mỗi ngày 1 lần quay may mắn!'}
        </h1>
        <p className="mt-0.5 text-xs font-extrabold text-white/90">
          {reveal
            ? `Bạn (${myMember?.name}) cần nạp +${vnd(reveal.amounts[myMemberId])} vào quỹ hôm nay 💗`
            : `${myMember?.name} ơi, kéo cần gạt để mở số tiền cho cả hai nhé!`}
        </p>
      </div>

      {/* 3. Centered 3D Twin-Reel Slot Machine */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        <DuoSlotMachine3D
          journey={j}
          rolling={rolling}
          revealed={!!reveal && !rolling}
          amounts={displayAmounts}
          reducedMotion={motionOff}
          onPullLever={() => start()}
        />
      </div>

      {/* 4. Compact Bottom ControlDock (Strictly 1 roll/day, no re-roll!) */}
      <div className="relative z-10 shrink-0 rounded-[28px] border-2 border-white bg-white/95 p-4 text-center shadow-[0_12px_32px_rgba(60,20,140,.25)]">
        {goalReached && !reveal ? (
          <div>
            <p className="text-sm font-black text-[#1e1b4b]">🎆 Đã hoàn thành mục tiêu!</p>
            <Button size="sm" className="mt-2.5" onClick={() => nav('/couple')}>
              Sang “Của chúng mình”
            </Button>
          </div>
        ) : !reveal || rolling ? (
          <>
            <p className="mb-2 text-xs font-extrabold text-indigo-900">
              🎰 Người kéo cần gạt hôm nay: <b>{myMember?.name}</b> (1 ngày chỉ quay 1 lần)
            </p>
            <Button
              variant="violet"
              className="!py-3.5 !text-[16px]"
              disabled={rolling}
              onClick={() => start()}
            >
              {rolling ? 'Đang quay 2 lồng số… 🎰' : `🎰 ${myMember?.name} KÉO CẦN GẠT MỞ SỐ`}
            </Button>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-2xl bg-[#f5f3ff] px-3.5 py-2 text-xs font-black text-[#4c1d95]">
              <span>
                {myMember?.name} (Bạn): <b className="text-[#1d4ed8]">+{vnd(reveal.amounts[myMemberId])}</b>
              </span>
              <span>·</span>
              <span>
                {partnerMember?.name}: <b className="text-[#e11d48]">+{vnd(reveal.amounts[partnerMemberId])}</b>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="ghost" size="sm" onClick={() => nav('/')}>
                🏠 Về Trang chủ
              </Button>
              <Button variant="violet" size="sm" onClick={() => setResultModalOpen(true)}>
                <Sparkles size={15} className="mr-1 inline" /> Nạp & Xác nhận (2/2)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Popup Modal for Today's Deposit Alert & 2-Person Mutual Confirmation */}
      <Modal
        open={resultModalOpen && !!reveal && !rolling}
        onClose={() => setResultModalOpen(false)}
        title={
          reveal?.initiatedBy === myMemberId
            ? '🎉 Kết quả quay số hôm nay'
            : `🔔 ${reveal ? j.members[reveal.initiatedBy].name : ''} đã mở số hôm nay!`
        }
      >
        {reveal && (
          <div className="mt-2 text-center">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 px-3.5 py-2.5">
              <p className="text-xs font-bold text-slate-600">
                Số tiền <b>{myMember?.name} (Bạn)</b> cần nạp vào quỹ hôm nay:
              </p>
              <p className="mt-0.5 text-2xl font-black text-indigo-700 tabular-nums">
                +{vnd(reveal.amounts[myMemberId])}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                🔒 Mỗi khoản nạp cần <b>cả 2 người xác nhận chéo (2/2)</b> mới được duyệt vào heo đất!
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {([myMemberId, partnerMemberId] as const).map((k) => {
                const isMe = k === myMemberId
                const m = j.members[k]
                const c = cs.find((x) => x.member === k)
                const cBy = c?.confirmedBy ?? (c?.status === 'confirmed' ? ['a', 'b'] : [])
                const ownerConfirmed = cBy.includes(k)
                const myConfirmedThis = cBy.includes(myMemberId)
                const isApproved = c?.status === 'confirmed'

                return (
                  <motion.div
                    key={k}
                    initial={motionOff ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-center shadow-sm ${
                      isMe ? 'border-indigo-400 bg-indigo-50/60' : 'border-pink-200 bg-pink-50/40'
                    }`}
                  >
                    <div>
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white p-0.5 shadow-sm">
                        <Avatar value={m.avatar} size={42} />
                      </div>
                      <p className="mt-1 flex items-center justify-center gap-1 text-xs font-black text-[#1e1b4b]">
                        <span className="truncate">{m.name}</span>
                        {isMe && (
                          <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                            Bạn
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[17px] font-black text-[#e11d48] tabular-nums">
                        +{vnd(reveal.amounts[k])}
                      </p>

                      {/* 2-Person Confirmation Progress Badge */}
                      <div className="mt-1.5">
                        {isApproved ? (
                          <Badge tone="ok">✅ Đã duyệt (2/2)</Badge>
                        ) : (
                          <Badge tone="warn">
                            ⏳ Xác nhận: {cBy.length}/2
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Button for this contribution */}
                    {c && !isApproved && (
                      <div className="mt-2.5">
                        {isMe ? (
                          myConfirmedThis ? (
                            <div className="rounded-xl bg-amber-100/90 px-2 py-1.5 text-[10.5px] font-black text-amber-800">
                              ⏳ Đã báo nạp · Chờ {partnerMember?.name} duyệt
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => confirmByMe(c)}
                              className="w-full cursor-pointer rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-xs font-black text-white shadow-md active:scale-95"
                            >
                              💸 Tôi đã nạp ({cBy.length}/2)
                            </button>
                          )
                        ) : myConfirmedThis ? (
                          <div className="rounded-xl bg-amber-100/90 px-2 py-1.5 text-[10.5px] font-black text-amber-800">
                            ⏳ Bạn đã duyệt · Chờ {m.name} nạp
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => confirmByMe(c)}
                            className={`w-full cursor-pointer rounded-xl border-0 py-2 text-xs font-black text-white shadow-md active:scale-95 ${
                              ownerConfirmed
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 animate-pulse'
                                : 'bg-gradient-to-r from-pink-500 to-rose-500'
                            }`}
                          >
                            {ownerConfirmed
                              ? `✅ Duyệt ${m.name} đã nạp (2/2)`
                              : `✅ Xác nhận cho ${m.name}`}
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-500">
              <Lock size={12} /> 1 ngày chỉ quay random đúng 1 lần duy nhất
            </p>

            <div className="mt-3">
              <Button
                variant="violet"
                size="sm"
                onClick={() => {
                  setResultModalOpen(false)
                  nav('/')
                }}
              >
                {allDone ? '🎉 Đã duyệt đủ – Về Trang chủ' : 'Về Trang chủ nuôi heo 🐷'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <GenderSelectDialog />
    </div>
  )
}
