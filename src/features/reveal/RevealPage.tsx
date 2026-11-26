import { motion } from 'framer-motion'
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Chip } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import { beep, haptic } from '@/lib/fx'

export default function RevealPage() {
  const j = useJourney()
  const { state, repo, run, today, goalReached, motionOff, celebrate, toast } = useStore()
  const nav = useNavigate()
  const reveal = state.reveals.find((r) => r.date === today)
  const [rolling, setRolling] = useState(false)
  const [by, setBy] = useState<MemberId>('a')
  const [ticker, setTicker] = useState<Record<MemberId, number>>({ a: 0, b: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')
  const sound = state.settings.sound

  const start = async () => {
    if (rolling) return
    setRolling(true)
    haptic(state.settings, 40)
    const t0 = Date.now()
    const dur = motionOff ? 300 : 2800
    const scale = (j.goal / Math.max(1, j.months * 30)) * 2
    timer.current = setInterval(() => {
      setTicker({
        a: Math.round((Math.random() * scale * 0.7) / 1000) * 1000,
        b: Math.round((Math.random() * scale * 0.3) / 1000) * 1000,
      })
      beep(state.settings, 'tick')
    }, 80)
    if (!motionOff) celebrate(['🪙'])
    const out = await run(repo.revealToday(by))
    const wait = Math.max(0, dur - (Date.now() - t0))
    setTimeout(() => {
      clearInterval(timer.current)
      setRolling(false)
      if (!out) return
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

  return (
    <div
      className="min-h-screen pb-10"
      style={{ background: 'linear-gradient(180deg, #5b3dc8 0%, #8e6ee8 45%, #fde8f1 100%)' }}
    >
      {/* Top Floating Controls */}
      <div className="flex items-center justify-between px-4 pt-3.5">
        <button
          type="button"
          onClick={() => nav('/')}
          className="chip flex items-center gap-1 !bg-white/25 !text-white backdrop-blur-sm"
        >
          <ChevronLeft size={16} /> Quay lại
        </button>
        <button
          type="button"
          onClick={() => run(repo.updateSettings({ sound: !sound }))}
          aria-pressed={sound}
          aria-label="Bật/tắt âm thanh"
          className="chip flex items-center gap-1 !bg-white/25 !text-white backdrop-blur-sm"
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Âm thanh
        </button>
      </div>

      {/* 3D Crystal Coin Globe Illustration (`glob.jpg` already has "Hôm nay là ngày cùng nhau thử thách!" at the top) */}
      <div className="relative -mt-2 overflow-hidden">
        <motion.img
          src={IMG.glob}
          alt="Hôm nay là ngày cùng nhau thử thách!"
          className="block w-full select-none object-cover"
          style={{
            maskImage: 'linear-gradient(180deg, #000 84%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 84%, transparent 100%)',
          }}
          animate={
            motionOff
              ? undefined
              : rolling
                ? { scale: [1, 1.03, 0.98, 1], rotate: [-1.2, 1.2, -1.2] }
                : { y: [0, -6, 0] }
          }
          transition={{ duration: rolling ? 0.45 : 2.6, repeat: Infinity }}
        />
      </div>

      {/* Soft Pink Rounded Sheet matching 04_daily_reveal.png */}
      <div
        className="relative -mt-7 rounded-t-[36px] px-5 pb-7 pt-5 text-center shadow-[0_-12px_32px_rgba(90,50,180,.2)]"
        style={{ background: 'linear-gradient(180deg, #ffeaf2 0%, #fff7fa 60%, #ffffff 100%)' }}
      >
        <p className="text-[15px] font-black leading-snug text-[#1e1b4b]">
          Hệ thống sẽ random số tiền
          <br />
          cho mỗi người trong ngày này!
        </p>
        <p className="mt-1 text-[13px] font-extrabold text-[#4b5563]">
          Tổng tiền vẫn bằng nhau theo mục tiêu nhé <span className="text-[#ff3b6b]">❤️</span>
        </p>

        {goalReached && !reveal ? (
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-md">
            <p className="text-4xl">🎆</p>
            <h2 className="h2 mt-2 text-[#1e1b4b]">Đã hoàn thành mục tiêu!</h2>
            <div className="mt-4">
              <Button onClick={() => nav('/couple')}>Sang “Của chúng mình”</Button>
            </div>
          </div>
        ) : !reveal || rolling ? (
          <>
            <div className="mt-4 rounded-[28px] border-2 border-white bg-white/95 p-4 shadow-[0_12px_28px_rgba(143,124,240,.16)]">
              <h2 className="text-[18px] font-black text-[#4c1d95]">Kết quả hôm nay</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(['a', 'b'] as const).map((k, idx) => (
                  <div key={k} className="text-center">
                    <div
                      className={`mx-auto grid h-20 w-20 place-items-center rounded-full p-1 ${
                        idx === 0 ? 'bg-[#dbeafe]' : 'bg-[#fce7f3]'
                      }`}
                    >
                      <Avatar value={j.members[k].avatar} size={70} />
                    </div>
                    <p
                      className="mt-1.5 text-xs font-extrabold"
                      style={{ color: idx === 0 ? '#2563eb' : '#ec4899' }}
                    >
                      {j.members[k].name}
                    </p>
                    <p
                      className="mt-0.5 text-[21px] font-black tabular-nums"
                      style={{ color: idx === 0 ? '#1d4ed8' : '#e11d48' }}
                    >
                      {rolling ? `+${ticker[k].toLocaleString('vi-VN')}đ` : '???'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {!rolling && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-extrabold text-[#4b5563]">
                <span>Người bấm mở:</span>
                {(['a', 'b'] as const).map((k) => (
                  <Chip key={k} on={by === k} onClick={() => setBy(k)}>
                    {j.members[k].name}
                  </Chip>
                ))}
              </div>
            )}

            <Button variant="violet" className="mt-4 !py-4 !text-[18px]" disabled={rolling} onClick={start}>
              {rolling ? 'Đang quay số… 🎲' : 'MỞ KẾT QUẢ HÔM NAY 🎉'}
            </Button>
          </>
        ) : (
          <>
            {/* Revealed Result White Card matching 04_daily_reveal.png */}
            <div className="mt-4 rounded-[28px] border-2 border-white bg-white/95 p-4 shadow-[0_12px_28px_rgba(143,124,240,.16)]">
              <h2 className="text-[19px] font-black text-[#4c1d95]">Kết quả hôm nay</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(['a', 'b'] as const).map((k, idx) => {
                  const c = cs.find((x) => x.member === k)
                  return (
                    <motion.div
                      key={k}
                      initial={motionOff ? false : { scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', delay: idx * 0.06 }}
                      className="text-center"
                    >
                      <div
                        className={`mx-auto grid h-20 w-20 place-items-center rounded-full p-1 ${
                          idx === 0 ? 'bg-[#dbeafe]' : 'bg-[#fce7f3]'
                        }`}
                      >
                        <Avatar value={j.members[k].avatar} size={70} />
                      </div>
                      <p
                        className="mt-1.5 text-[13px] font-black"
                        style={{ color: idx === 0 ? '#2563eb' : '#ec4899' }}
                      >
                        {j.members[k].name}
                      </p>
                      <p
                        className="mt-0.5 text-[21px] font-black tabular-nums"
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

              {/* Individual confirmation buttons if pending */}
              {cs.some((c) => c.status === 'pending') && (
                <div className="mt-3.5 grid gap-2 border-t border-[#f3e8ff] pt-3">
                  {cs.map((c) =>
                    c.status === 'confirmed' ? null : (
                      <Button key={c.id} size="sm" onClick={() => confirm(c.id)}>
                        ✅ {j.members[c.member].name} xác nhận đã góp {vnd(c.amount)}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>

            <Button
              variant="violet"
              className="mt-4 !py-4 !text-[18px]"
              onClick={() => nav(allDone ? '/' : '/journal')}
            >
              Tuyệt vời! 🎉
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
