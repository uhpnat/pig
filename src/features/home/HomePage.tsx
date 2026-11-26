import { BarChart3, Bell, Calendar, Clock, PlusCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActivityRow } from '@/components/ActivityRow'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { GiftBoxSticker } from '@/components/Stickers'
import { Avatar, Badge, Button, Card, EmptyState } from '@/components/ui'
import { GenderSelectDialog } from '@/components/GenderSelectDialog'
import { monthlyBudget } from '@/domain/engine'
import { diffDays, vnd } from '@/domain/format'
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
const fmtM = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}k`)

export default function HomePage() {
  const j = useJourney()
  const {
    state,
    repo,
    run,
    toast,
    celebrate,
    confirmed,
    pending,
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

  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const anyConfirmed = cs.some((c) => c.status === 'confirmed')
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')

  // Monthly contribution progress (%) to pour dual-color water into the translucent 3D pig on HomePage!
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

  const daysLeft = Math.max(0, diffDays(today, j.endDate))
  const timeRemainingLabel =
    daysLeft >= 330
      ? `${Math.round(daysLeft / 365)} năm`
      : daysLeft >= 45
        ? `${Math.round(daysLeft / 30)} tháng`
        : `${daysLeft} ngày`

  const shareA = actual.a * 100
  const shareB = actual.b * 100

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const tMale = isBMale ? t.b : t.a
  const tFemale = isBMale ? t.a : t.b
  const shareMale = isBMale ? shareB : shareA
  const shareFemale = isBMale ? shareA : shareB

  const stage = pigStage(progress)
  const isMyMale = myMember?.gender === 'male'

  return (
    <div
      className="relative min-h-[100dvh] pb-[calc(98px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        background:
          'linear-gradient(180deg, #b8e1ff 0px, #b8e1ff 76px, #dff2ff 26%, #eef9e3 50%, #fff6f8 75%, #fde8f1 100%)',
      }}
    >
      {/* 1. Sleek Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-4">
        {/* Left: Couple Avatars + Journey Info */}
        <Link
          to="/couple"
          className="flex min-w-0 items-center gap-2 rounded-full border border-white/90 bg-white/80 py-1 pl-1.5 pr-3 shadow-sm backdrop-blur-md no-underline transition-transform active:scale-95"
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

        {/* Right: Active Device Role Switcher + Notification Bell */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setGenderDialogOpen(true)}
            className={`flex items-center gap-1.5 rounded-full border-2 border-white px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-md transition-transform active:scale-95 ${
              isMyMale
                ? 'bg-sky-50/95 text-sky-900'
                : 'bg-pink-50/95 text-pink-900'
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

      {/* 2. HERO CENTERPIECE: 3D Crystal Piggy Bank with Monthly % Translucent Water Fill */}
      <div className="relative mt-1">
        <Interactive3DStage
          spriteSrc={STYLE_SPRITE[j.pig.style] || IMG.spriteHero}
          alt={`${j.pig.name} – Heo đất tháng ${curMonthKey.slice(5)}`}
          theme="meadow"
          spriteHeight={250}
          reducedMotion={motionOff}
          liquidFillPct={monthPct}
          liquidLabel={`💧 Heo tháng ${curMonthKey.slice(5)}: ${monthPct.toFixed(0)}% (${fmtM(monthSaved)}/${fmtM(mBudget)})`}
          membersShare={{
            a: {
              name: j.members.a.name,
              avatar: j.members.a.avatar,
              amount: monthA,
              pct: monthShareA,
              gender: j.members.a.gender,
            },
            b: {
              name: j.members.b.name,
              avatar: j.members.b.avatar,
              amount: monthB,
              pct: monthShareB,
              gender: j.members.b.gender,
            },
          }}
          onPoke={() => {
            beep(state.settings, 'tick')
            haptic(state.settings, 30)
          }}
        />
      </div>

      {/* 3. Main Dashboard Content Stack */}
      <div className="mt-3 space-y-3 px-4">
        {/* 3A. NHIỆM VỤ HÔM NAY (Daily Ritual — personalized for active device user) */}
        {goalReached ? (
          <Card className="!mt-0 text-center">
            <h2 className="h2">🎉 Hoàn thành mục tiêu!</h2>
            <p className="muted mt-1">
              Hai bạn đã chạm đích xuất sắc. Hãy sang tab “Heo đất” để đập heo ăn mừng nhé!
            </p>
          </Card>
        ) : !reveal ? (
          <div
            className="relative overflow-hidden rounded-[26px] border-2 border-white p-4 text-center shadow-[0_12px_28px_rgba(124,58,237,0.14)]"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 55%, #fdf2f8 100%)',
            }}
          >
            <div className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-0.5 text-[11px] font-black text-purple-700">
              <Sparkles size={12} /> Nhiệm vụ nuôi heo hôm nay
            </div>
            <h2 className="mt-1.5 text-[17px] font-black text-[#1e1b4b]">
              Hôm nay hai bạn bỏ heo bao nhiêu nhỉ?
            </h2>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              Đang dùng máy của <b>{myMember?.name}</b> · Kéo cần gạt để mở số tiền may mắn cho cả hai!
            </p>
            <Button
              variant="violet"
              className="mt-3 w-full !py-3.5 !text-[15px] shadow-lg shadow-purple-500/25"
              onClick={() => nav('/reveal')}
            >
              🎰 {myMember?.name} kéo cần gạt mở số ngay
            </Button>
          </div>
        ) : (
          <div className="rounded-[26px] border-2 border-white bg-white/95 p-4 shadow-[0_12px_28px_rgba(124,58,237,0.12)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎲</span>
                <h2 className="text-[15px] font-black text-[#1e1b4b]">Số tiền bỏ heo hôm nay</h2>
              </div>
              <Badge tone={allDone ? 'ok' : 'warn'}>
                {allDone ? 'Đã bỏ đủ 2 người ✅' : 'Chờ bỏ heo ⏳'}
              </Badge>
            </div>

            {/* 2 Member Today Cards: Active User (Left) vs Partner (Right) */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {/* My Card */}
              {(() => {
                const myC = cs.find((x) => x.member === myMemberId)
                const done = myC?.status === 'confirmed'
                return (
                  <div
                    className={`rounded-2xl border-2 p-3 text-center transition-all ${
                      isMyMale
                        ? 'border-sky-300 bg-sky-50/75'
                        : 'border-pink-300 bg-pink-50/75'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 min-w-0">
                      <Avatar value={myMember?.avatar || 'boy'} size={28} />
                      <span className="truncate text-xs font-black text-[#1e1b4b]">
                        {myMember?.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                        Bạn
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 text-[17px] font-black tabular-nums ${
                        isMyMale ? 'text-sky-700' : 'text-pink-700'
                      }`}
                    >
                      +{vnd(reveal.amounts[myMemberId])}
                    </p>
                    {done ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        Đã bỏ heo ✅
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (myC) {
                            await run(repo.confirmContribution(myC.id))
                            celebrate(['🪙', '💧', '✨'])
                            toast(`Đã lưu: ${myMember?.name} bỏ ${vnd(myC.amount)} vào heo! 🎉`)
                          }
                        }}
                        className={`mt-2 w-full cursor-pointer rounded-xl border-0 py-2 text-xs font-black text-white shadow-md transition-transform active:scale-95 ${
                          isMyMale
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600'
                            : 'bg-gradient-to-r from-pink-500 to-rose-600'
                        }`}
                      >
                        Xác nhận phần tôi ✅
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Partner Card */}
              {(() => {
                const partnerC = cs.find((x) => x.member === partnerMemberId)
                const done = partnerC?.status === 'confirmed'
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 min-w-0">
                      <Avatar value={partnerMember?.avatar || 'girl'} size={28} />
                      <span className="truncate text-xs font-black text-slate-700">
                        {partnerMember?.name}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[17px] font-black tabular-nums text-slate-700">
                      +{vnd(reveal.amounts[partnerMemberId])}
                    </p>
                    {done ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        Đã bỏ heo ✅
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (partnerC) {
                            await run(repo.confirmContribution(partnerC.id))
                            toast(`Đã xác nhận giúp ${partnerMember?.name}! 🎉`)
                          }
                        }}
                        className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-extrabold text-slate-600 transition-transform active:scale-95"
                      >
                        ⏳ Chờ · Xác nhận giúp
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="mt-2.5 flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => nav('/reveal')}
                className="cursor-pointer border-0 bg-transparent text-xs font-extrabold text-indigo-600 hover:underline"
              >
                🎰 Xem lồng quay 3D
              </button>
              {!anyConfirmed ? (
                <button
                  type="button"
                  onClick={async () => {
                    await run(repo.resetTodayReveal())
                    toast('Đã đặt lại! Hãy mở lại số tiền mới nhé 🎲')
                    nav('/reveal')
                  }}
                  className="cursor-pointer border-0 bg-transparent text-xs font-extrabold text-rose-500 hover:underline"
                >
                  🎲 Quay lại số khác
                </button>
              ) : (
                !allDone && (
                  <span className="text-[11px] font-bold text-amber-600">
                    🔒 Đã khoá kết quả hôm nay
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* 3B. TIẾN ĐỘ MỤC TIÊU & SO KÈ ĐÓNG GÓP (Sleek Unified Fintech Card) */}
        <div
          className="relative overflow-hidden rounded-[26px] border-2 border-white p-4 shadow-[0_12px_28px_rgba(30,27,75,0.1)]"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Tổng tích luỹ chung
              </p>
              <p className="mt-0.5 text-[24px] font-black leading-tight text-[#1e1b4b] tabular-nums">
                <AnimatedNumber value={confirmed.total} format={(n) => vnd(Math.round(n))} />
              </p>
              <p className="text-xs font-bold text-slate-500">
                Mục tiêu: <b className="text-slate-700">{vnd(j.goal)}</b>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="inline-block rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-500 px-3 py-1 text-base font-black text-white shadow-sm tabular-nums">
                  <AnimatedNumber value={progress} format={(n) => `${n.toFixed(1)}%`} />
                </span>
                <p className="mt-1 text-[10.5px] font-extrabold text-slate-400">
                  ⏳ Còn {timeRemainingLabel}
                </p>
              </div>
              <GiftBoxSticker size={36} className="shrink-0 drop-shadow-sm" />
            </div>
          </div>

          {/* Total Goal Progress Bar */}
          <div
            className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ mục tiêu"
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #8b5cf6 50%, #f43f5e 100%)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>

          {/* 2 Sub-Metrics: Monthly Water Fill vs Couple Contribution */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-2.5">
              <div className="flex items-center justify-between text-[11px] font-black text-sky-900">
                <span>💧 Màu heo tháng {curMonthKey.slice(5)}</span>
                <span className="text-sky-600">{monthPct.toFixed(0)}%</span>
              </div>
              <p className="mt-0.5 truncate text-xs font-black text-sky-700 tabular-nums">
                {fmtM(monthSaved)} / {fmtM(mBudget)}
              </p>
              <p className="text-[10px] font-bold text-slate-400">Đổ đầy heo theo tháng</p>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-2.5">
              <div className="flex items-center justify-between text-[11px] font-black text-pink-900">
                <span>⚖️ So kè đóng góp</span>
                <span className="text-pink-600">
                  {shareMale >= shareFemale ? `👦 ${shareMale.toFixed(0)}%` : `👧 ${shareFemale.toFixed(0)}%`}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-black text-slate-700 tabular-nums">
                👦 {fmtM(tMale)} · 👧 {fmtM(tFemale)}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                {pending.total > 0 ? `Chờ duyệt: ${fmtM(pending.total)}` : 'Đã xác nhận 100%'}
              </p>
            </div>
          </div>

          {/* 3 Quick Action Buttons */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTopUp(true)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-0 bg-gradient-to-r from-pink-500 to-rose-500 py-2.5 text-xs font-black text-white shadow-sm transition-transform active:scale-95"
            >
              <PlusCircle size={15} /> Nạp thêm
            </button>
            <button
              type="button"
              onClick={() => nav('/pig')}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-purple-200 bg-purple-50 py-2.5 text-xs font-black text-purple-800 transition-transform active:scale-95"
            >
              <Clock size={15} /> Đếm ngược
            </button>
            <button
              type="button"
              onClick={() => nav('/stats')}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-black text-indigo-800 transition-transform active:scale-95"
            >
              <BarChart3 size={15} /> Biểu đồ
            </button>
          </div>
        </div>

        {/* 3C. Recent Activity (Hoạt động gần đây) */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} className="text-indigo-500" />
              <h2 className="h3 text-[#1e1b4b]">Nhật ký vừa lưu</h2>
            </div>
            <Link to="/journal" className="muted !text-xs font-bold">
              Xem tất cả →
            </Link>
          </div>
          <div className="mt-2">
            {state.activity.length ? (
              state.activity.slice(0, 3).map((a) => <ActivityRow key={a.id} a={a} journey={j} />)
            ) : (
              <EmptyState title="Chưa có hoạt động" hint="Mở số tiền hôm nay để bắt đầu nhé!" />
            )}
          </div>
        </Card>
      </div>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
      <GenderSelectDialog open={genderDialogOpen} onClose={() => setGenderDialogOpen(false)} />
    </div>
  )
}
