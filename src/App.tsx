import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FullLayout, TabLayout } from '@/components/Layout'
import { useStore } from '@/hooks/useStore'
import ChallengesPage from '@/features/challenges/ChallengesPage'
import CouplePage from '@/features/couple/CouplePage'
import HomePage from '@/features/home/HomePage'
import JournalPage from '@/features/journal/JournalPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import PigPage from '@/features/pig/PigPage'
import RevealPage from '@/features/reveal/RevealPage'
import { lazy, Suspense, type ReactNode } from 'react'

const StatsPage = lazy(() => import('@/features/stats/StatsPage'))

function Page({ children }: { children: ReactNode }) {
  const { motionOff } = useStore()
  return <motion.div initial={motionOff ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{children}</motion.div>
}

/** Redirects to onboarding / pig creation until the journey is fully set up. */
function Gate({ children }: { children: ReactNode }) {
  const { journey } = useStore()
  if (!journey) return <Navigate to="/welcome" replace />
  if (!journey.setupDone) return <Navigate to="/pig" replace />
  return <>{children}</>
}

export default function App() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={loc} key={loc.pathname}>
        <Route element={<FullLayout />}>
          <Route path="/welcome" element={<Page><OnboardingPage /></Page>} />
          <Route path="/pig" element={<PigGate />} />
          <Route path="/reveal" element={<Gate><Page><RevealPage /></Page></Gate>} />
          <Route path="/stats" element={<Gate><Page><Suspense fallback={<div className="p-8 text-center font-black text-vio">Đang tải biểu đồ…</div>}><StatsPage /></Suspense></Page></Gate>} />
          <Route path="/notifications" element={<Gate><Page><NotificationsPage /></Page></Gate>} />
        </Route>
        <Route element={<TabLayout />}>
          <Route path="/" element={<Gate><Page><HomePage /></Page></Gate>} />
          <Route path="/journal" element={<Gate><Page><JournalPage /></Page></Gate>} />
          <Route path="/challenges" element={<Gate><Page><ChallengesPage /></Page></Gate>} />
          <Route path="/couple" element={<Gate><Page><CouplePage /></Page></Gate>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function PigGate() {
  const { journey } = useStore()
  if (!journey) return <Navigate to="/welcome" replace />
  return <Page><PigPage /></Page>
}

