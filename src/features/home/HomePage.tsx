import { AnimatePresence, motion } from 'framer-motion'
import { Bell, MessageCircleHeart } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GenderSelectDialog } from '@/components/GenderSelectDialog'
import { FinalGoalStage } from '@/components/pig/FinalGoalStage'
import { MonthlyJarStage } from '@/components/pig/MonthlyJarStage'
import { Avatar, FadeInItem } from '@/components/ui'
import { daysInMonth, diffDays, pct } from '@/domain/format'
import { actualShares, confirmedTotals } from '@/domain/stats'
import type { Contribution } from '@/domain/types'
import { useConfirmContribution } from '@/hooks/useConfirmContribution'
import { useCountdown } from '@/hooks/useCountdown'
import { useJourney, useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'
import { DailyConfirmationCard } from './DailyConfirmationCard'
import { FinalSummaryCard } from './FinalSummaryCard'
import { MonthHistoryModal } from './MonthHistoryModal'
import { MonthSummaryCard } from './MonthSummaryCard'
import { SecondUserDepositModal } from './SecondUserDepositModal'
import { TopUpDialog } from './TopUpDialog'

function buildMonthList(startDate: string, today: string, contribs: Contribution[]): string[] {
  const set = new Set<string>()
  const startYm = startDate.slice(0, 7)
  const endYm = today.slice(0, 7)
  set.add(startYm)
  set.add(endYm)
  for (const c of contribs) {
    if (c.date && c.date.length >= 7) set.add(c.date.slice(0, 7))
  }
  const [sy, sm] = startYm.split('-').map(Number)
  const [ey, em] = endYm.split('-').map(Number)
  if (Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(ey) && Number.isFinite(em)) {
    let y = sy
    let m = sm
    let guard = 0
    while ((y < ey || (y === ey && m <= em)) && guard < 120) {
      set.add(`${y}-${String(m).padStart(2, '0')}`)
      m++
      if (m > 12) {
        m = 1
        y++
      }
      guard++
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

export default function HomePage() {
  const j = useJourney()
  const {
    state,
    confirmed,
    progress,
    today,
    unread,
    unreadChat,
    setChatOpen,
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
  const [monthListModalOpen, setMonthListModalOpen] = useState(false)
  const [coinBurstKey, setCoinBurstKey] = useState(0)
  const [pigMode, setPigMode] = useState<'month' | 'final'>('month')

  const curMonthKey = today.slice(0, 7)
  const [selectedMonthKey, setSelectedMonthKey] = useState(curMonthKey)
  useEffect(() => {
    setSelectedMonthKey(curMonthKey)
  }, [curMonthKey])

  const confirmedCount = useMemo(
    () => state.contributions.filter((c) => c.status === 'confirmed').length,
    [state.contributions],
  )
  const prevConfirmedCountRef = useRef<number>(confirmedCount)

  useEffect(() => {
    if (confirmedCount > prevConfirmedCountRef.current) {
      setCoinBurstKey((k) => k + 1)
      beep(state.settings, 'win')
    }
    prevConfirmedCountRef.current = confirmedCount
  }, [confirmedCount, state.settings])

  const handleConfirmContrib = useConfirmContribution({
    onFullyConfirmed: () => setCoinBurstKey((k) => k + 1),
  })

  const allMonths = useMemo(
    () => buildMonthList(j.startDate, today, state.contributions),
    [j.startDate, today, state.contributions],
  )

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

  const showSecondUserDepositModal =
    !!reveal &&
    !depositAlertDismissed &&
    (!myDailyBy.includes(myMemberId) ||
      (partnerDailyBy.includes(partnerMemberId) && !partnerDailyBy.includes(myMemberId)))

  // Monthly metrics
  const monthContribs = state.contributions.filter(
    (c) => c.status === 'confirmed' && c.date.startsWith(selectedMonthKey),
  )
  const monthSaved = monthContribs.reduce((sum, c) => sum + c.amount, 0)
  const monthA = monthContribs.filter((c) => c.member === 'a').reduce((sum, c) => sum + c.amount, 0)
  const monthB = monthContribs.filter((c) => c.member === 'b').reduce((sum, c) => sum + c.amount, 0)
  const monthShareA = monthSaved > 0 ? (monthA / monthSaved) * 100 : 0
  const monthShareB = monthSaved > 0 ? (monthB / monthSaved) * 100 : 0

  const totalDaysInSelectedMonth = daysInMonth(selectedMonthKey)
  const monthStartStr = `${selectedMonthKey}-01`
  const monthEndStr = `${selectedMonthKey}-${String(totalDaysInSelectedMonth).padStart(2, '0')}`
  const effStart = j.startDate > monthStartStr ? j.startDate : monthStartStr
  const effEnd = j.endDate < monthEndStr ? j.endDate : monthEndStr
  const activeDaysInMonth = Math.max(1, diffDays(effStart, effEnd) + 1)
  const monthMonthlyRef = Math.max(1, j.goal / Math.max(1, j.months))
  const monthFillPct =
    monthSaved <= 0
      ? 0
      : Math.min(
          100,
          Math.max(
            (monthContribs.length / Math.max(2, activeDaysInMonth * 2)) * 100,
            (monthSaved / monthMonthlyRef) * 100,
          ),
        )

  // Final-term metrics & live countdown
  const totalShareA = confirmed.total > 0 ? actual.a * 100 : 0
  const totalShareB = confirmed.total > 0 ? actual.b * 100 : 0
  const timeLeft = useCountdown(j.endDate)

  const activeShareA = pigMode === 'month' ? monthShareA : totalShareA
  const activeShareB = pigMode === 'month' ? monthShareB : totalShareB
  const activeAmountA = pigMode === 'month' ? monthA : t.a
  const activeAmountB = pigMode === 'month' ? monthB : t.b

  const isBMale = j.members.b.gender === 'male' || j.members.a.gender === 'female'
  const memberMale = isBMale ? j.members.b : j.members.a
  const memberFemale = isBMale ? j.members.a : j.members.b
  const activePctMale = isBMale ? activeShareB : activeShareA
  const activePctFemale = isBMale ? activeShareA : activeShareB
  const activeMoneyMale = isBMale ? activeAmountB : activeAmountA
  const activeMoneyFemale = isBMale ? activeAmountA : activeAmountB

  const isMyMale = myMember?.gender === 'male'

  const triggerPokeFeedback = () => {
    beep(state.settings, 'tick')
    haptic(state.settings, 30)
  }

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col justify-between pb-[calc(88px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        background:
          pigMode === 'month'
            ? 'linear-gradient(180deg, #b8e1ff 0%, #d8f0ff 30%, #e8f8dc 54%, #fdf2f7 78%, #fde8f1 100%)'
            : 'linear-gradient(180deg, #b8e1ff 0%, #e0e7ff 28%, #f3e8ff 54%, #fce7f3 78%, #fde8f1 100%)',
      }}
    >
      {/* TOP HERO ZONE */}
      <div className="relative">
        <FadeInItem delay={0} y={-10}>
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
                <p className="truncate text-[10px] font-extrabold text-pink-600">Đạt {pct(progress)} mục tiêu</p>
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

              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label={`Nhắn tin đôi mình${unreadChat ? `, ${unreadChat} tin nhắn mới` : ''}`}
                className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/90 bg-white/85 text-pink-600 shadow-sm backdrop-blur-md transition-transform active:scale-95"
              >
                <MessageCircleHeart size={18} />
                {unreadChat > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#ff3b6b] px-1 text-[9px] font-black text-white">
                    {unreadChat}
                  </span>
                )}
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
        </FadeInItem>

        {/* Mode Switcher */}
        <FadeInItem delay={0.05} y={10} className="relative z-20 mt-2.5 px-4">
          <div className="mx-auto grid max-w-[330px] grid-cols-2 gap-1 rounded-full border-2 border-white bg-white/85 p-1 shadow-[0_6px_18px_rgba(30,27,75,0.08)] backdrop-blur-md">
            {(
              [
                { id: 'month', label: '📅 Heo theo tháng', activeClass: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm' },
                { id: 'final', label: '🎯 Heo cuối kỳ', activeClass: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPigMode(tab.id)}
                className={`cursor-pointer rounded-full border-0 py-1.5 text-xs font-black transition-all ${
                  pigMode === tab.id ? tab.activeClass : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FadeInItem>

        {/* Hero Stage: 3D Crystal Savings Jar (Month) OR 3D Dream Goal Globe (Final/Year) */}
        <FadeInItem delay={0.1} y={14} scale={0.96} className="relative mt-0.5">
          <AnimatePresence mode="wait">
            {pigMode === 'month' ? (
              <motion.div
                key="stage-month"
                initial={motionOff ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={motionOff ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22 }}
              >
                <MonthlyJarStage
                  monthLabel={`Tháng ${selectedMonthKey.slice(5)}/${selectedMonthKey.slice(0, 4)}`}
                  fillPct={monthFillPct}
                  savedAmount={monthSaved}
                  coinBurstKey={coinBurstKey}
                  memberMale={{
                    name: memberMale.name,
                    avatar: memberMale.avatar,
                    amount: activeMoneyMale,
                    pct: activePctMale,
                    gender: memberMale.gender,
                  }}
                  memberFemale={{
                    name: memberFemale.name,
                    avatar: memberFemale.avatar,
                    amount: activeMoneyFemale,
                    pct: activePctFemale,
                    gender: memberFemale.gender,
                  }}
                  reducedMotion={motionOff}
                  onPoke={triggerPokeFeedback}
                />
              </motion.div>
            ) : (
              <motion.div
                key="stage-final"
                initial={motionOff ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={motionOff ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22 }}
              >
                <FinalGoalStage
                  journeyName={j.name}
                  goalAmount={j.goal}
                  savedAmount={confirmed.total}
                  progressPct={progress}
                  memberMale={{
                    name: memberMale.name,
                    avatar: memberMale.avatar,
                    amount: activeMoneyMale,
                    pct: activePctMale,
                    gender: memberMale.gender,
                  }}
                  memberFemale={{
                    name: memberFemale.name,
                    avatar: memberFemale.avatar,
                    amount: activeMoneyFemale,
                    pct: activePctFemale,
                    gender: memberFemale.gender,
                  }}
                  reducedMotion={motionOff}
                  onPoke={triggerPokeFeedback}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </FadeInItem>
      </div>

      {/* CURVED GLASSMORPHIC BOTTOM SHEET */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 -mt-5 flex-1 rounded-t-[36px] border-t-2 border-white px-4 pb-5 pt-3.5 shadow-[0_-12px_32px_rgba(80,140,90,0.12)] backdrop-blur-xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,248,252,0.96) 55%, rgba(253,232,241,0.98) 100%)',
        }}
      >
        <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-slate-200/90" />

        <div className="space-y-3">
          <FadeInItem delay={0.18} y={12}>
            {pigMode === 'month' ? (
              <MonthSummaryCard
                selectedMonthKey={selectedMonthKey}
                curMonthKey={curMonthKey}
                allMonths={allMonths}
                monthSaved={monthSaved}
                memberMale={memberMale}
                memberFemale={memberFemale}
                pctMale={activePctMale}
                pctFemale={activePctFemale}
                moneyMale={activeMoneyMale}
                moneyFemale={activeMoneyFemale}
                onSelectMonth={setSelectedMonthKey}
                onOpenHistory={() => setMonthListModalOpen(true)}
              />
            ) : (
              <FinalSummaryCard
                targetDateStr={j.endDate}
                confirmedTotal={confirmed.total}
                goal={j.goal}
                progress={progress}
                memberMale={memberMale}
                memberFemale={memberFemale}
                pctMale={activePctMale}
                pctFemale={activePctFemale}
                timeLeft={timeLeft}
              />
            )}
          </FadeInItem>

          <FadeInItem delay={0.24} y={14}>
            <DailyConfirmationCard
              goalReached={goalReached}
              reveal={reveal}
              allDone={allDone}
              myMemberId={myMemberId}
              partnerMemberId={partnerMemberId}
              myMember={myMember}
              partnerMember={partnerMember}
              members={j.members}
              myDailyC={myDailyC}
              partnerDailyC={partnerDailyC}
              myDailyBy={myDailyBy}
              partnerDailyBy={partnerDailyBy}
              extraPending={extraPending}
              onConfirm={handleConfirmContrib}
              onOpenReveal={() => nav('/reveal')}
              onOpenTopUp={() => setTopUp(true)}
            />
          </FadeInItem>
        </div>
      </motion.div>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
      <GenderSelectDialog open={genderDialogOpen} onClose={() => setGenderDialogOpen(false)} />

      <MonthHistoryModal
        open={monthListModalOpen}
        onClose={() => setMonthListModalOpen(false)}
        allMonths={allMonths}
        selectedMonthKey={selectedMonthKey}
        curMonthKey={curMonthKey}
        contributions={state.contributions}
        isBMale={isBMale}
        memberMale={memberMale}
        memberFemale={memberFemale}
        onSelectMonth={(ym) => {
          setSelectedMonthKey(ym)
          setPigMode('month')
        }}
      />

      <SecondUserDepositModal
        open={showSecondUserDepositModal}
        onClose={() => setDepositAlertDismissed(true)}
        reveal={reveal}
        members={j.members}
        myMemberId={myMemberId}
        partnerMemberId={partnerMemberId}
        myMember={myMember}
        partnerMember={partnerMember}
        myDailyC={myDailyC}
        partnerDailyC={partnerDailyC}
        myDailyBy={myDailyBy}
        partnerDailyBy={partnerDailyBy}
        onConfirm={handleConfirmContrib}
      />
    </div>
  )
}
