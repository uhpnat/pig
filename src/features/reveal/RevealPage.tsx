import { motion } from 'framer-motion'
import { ChevronLeft, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DuoSlotMachine3D } from '@/components/pig/DuoSlotMachine3D'
import { Avatar, Badge, Button, Chip, Modal } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'

export default function RevealPage() {
  const j = useJourney()
  const { state, repo, run, today, goalReached, motionOff, celebrate, toast, myMemberId } = useStore()
  const nav = useNavigate()
  const reveal = state.reveals.find((r) => r.date === today)
  const [rolling, setRolling] = useState(false)
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [by, setBy] = useState<MemberId>(myMemberId || 'a')
  const [ticker, setTicker] = useState<Record<MemberId, number>>({ a: 0, b: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    setBy(myMemberId || 'a')
  }, [myMemberId])

  useEffect(() => () => clearInterval(timer.current), [])

  // Auto-open result popup if today's reveal already exists on page open
  useEffect(() => {
    if (reveal && !rolling) {
      setResultModalOpen(true)
    }
  }, [reveal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const anyConfirmed = cs.some((c) => c.status === 'confirmed')
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')
  const sound = state.settings.sound

  const start = async (forceReroll = false) => {
    if (rolling) return
    if (forceReroll && anyConfirmed) {
      toast('Đã có người xác nhận bỏ heo hôm nay rồi, không thể quay lại nữa nhé! 🔒🐷', 'error')
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
    const out = await run(repo.revealToday(by, forceReroll))
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
      } else toast('Hôm nay đã được mở rồi – đây là kết quả đã lưu 💗')
    }, out?.created === false ? 0 : wait)
  }

  const confirm = async (id: string) => {
    const before = state.milestonesReached.length
    const out = await run(repo.confirmContribution(id))
    if (!out) return
    haptic(state.settings, 30)
    const mates = out.contributions.filter((c) => c.revealId === reveal?.id)
    if (out.milestonesReached.length > before) celebrate(['🎉', '🎆', '✨', '🪙'])
    else if (mates.every((c) => c.status === 'confirmed')) {
      celebrate(['🪙', '💗'])
      beep(state.settings, 'win')
    }
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
        background: 'linear-gradient(180deg, #5b3dc8 0%, #8e6ee8 52%, #fde8f1 100%)',
      }}
    >
      {/* 1. Top Floating Controls */}
      <div className="relative z-10 flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={() => nav('/')}
          className="chip flex items-center gap-1 !bg-white/25 !py-1.5 !text-white backdrop-blur-sm"
        >
          <ChevronLeft size={16} /> Quay lại
        </button>
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
          Hôm nay là ngày cùng nhau thử thách!
        </h1>
        <p className="mt-0.5 text-xs font-extrabold text-white/85">
          Kéo cần gạt để mở số tiền cho {j.members.a.name} & {j.members.b.name} 💗
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
          onPullLever={() => {
            if (anyConfirmed) {
              toast('Đã có người xác nhận bỏ heo hôm nay rồi, không thể quay lại nữa nhé! 🔒🐷', 'error')
              return
            }
            start(!!reveal)
          }}
        />
      </div>

      {/* 4. Compact Bottom ControlDock (fits strictly inside 100dvh without scrolling!) */}
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
            <div className="mb-2.5 flex items-center justify-center gap-2 text-xs font-extrabold text-[#4b5563]">
              <span>Người kéo cần gạt:</span>
              {(['a', 'b'] as const).map((k) => (
                <Chip key={k} on={by === k} onClick={() => setBy(k)} className="!py-1">
                  {j.members[k].name}
                </Chip>
              ))}
            </div>
            <Button
              variant="violet"
              className="!py-3.5 !text-[16px]"
              disabled={rolling}
              onClick={() => start(false)}
            >
              {rolling ? 'Đang quay 2 lồng số… 🎰' : 'KÉO CẦN GẠT MỞ SỐ HÔM NAY 🎰'}
            </Button>
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-2xl bg-[#f5f3ff] px-3.5 py-2 text-xs font-black text-[#4c1d95]">
              <span>
                {j.members.a.name}: <b className="text-[#1d4ed8]">+{vnd(reveal.amounts.a)}</b>
              </span>
              <span>·</span>
              <span>
                {j.members.b.name}: <b className="text-[#e11d48]">+{vnd(reveal.amounts.b)}</b>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {anyConfirmed ? (
                <div className="flex items-center justify-center gap-1 rounded-2xl bg-amber-50 px-2 py-2 text-[11px] font-black text-amber-800 border border-amber-200">
                  🔒 Đã khoá (có người xác nhận)
                </div>
              ) : (
                <Button variant="ghost" size="sm" disabled={rolling} onClick={() => start(true)}>
                  🎲 Random lại
                </Button>
              )}
              <Button variant="violet" size="sm" onClick={() => setResultModalOpen(true)}>
                <Sparkles size={15} className="mr-1 inline" /> Xem & Xác nhận
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Compact Popup Modal for Today's Revealed Result & Contribution Confirmation */}
      <Modal
        open={resultModalOpen && !!reveal && !rolling}
        onClose={() => setResultModalOpen(false)}
        title="🎉 Kết quả mở số hôm nay"
      >
        {reveal && (
          <div className="mt-3 text-center">
            <p className="text-xs font-bold text-[#64748b]">
              Tổng hôm nay: <b className="text-[#e11d48]">+{vnd(reveal.amounts.a + reveal.amounts.b)}</b>
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-[#fdf2f7] p-3.5">
              {(['a', 'b'] as const).map((k, idx) => {
                const c = cs.find((x) => x.member === k)
                return (
                  <motion.div
                    key={k}
                    initial={motionOff ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: idx * 0.05 }}
                    className="rounded-2xl bg-white p-2.5 shadow-sm"
                  >
                    <div
                      className={`mx-auto grid h-16 w-16 place-items-center rounded-full p-1 ${
                        idx === 0 ? 'bg-[#dbeafe]' : 'bg-[#fce7f3]'
                      }`}
                    >
                      <Avatar value={j.members[k].avatar} size={56} />
                    </div>
                    <p
                      className="mt-1 text-xs font-black flex items-center justify-center gap-1"
                      style={{ color: idx === 0 ? '#2563eb' : '#ec4899' }}
                    >
                      {j.members[k].name}
                      {k === myMemberId && <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[10px] font-black">(Bạn)</span>}
                    </p>
                    <p
                      className="mt-0.5 text-[18px] font-black tabular-nums"
                      style={{ color: idx === 0 ? '#1d4ed8' : '#e11d48' }}
                    >
                      +{vnd(reveal.amounts[k])}
                    </p>
                    {c && (
                      <div className="mt-1">
                        <Badge tone={c.status === 'confirmed' ? 'ok' : 'warn'}>
                          {c.status === 'confirmed' ? 'Đã góp ✅' : 'Chờ xác nhận ⏳'}
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {cs.some((c) => c.status === 'pending') && (
              <div className="mt-3 grid gap-2">
                {cs.map((c) =>
                  c.status === 'confirmed' ? null : (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={c.member === myMemberId ? 'violet' : undefined}
                      onClick={() => confirm(c.id)}
                    >
                      {c.member === myMemberId
                        ? `✅ Xác nhận phần của bạn (${vnd(c.amount)})`
                        : `✅ Xác nhận giúp ${j.members[c.member].name} (${vnd(c.amount)})`}
                    </Button>
                  ),
                )}
              </div>
            )}

            {anyConfirmed && (
              <p className="mt-2 text-center text-xs font-extrabold text-amber-700">
                🔒 Đã có người xác nhận bỏ heo – số tiền hôm nay đã được khoá cố định.
              </p>
            )}

            <div className={`mt-4 grid ${anyConfirmed ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5`}>
              {!anyConfirmed && (
                <Button variant="ghost" size="sm" onClick={() => start(true)}>
                  🎲 Random lại số tiền
                </Button>
              )}
              <Button
                variant="violet"
                size="sm"
                onClick={() => {
                  setResultModalOpen(false)
                  nav(allDone ? '/' : '/journal')
                }}
              >
                Tuyệt vời! 🎉
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
