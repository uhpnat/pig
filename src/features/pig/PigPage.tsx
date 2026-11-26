import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Hammer,
  Pencil,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { Badge, Button, Card, Modal } from '@/components/ui'
import { diffDays, fmtDate, vnd } from '@/domain/format'
import { actualShares, confirmedTotals, pigStage } from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'
import { IMG } from '@/lib/assets'
import type { PigConfig } from '@/domain/types'

const PIG_AVATARS: { id: PigConfig['style']; label: string; thumb: string; sprite: string }[] = [
  { id: 'crown', label: 'Heo pha lê vàng', thumb: IMG.t0, sprite: IMG.spriteHero },
  { id: 'round', label: 'Heo kính râm', thumb: IMG.t1, sprite: IMG.spriteShades },
  { id: 'glasses', label: 'Heo kính cận', thumb: IMG.t2, sprite: IMG.spriteGlasses },
  { id: 'hoodie', label: 'Heo áo hoodie', thumb: IMG.t3, sprite: IMG.spriteHoodie },
]

const EVOLUTION_STAGES = [
  { pct: 0, icon: '🐣', name: 'Heo con mới sinh', desc: 'Bắt đầu hành trình tích luỹ' },
  { pct: 25, icon: '🍼', name: 'Đang ăn dặm', desc: 'Đã gom được 1/4 chặng đường' },
  { pct: 60, icon: '🌸', name: 'Tròn trịa mũm mĩm', desc: 'Bụng heo đã lưng lửng xu vàng' },
  { pct: 100, icon: '👑', name: 'Heo vàng đại gia', desc: 'Sẵn sàng đập heo ăn mừng!' },
]

export default function PigPage() {
  const j = useJourney()
  const { state, repo, run, celebrate, toast, confirmed, progress, today, motionOff } = useStore()
  const nav = useNavigate()

  const [pig, setPig] = useState<PigConfig>(j.pig)
  const [smashModal, setSmashModal] = useState(false)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [tempName, setTempName] = useState(j.pig.name)

  const idx = Math.max(0, PIG_AVATARS.findIndex((a) => a.id === pig.style))
  const current = PIG_AVATARS[idx] || PIG_AVATARS[0]

  // Total goal progress & member shares for the Target-Date Pig on Heo Đất tab!
  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const shareA = actual.a * 100
  const shareB = actual.b * 100

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
  const dailyAvg = elapsedDays > 0 ? Math.round(confirmed.total / elapsedDays) : Math.round(confirmed.total)
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
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 40%, #f5f3ff 72%, #fce7f3 100%)',
      }}
    >
      {/* 1. Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4">
        {!j.setupDone ? (
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => nav('/welcome')}
            className="grid h-10 w-10 place-items-center rounded-full border-0 bg-white/85 text-[#1e1b4b] shadow-sm"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempName(pig.name)
              setEditNameOpen(true)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/90 bg-white/85 px-3.5 py-1.5 shadow-sm backdrop-blur-md transition-transform active:scale-95"
          >
            <span className="text-base">🐷</span>
            <span className="text-xs font-black text-[#1e1b4b]">{pig.name}</span>
            <Pencil size={12} className="text-indigo-500 ml-0.5" />
          </button>
        )}

        <span className="rounded-full border border-purple-200 bg-white/90 px-3 py-1 text-xs font-black text-purple-700 shadow-sm">
          {stageInfo.label}
        </span>
      </header>

      {/* 2. Interactive 3D Piggy Mascot with Goal-to-Target-Date Translucent Fill */}
      <div className="relative mt-1">
        <Interactive3DStage
          spriteSrc={current.sprite}
          alt={pig.name}
          theme="pastel"
          spriteHeight={250}
          reducedMotion={motionOff}
          liquidFillPct={progress}
          liquidLabel={`🎯 Mục tiêu đến ${fmtDate(targetDateStr)}: ${progress.toFixed(1)}%`}
          membersShare={{
            a: {
              name: j.members.a.name,
              avatar: j.members.a.avatar,
              amount: t.a,
              pct: shareA,
              gender: j.members.a.gender,
            },
            b: {
              name: j.members.b.name,
              avatar: j.members.b.avatar,
              amount: t.b,
              pct: shareB,
              gender: j.members.b.gender,
            },
          }}
          onPoke={() => {
            beep(state.settings, 'tick')
            haptic(state.settings, 30)
          }}
        />

        {/* Carousel arrows to preview styles */}
        <div className="pointer-events-none absolute inset-x-3 top-[42%] -translate-y-1/2 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Trang phục trước"
            className="pointer-events-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white bg-white/90 text-[#1e1b4b] shadow-md backdrop-blur-sm transition-transform active:scale-95"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Trang phục kế tiếp"
            className="pointer-events-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white bg-white/90 text-[#1e1b4b] shadow-md backdrop-blur-sm transition-transform active:scale-95"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3 px-4">
        {/*First-time onboarding confirm button if setupDone is false */}
        {!j.setupDone && (
          <Button variant="violet" className="w-full !py-3.5 !text-base shadow-lg" onClick={saveStyle}>
            ✨ Hoàn tất & Bắt đầu nuôi {pig.name}
          </Button>
        )}

        {/* 3. ĐỒNG HỒ ĐẾM NGƯỢC THỜI GIAN CUỐI CÙNG (Live Final Countdown Clock) */}
        <div className="relative overflow-hidden rounded-[26px] border-2 border-white bg-white/95 p-4 text-center shadow-[0_12px_28px_rgba(70,30,130,.12)] backdrop-blur-md">
          <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-indigo-600">
            <Clock size={13} /> Đếm ngược đến ngày đập heo
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Hạn chót: <b className="text-[#1e1b4b]">{fmtDate(targetDateStr)}</b>
          </p>

          {/* 4 Flip-Box Countdown Display */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { val: timeLeft.days, label: 'Ngày', bg: 'bg-indigo-50/80 border-indigo-100', color: '#4f46e5' },
              { val: timeLeft.hours, label: 'Giờ', bg: 'bg-sky-50/80 border-sky-100', color: '#0284c7' },
              { val: timeLeft.minutes, label: 'Phút', bg: 'bg-purple-50/80 border-purple-100', color: '#9333ea' },
              { val: timeLeft.seconds, label: 'Giây', bg: 'bg-pink-50/80 border-pink-100', color: '#e11d48' },
            ].map((box, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center rounded-2xl border py-2.5 shadow-inner ${box.bg}`}
              >
                <span
                  className="text-[24px] font-black leading-none tabular-nums"
                  style={{ color: box.color }}
                >
                  {String(box.val).padStart(2, '0')}
                </span>
                <span className="mt-1 text-[10px] font-black uppercase text-slate-500">
                  {box.label}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Bar from Start to End */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{fmtDate(j.startDate)}</span>
              <span className="font-black text-indigo-700">Đã đi {timeProgressPct.toFixed(0)}% thời gian</span>
              <span>{fmtDate(j.endDate)}</span>
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

        {/* 4. THAY TRANG PHỤC CHO BÉ HEO (Wardrobe Dock) */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-pink-500" />
              <h2 className="h3 text-[#1e1b4b]">Tủ đồ của {pig.name}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
              {current.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PIG_AVATARS.map((a) => {
              const active = a.id === pig.style
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPig((p) => ({ ...p, style: a.id }))}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-200'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <img src={a.sprite} alt={a.label} className="h-12 w-12 object-contain drop-shadow-sm" />
                  <span className="mt-1 truncate text-[10px] font-black text-[#1e1b4b]">
                    {a.label.replace('Heo ', '')}
                  </span>
                </button>
              )
            })}
          </div>

          {pig.style !== j.pig.style && (
            <Button variant="violet" className="mt-3 w-full !py-2.5 text-xs" onClick={saveStyle}>
              ✨ Lưu trang phục mới này
            </Button>
          )}
        </Card>

        {/* 5. CẤP ĐỘ TIẾN HÓA HEO ĐẤT (4-Stage Evolution Roadmap) */}
        <Card className="!mt-0">
          <h2 className="h3 text-[#1e1b4b]">🌱 Cấp độ tiến hóa của Heo</h2>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {EVOLUTION_STAGES.map((st, i) => {
              const unlocked = progress >= st.pct
              const isCurrent =
                progress >= st.pct &&
                (i === EVOLUTION_STAGES.length - 1 || progress < EVOLUTION_STAGES[i + 1].pct)
              return (
                <div
                  key={st.name}
                  className={`rounded-2xl border p-2.5 transition-all ${
                    isCurrent
                      ? 'border-pink-400 bg-pink-50/80 shadow-sm ring-1 ring-pink-300'
                      : unlocked
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-100 bg-slate-50/70 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{st.icon}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 shadow-sm">
                      Mốc {st.pct}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-black text-[#1e1b4b]">{st.name}</p>
                  <p className="text-[10.5px] font-semibold text-slate-500 leading-snug">{st.desc}</p>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 6. DỰ BÁO NGÀY ĐẬP HEO & TIẾN TRÌNH TIẾT KIỆM */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="h3 text-[#1e1b4b]">Kế hoạch về đích</h2>
            </div>
            <Badge tone={progress >= 100 ? 'ok' : 'warn'}>
              {progress >= 100 ? 'Đã hoàn thành! 🎆' : `Đạt ${progress.toFixed(1)}%`}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
              <p className="font-bold text-slate-500">Đã bỏ vào heo</p>
              <p className="mt-0.5 text-base font-black text-emerald-600 tabular-nums">
                {vnd(confirmed.total)}
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5">
              <p className="font-bold text-slate-500">Còn thiếu</p>
              <p className="mt-0.5 text-base font-black text-rose-600 tabular-nums">
                {vnd(remainingMoney)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs font-extrabold leading-relaxed text-amber-900">
            💡 Tốc độ gom tiền trung bình: <b>~{vnd(dailyAvg)}/ngày</b>.
            {progress >= 100 ? (
              <span className="mt-1 block font-black text-emerald-700">
                🎉 Mục tiêu đã hoàn thành xuất sắc! Hai bạn có thể đập heo ngay bây giờ!
              </span>
            ) : (
              <span className="mt-1 block">
                Cùng nhau duy trì để cán mốc <b>{vnd(j.goal)}</b> vào ngày {fmtDate(j.endDate)} nhé!
              </span>
            )}
          </div>

          {/* Smash Pig Button */}
          <div className="mt-3">
            <Button
              variant={progress >= 100 ? 'pink' : 'ghost'}
              className="flex w-full items-center justify-center gap-2 !py-3 text-sm"
              onClick={() => {
                celebrate(['🪙', '✨', '🎉', '💖'])
                haptic(state.settings, [80, 50, 80])
                beep(state.settings, 'win')
                setSmashModal(true)
              }}
            >
              <Hammer size={18} />{' '}
              {progress >= 100 ? '🔨 ĐẬP HEO ĂN MỪNG NGAY!' : '🔨 Xem trước lễ đập heo'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Smash Pig Celebration Modal */}
      <Modal open={smashModal} onClose={() => setSmashModal(false)} title="🎉 Lễ Đập Heo Của Đôi Mình">
        <div className="mt-2 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-pink-100 text-4xl shadow-inner">
            🐷🪙
          </div>
          <h3 className="mt-3 text-lg font-black text-[#1e1b4b]">
            Tổng số tiền trong bụng {pig.name}:
          </h3>
          <p className="text-3xl font-black text-[#e11d48]">{vnd(confirmed.total)}</p>
          <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
            Hành trình của {j.members.a.name} & {j.members.b.name} hướng tới ngày{' '}
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
