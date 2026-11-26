import { BarChart3, Bell, Plus, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActivityRow } from '@/components/ActivityRow'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { GiftBoxSticker, TrophySticker } from '@/components/Stickers'
import { Avatar, Badge, Button, Card, EmptyState } from '@/components/ui'
import { monthlyBudget } from '@/domain/engine'
import { diffDays, vnd } from '@/domain/format'
import { actualShares, confirmedTotals, pigStage } from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'
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
  const { state, confirmed, pending, progress, today, unread, goalReached, motionOff } = useStore()
  const nav = useNavigate()
  const [topUp, setTopUp] = useState(false)

  const t = confirmedTotals(state.contributions)
  const actual = actualShares(state.contributions)
  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const allDone = cs.length > 0 && cs.every((c) => c.status === 'confirmed')

  const daysLeft = Math.max(0, diffDays(today, j.endDate))
  const timeRemainingLabel =
    daysLeft >= 330
      ? `${Math.round(daysLeft / 365)} năm`
      : daysLeft >= 45
        ? `${Math.round(daysLeft / 30)} tháng`
        : `${daysLeft} ngày`

  return (
    <div
      className="min-h-screen pb-8"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #86c5ff 0%, #b8deff 26%, #e6f5d0 52%, #fdf2e9 72%, #fce8ef 100%)',
      }}
    >
      {/* 1. Top Row: Avatars + Plus button on left, Bell on right */}
      <header className="flex items-center justify-between px-4">
        <div className="flex items-center">
          <Avatar value={j.members.a.avatar} size={46} className="z-10 shadow-md" />
          <Avatar value={j.members.b.avatar} size={46} className="-ml-2.5 z-20 shadow-md" />
          <Link
            to="/couple"
            aria-label="Của chúng mình"
            className="ml-1.5 grid h-10 w-10 place-items-center rounded-full border-2 border-white/80 bg-white/30 text-white shadow-sm backdrop-blur-sm no-underline transition-transform active:scale-95"
          >
            <Plus size={20} strokeWidth={2.75} />
          </Link>
        </div>

        <Link
          to="/notifications"
          aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
          className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-white/80 bg-white/75 text-[#1e1b4b] shadow-md backdrop-blur-md no-underline"
        >
          <Bell size={20} />
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#ff3b6b] px-1 text-[10px] font-black text-white">
            {unread > 0 ? unread : 1}
          </span>
        </Link>
      </header>

      {/* 2. Centered Journey Name & Subtitle on the sky */}
      <div className="mt-1.5 px-4 text-center">
        <h1 className="text-[24px] font-black leading-tight tracking-tight text-[#172554]">
          {j.name} <span className="text-[#ff4d8d]">♡</span>
        </h1>
        <p className="mt-0.5 text-[13px] font-extrabold text-[#1e3a8a]/85">
          Cùng nhau tiết kiệm, cùng nhau hạnh phúc!
        </p>
      </div>

      {/* 3. Separated 3D Cutout Pig Mascot on Interactive Multi-Layer 3D Cloud & Grassy Hill Stage + Overlapping Progress Card */}
      <div className="relative mt-0.5">
        <Interactive3DStage
          spriteSrc={STYLE_SPRITE[j.pig.style] || IMG.spriteHero}
          alt={`${j.pig.name} – ${pigStage(progress).label}`}
          theme="meadow"
          spriteHeight={195}
          reducedMotion={motionOff}
          liquidFillPct={monthPct}
          liquidLabel={`Tháng ${today.slice(5, 7)}: ${monthPct.toFixed(1)}%`}
        />

        {/* Overlapping Glossy Green Progress Card */}
        <div className="relative -mt-6 px-4">
          <div
            className="relative overflow-hidden rounded-[32px] border-[2.5px] border-white/85 px-5 pb-4 pt-3 text-center text-white shadow-[0_16px_32px_rgba(90,150,60,.32),inset_0_2px_6px_rgba(255,255,255,.75)] backdrop-blur-md"
            style={{
              background:
                'linear-gradient(180deg, rgba(143,204,88,0.92) 0%, rgba(164,214,104,0.9) 45%, rgba(210,192,126,0.92) 100%)',
            }}
          >
            {/* Top-left yellow glossy arc decoration matching the mockup */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-2.5 h-10 w-16 rounded-tl-[24px] border-l-[6px] border-t-[6px] border-[#ffd43b] opacity-95 drop-shadow"
            />

            <p className="text-[48px] font-black leading-none tracking-tight drop-shadow-[0_3px_4px_rgba(40,90,30,.3)]">
              <AnimatedNumber value={progress} format={(n) => `${n.toFixed(1)} %`} />
            </p>
            <p className="mt-1 text-[15px] font-black tracking-wide text-white/95 drop-shadow-sm">
              <AnimatedNumber value={confirmed.total} format={(n) => Math.round(n).toLocaleString('vi-VN')} /> /{' '}
              {j.goal.toLocaleString('vi-VN')}đ
            </p>

            {/* Pink Progress Bar with Gift Box Icon on the right */}
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
              <GiftBoxSticker size={34} className="-mr-1 shrink-0 drop-shadow" />
            </div>

            {pending.total > 0 && (
              <p className="mt-2 rounded-full bg-black/20 px-3 py-0.5 text-[11px] font-extrabold text-white">
                ⏳ Đang chờ xác nhận: {vnd(pending.total)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* 4. Side-by-Side Member Contribution Card matching the mockup */}
        <div className="mt-3.5 grid grid-cols-2 divide-x divide-[#f1e4e8] rounded-[26px] border-2 border-white bg-white/95 px-3 py-3 shadow-[0_10px_24px_rgba(180,140,160,.16)]">
          {(['a', 'b'] as const).map((k, idx) => {
            const m = j.members[k]
            const sharePct = actual[k] * 100
            const barColor = idx === 0 ? 'linear-gradient(90deg,#38bdf8,#2563eb)' : 'linear-gradient(90deg,#ff7aa2,#ec4899)'
            return (
              <div key={k} className={`flex items-center gap-2.5 ${idx === 1 ? 'pl-3' : 'pr-2'}`}>
                <Avatar value={m.avatar} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-black leading-tight text-[#1e1b4b]">
                    {fmtM(t[k])}
                  </p>
                  <div className="my-1 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(8, Math.min(100, sharePct))}%`, background: barColor }}
                    />
                  </div>
                  <p className="text-[13px] font-black text-[#1e1b4b]">
                    {sharePct.toFixed(1)}% <span className="text-[11px] font-bold text-[#6b7280]">({m.name})</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 5. Two Prominent Pill Buttons: + Nạp tiền (Pink) & Xem chi tiết (Purple) */}
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTopUp(true)}
            className="btn flex items-center justify-center gap-2 !py-3.5 !text-[16px]"
          >
            <PlusCircle size={20} strokeWidth={2.5} /> Nạp tiền
          </button>
          <button
            type="button"
            onClick={() => nav('/stats')}
            className="btn btn-violet flex items-center justify-center gap-2 !py-3.5 !text-[16px]"
          >
            <BarChart3 size={20} strokeWidth={2.5} /> Xem chi tiết
          </button>
        </div>

        {/* 6. Trophy Goal Card matching the mockup */}
        <div className="mt-3.5 flex items-center justify-between rounded-[26px] border-2 border-white bg-white/95 px-4 py-3.5 shadow-[0_10px_24px_rgba(180,140,160,.15)]">
          <div className="flex items-center gap-3">
            <TrophySticker size={44} className="shrink-0 drop-shadow-sm" />
            <div>
              <p className="text-xs font-extrabold text-[#6b7280]">Mục tiêu của chúng ta</p>
              <p className="text-[19px] font-black leading-tight text-[#1e1b4b]">{vnd(j.goal)}</p>
            </div>
          </div>
          <div className="border-l border-[#f1e4e8] pl-4 text-right">
            <p className="text-xs font-extrabold text-[#6b7280]">Còn lại</p>
            <p className="text-[18px] font-black leading-tight text-[#1e1b4b]">{timeRemainingLabel}</p>
          </div>
        </div>

        {/* 7. Daily Random Savings Ritual Card */}
        <div className="mt-3.5">
          {goalReached ? (
            <Card className="!mt-0 text-center">
              <h2 className="h2">🎉 Hoàn thành mục tiêu!</h2>
              <p className="muted mt-1">Hai bạn đã chạm đích. Tạo hành trình mới ở tab “Của chúng mình”.</p>
            </Card>
          ) : !reveal ? (
            <Card className="!mt-0 text-center">
              <h2 className="text-[16px] font-black text-[#1e1b4b]">🐷 Hôm nay tụi mình góp bao nhiêu nhỉ?</h2>
              <p className="muted mb-3 mt-1">Một lần mỗi ngày, cả hai cùng mở kết quả may mắn.</p>
              <Button onClick={() => nav('/reveal')}>MỞ SỐ TIỀN HÔM NAY</Button>
            </Card>
          ) : (
            <Card className="!mt-0">
              <div className="flex items-center justify-between">
                <h2 className="h3 text-[#1e1b4b]">🎲 Kết quả mở số hôm nay</h2>
                <Badge tone={allDone ? 'ok' : 'warn'}>{allDone ? 'Đã xác nhận đủ' : 'Chờ xác nhận'}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                {(['a', 'b'] as const).map((k) => {
                  const c = cs.find((x) => x.member === k)
                  return (
                    <div key={k} className="rounded-2xl bg-white/70 p-2.5 shadow-sm">
                      <Avatar value={j.members[k].avatar} size={42} className="mx-auto" />
                      <p className="mt-1 text-base font-black text-pink">+{vnd(reveal.amounts[k])}</p>
                      <p className="muted !text-xs">
                        {j.members[k].name} {c?.status === 'confirmed' ? '✅' : '⏳'}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3">
                <Button variant="violet" size="sm" onClick={() => nav('/reveal')}>
                  {allDone ? 'Xem chi tiết hôm nay' : 'Vào xác nhận đã góp'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* 8. Compact Recent Activity */}
        <Card className="!mt-3.5">
          <div className="flex items-center justify-between">
            <h2 className="h3 text-[#1e1b4b]">Hoạt động gần đây</h2>
            <Link to="/journal" className="muted !text-xs">
              Xem tất cả
            </Link>
          </div>
          {state.activity.length ? (
            state.activity.slice(0, 3).map((a) => <ActivityRow key={a.id} a={a} journey={j} />)
          ) : (
            <EmptyState title="Chưa có hoạt động" hint="Mở số tiền hôm nay để bắt đầu nhé!" />
          )}
        </Card>
      </div>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
    </div>
  )
}
