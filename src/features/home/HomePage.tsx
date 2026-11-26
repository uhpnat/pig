import { BarChart3, Bell, PlusCircle, Sparkles } from 'lucide-react'
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
const fmtM = (n: number) => `${(n / 1e6).toFixed(1)}M`

export default function HomePage() {
  const j = useJourney()
  const { state, repo, run, toast, confirmed, pending, progress, today, unread, goalReached, motionOff, myMemberId, myMember, partnerMemberId, partnerMember } = useStore()
  const nav = useNavigate()
  const [topUp, setTopUp] = useState(false)
  const [genderDialogOpen, setGenderDialogOpen] = useState(false)

  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const anyConfirmed = cs.some((c) => c.status === 'confirmed')
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')

  // Monthly contribution progress (%) to pour dual-color water into the translucent 3D pig!
  const curMonthKey = today.slice(0, 7)
  const monthSaved = state.contributions
    .filter((c) => c.status === 'confirmed' && c.date.startsWith(curMonthKey))
    .reduce((sum, c) => sum + c.amount, 0)
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
  const memberMale = isBMale ? j.members.b : j.members.a
  const memberFemale = isBMale ? j.members.a : j.members.b
  const tMale = isBMale ? t.b : t.a
  const tFemale = isBMale ? t.a : t.b
  const shareMale = isBMale ? shareB : shareA
  const shareFemale = isBMale ? shareA : shareB

  return (
    <div
      className="relative min-h-[100dvh] pb-[calc(96px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #86c5ff 0%, #b8deff 26%, #e6f5d0 52%, #fdf2e9 72%, #fce8ef 100%)',
      }}
    >
      {/* 1. Top Bar: Avatars on left, Device Member on center, Notification Bell on right */}
      <header className="relative z-10 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Avatar value={j.members.a.avatar} size={40} className="z-10 shadow-md ring-2 ring-white" />
          <span className="relative z-20 -mx-1.5 grid h-5 w-5 place-items-center rounded-full bg-pink-500 text-[10px] text-white shadow-sm">
            💖
          </span>
          <Avatar value={j.members.b.avatar} size={40} className="z-10 shadow-md ring-2 ring-white" />
        </div>

        {/* Device Member Switcher Pill */}
        <button
          type="button"
          onClick={() => setGenderDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 shadow-sm backdrop-blur-md transition-transform active:scale-95"
        >
          <span className="text-xs font-black text-[#1e1b4b]">
            Máy của {myMember?.name} {myMember?.gender === 'male' ? '👦' : '👧'}
          </span>
          <span className="text-[10px] font-bold text-indigo-600 underline">Đổi</span>
        </button>

        <Link
          to="/notifications"
          aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
          className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-white/80 bg-white/85 text-[#1e1b4b] shadow-md backdrop-blur-md no-underline transition-transform active:scale-95"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#ff3b6b] px-1 text-[9px] font-black text-white">
              {unread}
            </span>
          )}
        </Link>
      </header>

      {/* 2. Journey Title */}
      <div className="mt-1 px-4 text-center">
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-[#172554]">
          {j.name} <Sparkles size={16} className="inline text-[#ff4d8d]" />
        </h1>
        <p className="mt-0.5 text-xs font-extrabold text-[#1e3a8a]/80">
          Chạm vào heo để tương tác & bỏ xu nha!
        </p>
      </div>

      {/* 3. HERO: CHỦ ĐẠO LÀ CON HEO ĐẤT 3D MỚI TO LỚN & NỔI BẬT NHẤT MÀN HÌNH */}
      <div className="relative mt-0.5">
        <Interactive3DStage
          spriteSrc={STYLE_SPRITE[j.pig.style] || IMG.spriteHero}
          alt={`${j.pig.name} – ${pigStage(progress).label}`}
          theme="meadow"
          spriteHeight={375}
          reducedMotion={motionOff}
          liquidFillPct={monthPct}
          membersShare={{
            a: { name: j.members.a.name, avatar: j.members.a.avatar, amount: t.a, pct: shareA, gender: j.members.a.gender },
            b: { name: j.members.b.name, avatar: j.members.b.avatar, amount: t.b, pct: shareB, gender: j.members.b.gender },
          }}
          onPoke={() => {
            beep(state.settings, 'tick')
            haptic(state.settings, 30)
          }}
        />

        {/* 4. Glossy Green-Gold Progress & Duel Card */}
        <div className="relative mt-2.5 px-4">
          <div
            className="relative overflow-hidden rounded-[30px] border-[2.5px] border-white/90 px-5 pb-4 pt-3.5 text-center text-white shadow-[0_16px_32px_rgba(90,150,60,.32),inset_0_2px_6px_rgba(255,255,255,.75)] backdrop-blur-md"
            style={{
              background:
                'linear-gradient(180deg, rgba(143,204,88,0.95) 0%, rgba(164,214,104,0.92) 45%, rgba(210,192,126,0.95) 100%)',
            }}
          >
            {/* Top-left yellow glossy arc decoration */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-2.5 h-10 w-16 rounded-tl-[24px] border-l-[6px] border-t-[6px] border-[#ffd43b] opacity-95 drop-shadow"
            />

            <p className="text-[44px] font-black leading-none tracking-tight drop-shadow-[0_3px_4px_rgba(40,90,30,.3)]">
              <AnimatedNumber value={progress} format={(n) => `${n.toFixed(1)} %`} />
            </p>
            <p className="mt-1 text-[14px] font-black tracking-wide text-white/95 drop-shadow-sm">
              <AnimatedNumber value={confirmed.total} format={(n) => Math.round(n).toLocaleString('vi-VN')} /> /{' '}
              {j.goal.toLocaleString('vi-VN')}đ
            </p>

            {/* Total Savings Progress Bar with Gift Box Icon */}
            <div className="mt-2.5 flex items-center gap-2.5">
              <div
                className="h-4 flex-1 overflow-hidden rounded-full bg-black/20 p-0.5 shadow-inner"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ tiết kiệm"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, #ff85a8 0%, #ff3d77 100%)',
                    boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.6)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
              <GiftBoxSticker size={32} className="-mr-1 shrink-0 drop-shadow" />
            </div>

            {/* In-Card Duel Ratio Bar showing who contributed more/less */}
            <div className="mt-3 rounded-2xl bg-black/20 p-2 text-white">
              <div className="flex items-center justify-between text-[11px] font-black">
                <span className="flex items-center gap-1 text-sky-200">
                  {shareMale > shareFemale && '👑'} 👦 {memberMale.name}: {fmtM(tMale)} ({shareMale.toFixed(0)}%)
                </span>
                <span className="text-white/60">·</span>
                <span className="flex items-center gap-1 text-pink-200">
                  {shareFemale > shareMale && '👑'} 👧 {memberFemale.name}: {fmtM(tFemale)} ({shareFemale.toFixed(0)}%)
                </span>
              </div>
              <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-white/20 p-0.5">
                <div
                  className="h-full rounded-l-full bg-sky-400 transition-all duration-700"
                  style={{ width: `${Math.max(8, Math.min(92, shareMale))}%` }}
                />
                <div
                  className="h-full rounded-r-full bg-pink-400 transition-all duration-700"
                  style={{ width: `${Math.max(8, Math.min(92, shareFemale))}%` }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-3 text-[11px] font-extrabold text-white/95">
              <span>⏳ Còn lại: {timeRemainingLabel}</span>
              {pending.total > 0 && <span>· Chờ duyệt: {vnd(pending.total)}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3.5 space-y-3.5 px-4">
        {/* 5. PRIMARY ACTION: HÔM NAY CÙNG TIẾT KIỆM (Daily Ritual) */}
        <div>
          {goalReached ? (
            <Card className="!mt-0 text-center">
              <h2 className="h2">🎉 Hoàn thành mục tiêu!</h2>
              <p className="muted mt-1">Hai bạn đã chạm đích. Tạo hành trình mới ở tab “Của chúng mình”.</p>
            </Card>
          ) : !reveal ? (
            <div className="relative overflow-hidden rounded-[26px] border-2 border-white bg-white/95 p-4 shadow-[0_12px_28px_rgba(90,40,160,.16)] text-center">
              <p className="text-xs font-black uppercase tracking-wider text-[#7c3aed]">
                Nhiệm vụ hôm nay 🎰
              </p>
              <h2 className="mt-0.5 text-[17px] font-black text-[#1e1b4b]">
                Hôm nay tụi mình góp bao nhiêu nhỉ?
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#64748b]">
                Kéo cần gạt may mắn để mở số tiền cho cả 2 người!
              </p>
              <Button
                variant="violet"
                className="mt-3 w-full !py-3.5 !text-[16px] shadow-lg shadow-purple-500/25"
                onClick={() => nav('/reveal')}
              >
                🎰 KÉO CẦN GẠT MỞ SỐ HÔM NAY
              </Button>
            </div>
          ) : (
            <Card className="!mt-0">
              <div className="flex items-center justify-between">
                <h2 className="h3 text-[#1e1b4b]">🎲 Số tiền hôm nay</h2>
                <Badge tone={allDone ? 'ok' : 'warn'}>
                  {allDone ? 'Đã bỏ đủ ✅' : 'Chờ bỏ heo ⏳'}
                </Badge>
              </div>

              {/* 2 Member Today Cards: Distinct for You vs Partner */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {/* My Card (Active Device Member) */}
                {(() => {
                  const myC = cs.find((x) => x.member === myMemberId)
                  return (
                    <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/80 p-3 text-center shadow-sm">
                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        <Avatar value={myMember?.avatar || 'boy'} size={30} />
                        <span className="text-xs font-black text-indigo-950 truncate">{myMember?.name} (Bạn)</span>
                      </div>
                      <p className="mt-1 text-[17px] font-black text-indigo-700">+{vnd(reveal.amounts[myMemberId])}</p>
                      {myC?.status === 'confirmed' ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          Đã bỏ heo ✅
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (myC) {
                              await run(repo.confirmContribution(myC.id))
                              toast(`Đã xác nhận ${myMember?.name} bỏ ${vnd(myC.amount)} vào heo! 🎉`)
                            }
                          }}
                          className="mt-2 w-full rounded-xl bg-indigo-600 py-1.5 text-xs font-black text-white shadow-md transition-transform active:scale-95"
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
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        <Avatar value={partnerMember?.avatar || 'girl'} size={30} />
                        <span className="text-xs font-black text-slate-800 truncate">{partnerMember?.name}</span>
                      </div>
                      <p className="mt-1 text-[17px] font-black text-slate-700">+{vnd(reveal.amounts[partnerMemberId])}</p>
                      {partnerC?.status === 'confirmed' ? (
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
                          className="mt-2 w-full rounded-xl bg-slate-200 py-1.5 text-[11px] font-bold text-slate-600 transition-transform active:scale-95"
                        >
                          Xác nhận giúp
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="mt-3 flex items-center justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={() => nav('/reveal')}>
                  🎰 Lồng quay số
                </Button>
                {!anyConfirmed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await run(repo.resetTodayReveal())
                      toast('Đã đặt lại! Hãy mở lại số tiền nhé 🎲')
                      nav('/reveal')
                    }}
                  >
                    🎲 Quay lại
                  </Button>
                )}
              </div>

              {anyConfirmed && !allDone && (
                <p className="mt-2 text-center text-[11px] font-extrabold text-amber-700">
                  🔒 Đã có người xác nhận – số tiền hôm nay đã được khoá
                </p>
              )}
            </Card>
          )}
        </div>

        {/* 6. Quick Action Buttons: Nạp tiền (Pink) & Xem biểu đồ (Purple) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTopUp(true)}
            className="btn flex items-center justify-center gap-2 !py-3.5 !text-[15px]"
          >
            <PlusCircle size={19} strokeWidth={2.5} /> + Nạp thêm
          </button>
          <button
            type="button"
            onClick={() => nav('/stats')}
            className="btn btn-violet flex items-center justify-center gap-2 !py-3.5 !text-[15px]"
          >
            <BarChart3 size={19} strokeWidth={2.5} /> Xem biểu đồ
          </button>
        </div>

        {/* 7. Recent Activity (Hoạt động gần đây) */}
        <Card className="!mt-0">
          <div className="flex items-center justify-between">
            <h2 className="h3 text-[#1e1b4b]">Hoạt động gần đây</h2>
            <Link to="/journal" className="muted !text-xs font-bold">
              Xem tất cả
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
