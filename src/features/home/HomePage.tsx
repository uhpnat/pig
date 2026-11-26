import { BarChart3, BookOpen, Coins, Medal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityRow } from '@/components/ActivityRow'
import { PigScene } from '@/components/pig/PigScene'
import type { PigMood } from '@/components/pig/Pig'
import { Card, EmptyState } from '@/components/ui'
import { useJourney, useStore } from '@/hooks/useStore'
import { DailyCard, GoalCard, HomeHeader, MemberCards, SavingsCard } from './sections'
import { TopUpDialog } from './TopUpDialog'

export default function HomePage() {
  const j = useJourney()
  const { state, progress, today, goalReached, motionOff } = useStore()
  const [topUp, setTopUp] = useState(false)
  const [poke, setPoke] = useState(false)

  const reveal = state.reveals.find((r) => r.date === today)
  const cs = reveal ? state.contributions.filter((c) => c.revealId === reveal.id) : []
  const hour = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: j.timezone }))
  let mood: PigMood = 'idle'
  if (goalReached) mood = 'celebrating'
  else if (poke) mood = 'happy'
  else if (cs.length && cs.every((c) => c.status === 'confirmed')) mood = 'dancing'
  else if (hour >= 22 || hour < 5) mood = 'sleeping'
  else if (reveal) mood = 'coin'

  const actions = [
    { label: 'Nạp tiền', Icon: Coins, onClick: () => setTopUp(true) },
    { label: 'Xem nhật ký', Icon: BookOpen, to: '/journal' },
    { label: 'Xem thống kê', Icon: BarChart3, to: '/stats' },
    { label: 'Thử thách', Icon: Medal, to: '/challenges' },
  ]

  return (
    <div className="px-4 pt-3.5">
      <HomeHeader />
      <button type="button" aria-label={`Chọc ${j.pig.name}`} className="mt-3 block w-full border-0 bg-transparent p-0" onClick={() => { setPoke(true); setTimeout(() => setPoke(false), 1500) }}>
        <PigScene pig={j.pig} progress={progress} mood={mood} reducedMotion={motionOff} />
      </button>
      <SavingsCard />
      <MemberCards />
      <DailyCard />
      <div className="mt-3.5 grid grid-cols-4 gap-2">
        {actions.map(({ label, Icon, to, onClick }) => {
          const inner = <><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-vio shadow"><Icon size={22} /></span><span className="text-[11px] font-extrabold leading-tight">{label}</span></>
          const cls = 'flex flex-col items-center gap-1.5 text-center no-underline'
          return to ? <Link key={label} to={to} className={cls} style={{ color: 'inherit' }}>{inner}</Link> : <button key={label} type="button" onClick={onClick} className={cls} style={{ background: 'none', border: 0, color: 'inherit', fontFamily: 'inherit' }}>{inner}</button>
        })}
      </div>
      <GoalCard />
      <Card>
        <div className="flex items-center justify-between"><h2 className="h3">Hoạt động gần đây</h2><Link to="/journal" className="muted !text-xs">Xem tất cả</Link></div>
        {state.activity.length ? state.activity.slice(0, 4).map((a) => <ActivityRow key={a.id} a={a} journey={j} />) : <EmptyState title="Chưa có hoạt động" hint="Mở số tiền hôm nay để bắt đầu nhé!" />}
      </Card>
      <p className="muted mt-4 pb-2 text-center !text-[11px]">Piggy Duo chỉ ghi lại cam kết và khoản góp, không giữ hay chuyển tiền thật.</p>
      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
    </div>
  )
}
