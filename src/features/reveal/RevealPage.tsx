import { motion } from 'framer-motion'
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Chip, ProgressBar } from '@/components/ui'
import { monthlyBudget } from '@/domain/engine'
import { fmtLongDate, pct, vnd } from '@/domain/format'
import { confirmedTotals, pendingTotals } from '@/domain/stats'
import type { MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import { beep, haptic } from '@/lib/fx'

const MESSAGES = ['Heo mũm mĩm cảm ơn hai bạn! 🐷', 'Mỗi ngày một chút, ước mơ gần thêm một bước 💗', 'Hai bạn thật ăn ý! ✨', 'Heo đang ăn xu ngon lành 🪙']

export default function RevealPage() {
  const j = useJourney()
  const { state, repo, run, today, goalReached, progress, motionOff, celebrate, toast } = useStore()
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
    setRolling(true) // button disabled immediately
    haptic(state.settings, 40)
    const t0 = Date.now()
    const dur = motionOff ? 300 : 2800
    const scale = (j.goal / Math.max(1, j.months * 30)) * 2
    timer.current = setInterval(() => {
      setTicker({ a: Math.round((Math.random() * scale * 0.7) / 1000) * 1000, b: Math.round((Math.random() * scale * 0.3) / 1000) * 1000 })
      beep(state.settings, 'tick')
    }, 80)
    if (!motionOff) celebrate(['🪙'])
    // The result is persisted before it is returned (idempotent – an existing result is returned as-is).
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
    else if (mates.every((c) => c.status === 'confirmed')) { celebrate(['🪙', '💗']); beep(state.settings, 'win') }
  }

  const budget = monthlyBudget(j)
  const monthUsed = state.reveals.filter((r) => r.date.slice(0, 7) === today.slice(0, 7)).reduce((s, r) => s + r.amounts.a + r.amounts.b, 0)
  const conf = confirmedTotals(cs)
  const pend = pendingTotals(cs)
  const msg = MESSAGES[(reveal?.date.charCodeAt(9) ?? 0) % MESSAGES.length]
  const showResult = !!reveal && !rolling

  return (
    <div className="min-h-screen px-4 pb-10 pt-3.5" style={{ background: 'linear-gradient(180deg,#6a4fd6,#a98cf5 50%,#ffd9ea)' }}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => nav('/')} className="chip flex items-center gap-1 !bg-white/25 !text-white"><ChevronLeft size={16} /> Quay lại</button>
        <button type="button" onClick={() => run(repo.updateSettings({ sound: !sound }))} aria-pressed={sound} aria-label="Bật/tắt âm thanh" className="chip flex items-center gap-1 !bg-white/25 !text-white">
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Âm thanh
        </button>
      </div>

      <div className="-mx-4 mt-1 grid place-items-center" style={{ minHeight: 200 }}>
        {showResult ? (
          <div className="py-3">
            <img
              src={IMG.big}
              alt={j.pig.name}
              className="h-44 w-44 rounded-[36px] border-4 border-white object-cover shadow-[0_14px_30px_rgba(60,30,120,.35)]"
            />
          </div>
        ) : (
          <motion.img
            src={IMG.glob}
            alt="Máy xu của heo"
            className="w-full"
            style={{ maskImage: 'linear-gradient(#000 82%, transparent)' }}
            animate={motionOff ? undefined : rolling ? { scale: [1, 1.04, 0.97, 1], rotate: [-1.5, 1.5, -1.5] } : { y: [0, -8, 0] }}
            transition={{ duration: rolling ? 0.45 : 2.4, repeat: Infinity }}
          />
        )}
      </div>

      <div className="-mt-3 rounded-[34px] p-5" style={{ background: 'linear-gradient(180deg,#fff,#ffeaf2)', color: '#3b2a6b' }}>
        <p className="muted text-center !text-xs !text-[#7d74a8]">{fmtLongDate(today)}</p>

        {goalReached && !reveal ? (
          <div className="py-6 text-center"><p className="text-4xl">🎆</p><h2 className="h2 mt-2">Đã hoàn thành mục tiêu!</h2><p className="muted mt-1 !text-[#7d74a8]">Không cần mở thêm số tiền nữa. Tạo hành trình mới ở “Của chúng mình”.</p><div className="mt-4"><Button onClick={() => nav('/couple')}>Sang “Của chúng mình”</Button></div></div>
        ) : !j.revealEnabled && !reveal ? (
          <div className="py-6 text-center"><h2 className="h3">Tính năng mở số tiền đang tắt</h2><p className="muted mt-1 !text-[#7d74a8]">Bật lại trong Cài đặt của “Của chúng mình”.</p></div>
        ) : !reveal || rolling ? (
          <>
            <h2 className="h2 mt-1 text-center">Hôm nay là ngày cùng nhau thử thách!</h2>
            <p className="muted mt-1 text-center !text-[#7d74a8]">Tụi mình sẽ tiết kiệm bao nhiêu nhỉ?</p>
            <div className="mt-4 flex gap-3" aria-live="off">
              {(['a', 'b'] as const).map((k) => (
                <div key={k} className="min-w-0 flex-1 text-center">
                  <div className="slot">{rolling ? `+${ticker[k].toLocaleString('vi-VN')}` : '???'}</div>
                  <p className="mt-1 text-xs font-extrabold">{j.members[k].name}</p>
                </div>
              ))}
            </div>
            {!rolling && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold">
                <span>Người bấm mở:</span>
                {(['a', 'b'] as const).map((k) => <Chip key={k} on={by === k} onClick={() => setBy(k)}>{j.members[k].name}</Chip>)}
              </div>
            )}
            <Button variant="violet" className="mt-4" disabled={rolling} onClick={start}>{rolling ? 'Đang mở…' : 'MỞ KẾT QUẢ HÔM NAY'}</Button>
            <p className="muted mt-3 text-center !text-[11px] !text-[#7d74a8]">Đây là nghi thức tiết kiệm, không phải trò chơi may rủi. Kết quả nằm trong kế hoạch của hai bạn và chỉ mở một lần mỗi ngày.</p>
          </>
        ) : (
          <>
            <h2 className="h2 text-center text-[#6a4cd8]">Kết quả hôm nay</h2>
            <p className="muted mt-0.5 text-center !text-[#7d74a8]">{allDone ? '🎉 Cả hai đã góp xong! Heo vui lắm!' : msg}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(['a', 'b'] as const).map((k) => {
                const c = cs.find((x) => x.member === k)
                return (
                  <motion.div key={k} initial={motionOff ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: k === 'a' ? 0 : 0.05 }} className="text-center">
                    <Avatar value={j.members[k].avatar} size={60} className="mx-auto" />
                    <p className="muted mt-1 !text-[#7d74a8]">{j.members[k].name}</p>
                    <p className="text-[22px] font-black" style={{ color: k === 'a' ? '#3b82f6' : '#ff4d8d' }}>+{vnd(reveal.amounts[k])}</p>
                    {c && <Badge tone={c.status === 'confirmed' ? 'ok' : 'warn'}>{c.status === 'confirmed' ? 'Đã góp ✅' : 'Chờ xác nhận ⏳'}</Badge>}
                  </motion.div>
                )
              })}
            </div>
            <p className="mt-3 text-center text-sm font-extrabold">Tổng hôm nay: <span className="text-pink">{vnd(reveal.amounts.a + reveal.amounts.b)}</span></p>

            <dl className="mt-4 space-y-2 rounded-2xl bg-[#8f7cf0]/10 p-3 text-[13px]">
              <div className="flex justify-between"><dt className="muted !text-[#7d74a8]">Ngân sách tháng này</dt><dd className="font-black">{vnd(budget)}</dd></div>
              <div className="flex justify-between"><dt className="muted !text-[#7d74a8]">Đã mở trong tháng</dt><dd className="font-black">{vnd(monthUsed)}</dd></div>
              <div className="flex justify-between"><dt className="muted !text-[#7d74a8]">Ngân sách còn lại</dt><dd className="font-black">{vnd(Math.max(0, budget - monthUsed))}</dd></div>
              <div className="flex justify-between"><dt className="muted !text-[#7d74a8]">Tiến độ mục tiêu</dt><dd className="font-black">{pct(progress)}</dd></div>
            </dl>
            <ProgressBar value={progress} className="mt-2" label="Tiến độ mục tiêu" />

            <p className="muted mt-3 !text-xs !text-[#7d74a8]">
              {j.requireConfirmation ? 'Chỉ số tiền đã được xác nhận mới được cộng vào heo.' : 'Chế độ này tự động ghi nhận khoản góp khi mở kết quả.'}
              {' '}Đã xác nhận: <b>{vnd(conf.total)}</b> · Đang chờ: <b>{vnd(pend.total)}</b>
            </p>

            <div className="mt-3 space-y-2.5">
              {cs.map((c) => c.status === 'confirmed'
                ? <div key={c.id} className="pill block !py-2 text-center">{j.members[c.member].name} đã góp {vnd(c.amount)} ✅</div>
                : <Button key={c.id} size="sm" onClick={() => confirm(c.id)}>{j.members[c.member].name} xác nhận đã góp {vnd(c.amount)}</Button>)}
            </div>
            {cs.some((c) => c.status === 'pending') && <p className="muted mt-2 text-center !text-[11px] !text-[#7d74a8]">Mỗi người xác nhận khoản của mình (trên máy của mình khi dùng 2 thiết bị).</p>}
            <div className="mt-4"><Button variant="violet" onClick={() => nav('/journal')}>Xem nhật ký</Button></div>
          </>
        )}
      </div>
    </div>
  )
}


