import { Bell, Clock, PlusCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { Avatar, Badge, Button, Card, Modal } from '@/components/ui'
import { GenderSelectDialog } from '@/components/GenderSelectDialog'
import { monthlyBudget } from '@/domain/engine'
import { fmtDate, vnd } from '@/domain/format'
import type { Contribution } from '@/domain/types'
import { actualShares, confirmedTotals, pigStage } from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'
import { IMG } from '@/lib/assets'
import { TopUpDialog } from './TopUpDialog'

const STYLE_SPRITE: Record<string, string> = {
  crown: IMG.spriteHero,
  baby: IMG.spriteHero,
  round: IMG.spriteShades,
  glasses: IMG.spriteGlasses,
  hat: IMG.spriteShades,
  hoodie: IMG.spriteHoodie,
}

export default function HomePage() {
  const j = useJourney()
  const {
    state,
    repo,
    run,
    toast,
    celebrate,
    confirmed,
    progress,
    today,
    unread,
    goalReached,
    motionOff,
    myMemberId,
    myMember,
    partnerMemberId,
    partnerMember,
  } = useStore()
  const nav = useNavigate()
  const [topUp, setTopUp] = useState(false)
  const [genderDialogOpen, setGenderDialogOpen] = useState(false)
  const [depositAlertDismissed, setDepositAlertDismissed] = useState(false)
  // Two Pig Modes right on HomePage: 'month' (Heo theo tháng) vs 'final' (Heo cuối kỳ)
  const [pigMode, setPigMode] = useState<'month' | 'final'>('month')

  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')
  const extraPending = state.contributions.filter((c) => !c.revealId && c.status === 'pending')

  const myDailyC = cs.find((x) => x.member === myMemberId)
  const myDailyBy = myDailyC?.confirmedBy ?? (myDailyC?.status === 'confirmed' ? ['a', 'b'] : [])
  const partnerDailyC = cs.find((x) => x.member === partnerMemberId)
  const partnerDailyBy = partnerDailyC?.confirmedBy ?? (partnerDailyC?.status === 'confirmed' ? ['a', 'b'] : [])

  // Show popup notification to 2nd user (or whenever today's reveal exists and this user hasn't reported their deposit yet)
  const showSecondUserDepositModal =
    !!reveal &&
    !depositAlertDismissed &&
    (!myDailyBy.includes(myMemberId) ||
      (partnerDailyBy.includes(partnerMemberId) && !partnerDailyBy.includes(myMemberId)))

  const handleConfirmContrib = async (c: Contribution) => {
    const out = await run(repo.confirmContribution(c.id, myMemberId))
    if (!out) return
    const updated = out.contributions.find((x) => x.id === c.id)
    if (updated?.status === 'confirmed') {
      celebrate(['🪙', '💧', '✨', '🎉'])
      toast(
        `Đã duyệt hoàn tất (2/2)! Khoản ${vnd(c.amount)} của ${j.members[c.member].name} đã vào quỹ heo đất! 🐷🎉`,
      )
    } else if (c.member === myMemberId) {
      toast(`Đã báo nạp ${vnd(c.amount)} (1/2)! Chờ ${partnerMember?.name} xác nhận chéo nhé ⏳`)
    } else {
      toast(`Đã xác nhận cho ${partnerMember?.name} (1/2)! ⏳`)
    }
  }

  // 1. Monthly Pig Metrics (Heo theo tháng)
  const curMonthKey = today.slice(0, 7)
  const monthContribs = state.contributions.filter(
    (c) => c.status === 'confirmed' && c.date.startsWith(curMonthKey),
  )
  const monthSaved = monthContribs.reduce((sum, c) => sum + c.amount, 0)
  const monthA = monthContribs.filter((c) => c.member === 'a').reduce((sum, c) => sum + c.amount, 0)
  const monthB = monthContribs.filter((c) => c.member === 'b').reduce((sum, c) => sum + c.amount, 0)
  const monthShareA = monthSaved > 0 ? (monthA / monthSaved) * 100 : actual.a * 100
  const monthShareB = monthSaved > 0 ? (monthB / monthSaved) * 100 : actual.b * 100
  const mBudget = Math.max(1, monthlyBudget(j))
  const monthPct = Math.min(100, (monthSaved / mBudget) * 100)

  // 2. Final-Term Pig Metrics & Live Countdown (Heo cuối kỳ)
  const totalShareA = actual.a * 100
  const totalShareB = actual.b * 100
  const targetDateStr = j.endDate
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = new Date(`${targetDateStr}T23:59:59+07:00`).getTime()
      const diff = Math.max(0, targetTime - Date.now())
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [targetDateStr])

  const activeFillPct = pigMode === 'month' ? monthPct : progress
  const activeShareA = pigMode === 'month' ? monthShareA : totalShareA
  const activeShareB = pigMode === 'month' ? monthShareB : totalShareB
  const activeAmountA = pigMode === 'month' ? monthA : t.a
  const activeAmountB = pigMode === 'month' ? monthB : t.b

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const memberMale = isBMale ? j.members.b : j.members.a
  const memberFemale = isBMale ? j.members.a : j.members.b
  const activePctMale = isBMale ? activeShareB : activeShareA
  const activePctFemale = isBMale ? activeShareA : activeShareB

  const stage = pigStage(progress)
  const isMyMale = myMember?.gender === 'male'

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col justify-between pb-[calc(88px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        background:
          'linear-gradient(180deg, #b8e1ff 0px, #b8e1ff 76px, #d8f0ff 28%, #e8f8dc 52%, #fdf2f7 78%, #fde8f1 100%)',
      }}
    >
      {/* TOP HERO ZONE: Header + Mode Switcher + 3D Pig on Feathered Meadow */}
      <div className="relative">
        {/* 1. Sleek Top Navigation Bar */}
        <header className="relative z-20 flex items-center justify-between gap-2 px-4">
          <Link
            to="/couple"
            className="flex min-w-0 items-center gap-2 rounded-full border border-white/90 bg-white/85 py-1 pl-1.5 pr-3 shadow-sm backdrop-blur-md no-underline transition-transform active:scale-95"
          >
            <div className="flex items-center">
              <Avatar value={j.members.a.avatar} size={30} className="z-10 ring-2 ring-white" />
              <Avatar value={j.members.b.avatar} size={30} className="-ml-2 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black leading-tight text-[#1e1b4b]">{j.name}</p>
              <p className="truncate text-[10px] font-extrabold text-pink-600">{stage.label}</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setGenderDialogOpen(true)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-white px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-md transition-transform active:scale-95 ${
                isMyMale ? 'bg-sky-50/95 text-sky-900' : 'bg-pink-50/95 text-pink-900'
              }`}
            >
              <span>{isMyMale ? '👦' : '👧'}</span>
              <span className="max-w-[78px] truncate">{myMember?.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black ${
                  isMyMale ? 'bg-sky-200/80 text-sky-800' : 'bg-pink-200/80 text-pink-800'
                }`}
              >
                ✏️ Sửa
              </span>
            </button>

            <Link
              to="/notifications"
              aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-white/90 bg-white/85 text-[#1e1b4b] shadow-sm backdrop-blur-md no-underline transition-transform active:scale-95"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#ff3b6b] px-1 text-[9px] font-black text-white">
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* 2. Floating Segmented Switcher: Heo theo tháng vs Heo cuối kỳ */}
        <div className="relative z-20 mt-2.5 px-4">
          <div className="mx-auto grid max-w-[330px] grid-cols-2 gap-1 rounded-full border-2 border-white bg-white/85 p-1 shadow-[0_6px_18px_rgba(30,27,75,0.08)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPigMode('month')}
              className={`cursor-pointer rounded-full border-0 py-1.5 text-xs font-black transition-all ${
                pigMode === 'month'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Heo theo tháng
            </button>
            <button
              type="button"
              onClick={() => setPigMode('final')}
              className={`cursor-pointer rounded-full border-0 py-1.5 text-xs font-black transition-all ${
                pigMode === 'final'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🎯 Heo cuối kỳ
            </button>
          </div>
        </div>

        {/* 3. HERO CENTERPIECE: 3D Crystal Piggy Bank on Smooth Feathered Meadow */}
        <div className="relative mt-0.5">
          <Interactive3DStage
            spriteSrc={STYLE_SPRITE[j.pig.style] || IMG.spriteHero}
            alt={`${j.pig.name} – ${pigMode === 'month' ? 'Heo theo tháng' : 'Heo cuối kỳ'}`}
            theme="meadow"
            spriteHeight={255}
            reducedMotion={motionOff}
            liquidFillPct={activeFillPct}
            membersShare={{
              a: {
                name: j.members.a.name,
                avatar: j.members.a.avatar,
                amount: activeAmountA,
                pct: activeShareA,
                gender: j.members.a.gender,
              },
              b: {
                name: j.members.b.name,
                avatar: j.members.b.avatar,
                amount: activeAmountB,
                pct: activeShareB,
                gender: j.members.b.gender,
              },
            }}
            onPoke={() => {
              beep(state.settings, 'tick')
              haptic(state.settings, 30)
            }}
          />
        </div>
      </div>

      {/* 4. CURVED GLASSMORPHIC BOTTOM SHEET (Overlaps smoothly over the feathered meadow with rounded-t-[36px] — NO flat horizontal cut!) */}
      <div
        className="relative z-20 -mt-5 flex-1 rounded-t-[36px] border-t-2 border-white px-4 pb-5 pt-3.5 shadow-[0_-12px_32px_rgba(80,140,90,0.12)] backdrop-blur-xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,248,252,0.96) 55%, rgba(253,232,241,0.98) 100%)',
        }}
      >
        {/* Subtle iOS drag-handle pill at top of bottom sheet */}
        <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-slate-200/90" />

        <div className="space-y-3">
          {/* 4A. Mode Summary Header inside the Curved Sheet */}
          {pigMode === 'month' ? (
            <div className="rounded-2xl border border-sky-100/90 bg-gradient-to-r from-sky-50/80 via-white to-pink-50/80 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-700">
                    📅 Quỹ heo tháng {curMonthKey.slice(5)}/{curMonthKey.slice(0, 4)}
                  </span>
                  <p className="mt-0.5 text-lg font-black text-[#1e1b4b] tabular-nums">
                    <AnimatedNumber value={monthSaved} format={(n) => vnd(Math.round(n))} />{' '}
                    <span className="text-xs font-bold text-slate-400">/ {vnd(mBudget)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-2.5 py-1 text-xs font-black text-white shadow-sm tabular-nums">
                    💧 {monthPct.toFixed(0)}%
                  </span>
                  <p className="mt-1 text-[10px] font-extrabold text-slate-500">
                    👦 {memberMale.name} {activePctMale.toFixed(0)}% · 👧 {memberFemale.name} {activePctFemale.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, Math.min(100, monthPct))}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-purple-100/90 bg-gradient-to-r from-purple-50/80 via-white to-pink-50/80 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-purple-700">
                    <Clock size={12} /> Quỹ cuối kỳ ({fmtDate(targetDateStr)})
                  </span>
                  <p className="mt-0.5 text-lg font-black text-[#1e1b4b] tabular-nums">
                    <AnimatedNumber value={confirmed.total} format={(n) => vnd(Math.round(n))} />{' '}
                    <span className="text-xs font-bold text-slate-400">/ {vnd(j.goal)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-2.5 py-1 text-xs font-black text-white shadow-sm tabular-nums">
                    🎯 {progress.toFixed(1)}%
                  </span>
                  <p className="mt-1 text-[10px] font-extrabold text-slate-500">
                    👦 {memberMale.name} {activePctMale.toFixed(0)}% · 👧 {memberFemale.name} {activePctFemale.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Compact 4-box final countdown */}
              <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
                {[
                  { val: timeLeft.days, label: 'Ngày', color: '#4f46e5' },
                  { val: timeLeft.hours, label: 'Giờ', color: '#0284c7' },
                  { val: timeLeft.minutes, label: 'Phút', color: '#9333ea' },
                  { val: timeLeft.seconds, label: 'Giây', color: '#e11d48' },
                ].map((b, i) => (
                  <div key={i} className="rounded-xl border border-white bg-white/90 py-1.5 shadow-sm">
                    <p className="text-[15px] font-black leading-none tabular-nums" style={{ color: b.color }}>
                      {String(b.val).padStart(2, '0')}
                    </p>
                    <p className="mt-0.5 text-[9px] font-extrabold uppercase text-slate-400">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4B. XÁC NHẬN TIỀN HÔM NAY (2-person cross-confirmation) */}
          {goalReached ? (
            <Card className="!mt-0 text-center">
              <h2 className="h2">🎉 Hoàn thành mục tiêu!</h2>
              <p className="muted mt-1">Hai bạn đã chạm đích xuất sắc!</p>
            </Card>
          ) : !reveal ? (
            <div className="rounded-2xl border border-purple-100 bg-white p-3.5 text-center shadow-sm">
              <p className="text-xs font-black text-purple-700">
                <Sparkles size={13} className="mr-1 inline" /> Hôm nay chưa mở số tiền
              </p>
              <Button
                variant="violet"
                className="mt-2.5 w-full !py-3 !text-sm"
                onClick={() => nav('/reveal')}
              >
                🎰 {myMember?.name} kéo cần gạt mở số ngay
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#1e1b4b]">🎲 Xác nhận tiền hôm nay</h2>
                <Badge tone={allDone ? 'ok' : 'warn'}>
                  {allDone ? 'Đã duyệt đủ 2/2 ✅' : 'Duyệt chéo 2 người ⏳'}
                </Badge>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {/* My Card */}
                {(() => {
                  const myC = myDailyC
                  const cBy = myDailyBy
                  const done = myC?.status === 'confirmed'
                  const iConfirmed = cBy.includes(myMemberId)
                  return (
                    <div
                      className={`rounded-2xl border-2 p-2.5 text-center ${
                        isMyMale ? 'border-sky-300 bg-sky-50/75' : 'border-pink-300 bg-pink-50/75'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 min-w-0">
                        <Avatar value={myMember?.avatar || 'boy'} size={24} />
                        <span className="truncate text-xs font-black text-[#1e1b4b]">
                          {myMember?.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[8.5px] font-black text-white">
                          Bạn
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-base font-black tabular-nums ${
                          isMyMale ? 'text-sky-700' : 'text-pink-700'
                        }`}
                      >
                        +{vnd(reveal.amounts[myMemberId])}
                      </p>
                      {done ? (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-black text-emerald-700">
                          Đã vào quỹ (2/2) ✅
                        </span>
                      ) : iConfirmed ? (
                        <div className="mt-1.5 rounded-xl bg-amber-100/90 px-2 py-1 text-[10px] font-black text-amber-800">
                          ⏳ Đã nạp (1/2) · Chờ {partnerMember?.name}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => myC && handleConfirmContrib(myC)}
                          className={`mt-1.5 w-full cursor-pointer rounded-xl border-0 py-1.5 text-xs font-black text-white shadow-sm active:scale-95 ${
                            isMyMale
                              ? 'bg-gradient-to-r from-sky-500 to-blue-600'
                              : 'bg-gradient-to-r from-pink-500 to-rose-600'
                          }`}
                        >
                          💸 Tôi đã nạp ({cBy.length}/2)
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Partner Card */}
                {(() => {
                  const partnerC = partnerDailyC
                  const cBy = partnerDailyBy
                  const done = partnerC?.status === 'confirmed'
                  const partnerReported = cBy.includes(partnerMemberId)
                  const iApprovedPartner = cBy.includes(myMemberId)
                  return (
                    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 min-w-0">
                        <Avatar value={partnerMember?.avatar || 'girl'} size={24} />
                        <span className="truncate text-xs font-black text-[#1e1b4b]">
                          {partnerMember?.name}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-black tabular-nums text-purple-800">
                        +{vnd(reveal.amounts[partnerMemberId])}
                      </p>
                      {done ? (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-black text-emerald-800">
                          Đã vào quỹ (2/2) ✅
                        </span>
                      ) : iApprovedPartner ? (
                        <div className="mt-1.5 rounded-xl border border-amber-300 bg-amber-100 px-2 py-1.5 text-[10.5px] font-black text-amber-950">
                          ⏳ Đã duyệt (1/2) · Chờ {partnerMember?.name}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => partnerC && handleConfirmContrib(partnerC)}
                          className={`mt-1.5 w-full cursor-pointer rounded-xl border-0 px-2 py-1.5 text-xs font-black text-white shadow-md transition-transform active:scale-95 ${
                            partnerReported
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 animate-pulse'
                              : 'bg-gradient-to-r from-violet-600 to-indigo-600'
                          }`}
                        >
                          {partnerReported
                            ? `✅ Duyệt ${partnerMember?.name} (2/2)`
                            : `✅ Xác nhận cho ${partnerMember?.name}`}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Extra Pending Top-Ups needing 2-person cross-confirmation */}
              {extraPending.length > 0 && (
                <div className="mt-2.5 space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-2">
                  {extraPending.map((c) => {
                    const cBy = c.confirmedBy ?? []
                    const iConfirmed = cBy.includes(myMemberId)
                    const owner = j.members[c.member]
                    const other = j.members[c.member === 'a' ? 'b' : 'a']
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
                        <span className="truncate text-xs font-black text-[#1e1b4b]">
                          ➕ {owner.name} nạp +{vnd(c.amount)} ({cBy.length}/2)
                        </span>
                        {iConfirmed ? (
                          <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            Chờ {other.name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConfirmContrib(c)}
                            className="shrink-0 cursor-pointer rounded-lg border-0 bg-emerald-600 px-2.5 py-1 text-[10.5px] font-black text-white shadow-sm active:scale-95"
                          >
                            ✅ Duyệt (2/2)
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Compact extra deposit & slot machine links */}
              <div className="mt-2.5 flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setTopUp(true)}
                  className="flex cursor-pointer items-center gap-1 rounded-full border-0 bg-pink-50 px-3 py-1 text-xs font-black text-pink-600 active:scale-95"
                >
                  <PlusCircle size={14} /> Nạp thêm vào quỹ
                </button>
                <button
                  type="button"
                  onClick={() => nav('/reveal')}
                  className="cursor-pointer border-0 bg-transparent text-xs font-extrabold text-indigo-600 hover:underline"
                >
                  🎰 Xem lồng quay →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
      <GenderSelectDialog open={genderDialogOpen} onClose={() => setGenderDialogOpen(false)} />

      {/* Deposit Alert Popup for 2nd User / Unconfirmed Daily Amount */}
      <Modal
        open={showSecondUserDepositModal}
        onClose={() => setDepositAlertDismissed(true)}
        title="🔔 Thông báo số tiền phải nạp hôm nay"
      >
        {reveal && (
          <div className="mt-2 text-center">
            <p className="text-xs font-bold text-slate-600">
              Hôm nay <b>{j.members[reveal.initiatedBy].name}</b> đã quay random số tiền cho hai bạn!
            </p>
            <div className="mt-3 rounded-2xl border-2 border-indigo-300 bg-indigo-50/90 p-3.5">
              <p className="text-xs font-black text-indigo-950">
                Số tiền BẠN ({myMember?.name}) cần nạp hôm nay:
              </p>
              <p className="mt-1 text-3xl font-black text-indigo-700 tabular-nums">
                +{vnd(reveal.amounts[myMemberId])}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                Phần của {partnerMember?.name}: <b>+{vnd(reveal.amounts[partnerMemberId])}</b>
              </p>
            </div>

            <p className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] font-extrabold text-amber-800">
              🔒 Quy tắc quỹ chung: Khi nạp tiền phải được <b>cả 2 người xác nhận chéo của nhau (2/2)</b> mới được tính là đã duyệt vào heo đất!
            </p>

            <div className="mt-3.5 space-y-2">
              {myDailyC && myDailyC.status !== 'confirmed' && !myDailyBy.includes(myMemberId) && (
                <Button variant="violet" onClick={() => handleConfirmContrib(myDailyC)}>
                  💸 Tôi đã nạp {vnd(reveal.amounts[myMemberId])} (Báo cho {partnerMember?.name} duyệt)
                </Button>
              )}
              {partnerDailyC &&
                partnerDailyC.status !== 'confirmed' &&
                partnerDailyBy.includes(partnerMemberId) &&
                !partnerDailyBy.includes(myMemberId) && (
                  <Button variant="pink" onClick={() => handleConfirmContrib(partnerDailyC)}>
                    ✅ Duyệt xác nhận {partnerMember?.name} đã nạp {vnd(reveal.amounts[partnerMemberId])} (2/2)
                  </Button>
                )}
              <Button variant="ghost" size="sm" onClick={() => setDepositAlertDismissed(true)}>
                Đã hiểu, đóng thông báo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
