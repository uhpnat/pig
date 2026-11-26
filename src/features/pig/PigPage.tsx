import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Hammer,
  Pencil,
  Trophy,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { Badge, Button, Card, Modal } from '@/components/ui'
import { diffDays, fmtDate, vnd } from '@/domain/format'
import { pigStage } from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'
import { IMG } from '@/lib/assets'
import type { PigConfig } from '@/domain/types'

const PIG_AVATARS: { id: PigConfig['style']; label: string; thumb: string; sprite: string }[] = [
  { id: 'crown', label: 'Heo đồng xu vàng', thumb: IMG.t0, sprite: IMG.spriteHero },
  { id: 'round', label: 'Heo kính râm', thumb: IMG.t1, sprite: IMG.spriteShades },
  { id: 'glasses', label: 'Heo kính cận', thumb: IMG.t2, sprite: IMG.spriteGlasses },
  { id: 'hoodie', label: 'Heo áo hoodie', thumb: IMG.t3, sprite: IMG.spriteHoodie },
]

export default function PigPage() {
  const j = useJourney()
  const { state, repo, run, celebrate, toast, confirmed, progress, today } = useStore()
  const nav = useNavigate()

  const [pig, setPig] = useState<PigConfig>(j.pig)
  const [smashModal, setSmashModal] = useState(false)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [tempName, setTempName] = useState(j.pig.name)

  const idx = Math.max(0, PIG_AVATARS.findIndex((a) => a.id === pig.style))
  const current = PIG_AVATARS[idx] || PIG_AVATARS[0]

  // Final Target Date Countdown
  const targetDateStr = j.endDate
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = new Date(`${targetDateStr}T23:59:59+07:00`).getTime()
      const now = Date.now()
      const diff = Math.max(0, targetTime - now)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [targetDateStr])

  // Total days and time elapsed
  const totalDays = Math.max(1, diffDays(j.startDate, j.endDate))
  const elapsedDays = Math.max(0, diffDays(j.startDate, today))
  const timeProgressPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
  const daysLeft = Math.max(0, diffDays(today, j.endDate))

  // Pig Stage based on savings progress
  const stageInfo = pigStage(progress)

  // Average daily saving rate
  const dailyAvg = elapsedDays > 0 ? Math.round(confirmed.total / elapsedDays) : 0
  const remainingMoney = Math.max(0, j.goal - confirmed.total)

  const cycle = (dir: -1 | 1) => {
    const nextIdx = (idx + dir + PIG_AVATARS.length) % PIG_AVATARS.length
    setPig((p) => ({ ...p, style: PIG_AVATARS[nextIdx].id }))
  }

  const saveStyle = async () => {
    const ok = j.setupDone
      ? await run(repo.updateJourney({ pig: { ...pig, name: pig.name.trim() } }))
      : await run(repo.saveJourney({ ...j, pig: { ...pig, name: pig.name.trim() }, setupDone: true }))
    if (ok) {
      celebrate(['✨', '🐷', '👑'])
      toast('Đã lưu trang phục mới cho bé heo! 🐷✨')
      if (!j.setupDone) nav('/')
    }
  }

  const saveName = async () => {
    if (!tempName.trim()) return toast('Hãy đặt tên cho heo nhé!', 'error')
    const ok = await run(repo.updateJourney({ pig: { ...pig, name: tempName.trim() } }))
    if (ok) {
      setPig((p) => ({ ...p, name: tempName.trim() }))
      setEditNameOpen(false)
      toast('Đã đổi tên bé heo thành công! 💖')
    }
  }

  return (
    <div
      className="relative min-h-[100dvh] pb-[calc(104px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 40%, #f5f3ff 75%, #fce7f3 100%)',
      }}
    >
      {/* 1. Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-4">
        {!j.setupDone ? (
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => nav('/welcome')}
            className="grid h-10 w-10 place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 py-1 shadow-sm backdrop-blur-sm">
            <span className="text-base">🐷</span>
            <span className="text-xs font-black text-[#1e1b4b]">{pig.name}</span>
            <button
              type="button"
              onClick={() => {
                setTempName(pig.name)
                setEditNameOpen(true)
              }}
              className="text-slate-400 hover:text-slate-700 ml-0.5"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-black text-purple-700 shadow-sm">
            {stageInfo.label}
          </span>
        </div>
      </header>

      {/* 2. Interactive 3D Piggy Mascot */}
      <div className="relative mt-2">
        <Interactive3DStage
          spriteSrc={current.sprite}
          alt={pig.name}
          theme="pastel"
          spriteHeight={260}
          onPoke={() => {
            beep(state.settings, 'tick')
            haptic(state.settings, 30)
          }}
        />

        {/* Carousel arrows to preview styles */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Trang phục trước"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-white/90 text-[#1e1b4b] shadow-md backdrop-blur-sm transition-transform active:scale-95"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Trang phục kế tiếp"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-white/90 text-[#1e1b4b] shadow-md backdrop-blur-sm transition-transform active:scale-95"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-3.5 space-y-3.5 px-4">
        {/* 3. ĐỒNG HỒ ĐẾM NGƯỢC THỜI GIAN CUỐI CÙNG (Live Final Countdown Clock) */}
        <div className="relative overflow-hidden rounded-[28px] border-2 border-white bg-white/95 p-4 text-center shadow-[0_12px_28px_rgba(70,30,130,.15)] backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#6366f1]">
            <Clock size={15} /> Đếm ngược đến ngày đập heo cuối cùng
          </div>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            Ngày về đích: <b className="text-[#1e1b4b]">{fmtDate(targetDateStr)}</b>
          </p>

          {/* 4 Flip-Box Countdown Display */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { val: timeLeft.days, label: 'Ngày', color: '#4f46e5' },
              { val: timeLeft.hours, label: 'Giờ', color: '#2563eb' },
              { val: timeLeft.minutes, label: 'Phút', color: '#db2777' },
              { val: timeLeft.seconds, label: 'Giây', color: '#e11d48' },
            ].map((box, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-[#f8fafc] py-2 shadow-inner"
              >
                <span
                  className="text-[26px] font-black leading-none tabular-nums"
                  style={{ color: box.color }}
                >
                  {String(box.val).padStart(2, '0')}
                </span>
                <span className="mt-1 text-[10px] font-black uppercase text-slate-400">
                  {box.label}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Bar from Start to End */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Bắt đầu: {fmtDate(j.startDate)}</span>
              <span className="font-black text-purple-700">Đã đi {timeProgressPct.toFixed(0)}%</span>
              <span>Đích: {fmtDate(j.endDate)}</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, timeProgressPct))}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-xs font-extrabold text-slate-600">
              ⏳ Còn <b>{daysLeft} ngày</b> nữa là hai bạn chạm tay vào hũ vàng!
            </p>
          </div>
        </div>

        {/* 4. DỰ BÁO NGÀY ĐẬP HEO & TIẾN TRÌNH TIẾT KIỆM */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="h3 text-[#1e1b4b]">Kế hoạch về đích</h2>
            </div>
            <Badge tone={progress >= 100 ? 'ok' : 'warn'}>
              {progress >= 100 ? 'Đã hoàn thành! 🎆' : `${progress.toFixed(1)}%`}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <p className="text-slate-500 font-bold">Đã bỏ vào heo</p>
              <p className="mt-0.5 text-base font-black text-emerald-600">{vnd(confirmed.total)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <p className="text-slate-500 font-bold">Còn thiếu</p>
              <p className="mt-0.5 text-base font-black text-rose-600">{vnd(remainingMoney)}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-amber-50/80 p-3 border border-amber-200/80 text-xs font-extrabold text-amber-900 leading-relaxed">
            💡 Tốc độ gom tiền trung bình: <b>~{vnd(dailyAvg)}/ngày</b>.
            {progress >= 100 ? (
              <span className="block mt-1 text-emerald-700 font-black">
                🎉 Mục tiêu đã hoàn thành xuất sắc! Hai đứa mình có thể đập heo ngay bây giờ!
              </span>
            ) : (
              <span className="block mt-1">
                Duy trì tốc độ này, hai bạn sẽ đạt <b>{vnd(j.goal)}</b> đúng hạn vào ngày {fmtDate(j.endDate)}!
              </span>
            )}
          </div>

          {/* Smash Pig Button */}
          <div className="mt-3">
            <Button
              variant={progress >= 100 ? 'pink' : 'ghost'}
              className="w-full !py-3 flex items-center justify-center gap-2 text-sm"
              onClick={() => {
                celebrate(['🪙', '✨', '🎉', '💖'])
                haptic(state.settings, [80, 50, 80])
                beep(state.settings, 'win')
                setSmashModal(true)
              }}
            >
              <Hammer size={18} /> {progress >= 100 ? '🔨 ĐẬP HEO ĂN MỪNG NGAY!' : '🔨 Xem trước lễ đập heo'}
            </Button>
          </div>
        </Card>

        {/* 5. THAY TRANG PHỤC CHO BÉ HEO */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <h2 className="h3 text-[#1e1b4b]">Trang phục heo đất</h2>
            <span className="text-xs font-bold text-slate-500">{current.label}</span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PIG_AVATARS.map((a) => {
              const active = a.id === pig.style
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPig((p) => ({ ...p, style: a.id }))}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all ${
                    active
                      ? 'border-[#6366f1] bg-[#e0e7ff] shadow-md ring-2 ring-indigo-300'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <img src={a.thumb} alt={a.label} className="h-12 w-12 object-contain" />
                  <span className="mt-1 truncate text-[10px] font-black text-[#1e1b4b]">
                    {a.label.replace('Heo ', '')}
                  </span>
                </button>
              )
            })}
          </div>

          {pig.style !== j.pig.style && (
            <Button variant="violet" className="mt-3 w-full !py-2.5 text-xs" onClick={saveStyle}>
              Lưu trang phục mới này 🐷
            </Button>
          )}
        </Card>
      </div>

      {/* Smash Pig Celebration Modal */}
      <Modal open={smashModal} onClose={() => setSmashModal(false)} title="🎉 Lễ Đập Heo Của Đôi Mình">
        <div className="mt-2 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-pink-100 text-4xl shadow-inner">
            🐷🪙
          </div>
          <h3 className="mt-3 text-lg font-black text-[#1e1b4b]">
            Tổng số tiền trong bụng bé heo:
          </h3>
          <p className="text-3xl font-black text-[#e11d48]">{vnd(confirmed.total)}</p>
          <p className="mt-2 text-xs font-bold text-slate-500 leading-relaxed">
            Hành trình của {j.members.a.name} & {j.members.b.name} đếm ngược đến ngày{' '}
            <b>{fmtDate(j.endDate)}</b>. Mỗi đồng xu nhỏ gom góp đều là tình yêu của hai bạn!
          </p>
          <Button
            variant="violet"
            className="mt-4 w-full"
            onClick={() => {
              setSmashModal(false)
              celebrate(['🎆', '🎉', '💖'])
            }}
          >
            Tuyệt vời quá! 💖
          </Button>
        </div>
      </Modal>

      {/* Edit Pig Name Modal */}
      <Modal open={editNameOpen} onClose={() => setEditNameOpen(false)} title="Đổi tên bé heo">
        <div className="mt-2">
          <label className="label">Tên mới cho bé heo</label>
          <input
            className="field mt-1"
            value={tempName}
            maxLength={20}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Nhập tên heo..."
          />
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setEditNameOpen(false)}>
              Hủy
            </Button>
            <Button variant="violet" onClick={saveName}>
              Lưu tên mới
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
