import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FullLayout, TabLayout } from '@/components/Layout'
import { PasscodeGate } from '@/components/PasscodeGate'
import { useStore } from '@/hooks/useStore'
import ChallengesPage from '@/features/challenges/ChallengesPage'
import CouplePage from '@/features/couple/CouplePage'
import HomePage from '@/features/home/HomePage'
import JournalPage from '@/features/journal/JournalPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import PigPage from '@/features/pig/PigPage'
import RevealPage from '@/features/reveal/RevealPage'

const StatsPage = lazy(() => import('@/features/stats/StatsPage'))

function Page({ children }: { children: ReactNode }) {
  const { motionOff } = useStore()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])
  return <motion.div initial={motionOff ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>{children}</motion.div>
}

/** Redirects to onboarding / pig creation until the journey is fully set up. */
function Gate({ children }: { children: ReactNode }) {
  const { journey } = useStore()
  if (!journey) return <Navigate to="/welcome" replace />
  if (!journey.setupDone) return <Navigate to="/pig" replace />
  return <>{children}</>
}

/** On /welcome, if a completed journey already exists (or arrives from Google Sheets), go straight to Home! */
function WelcomeGate() {
  const { journey } = useStore()
  if (journey?.setupDone) return <Navigate to="/" replace />
  return <Page><OnboardingPage /></Page>
}

const ROUTE_TOP_COLOR: Record<string, string> = {
  '/': '#86c5ff',
  '/reveal': '#5b3dc8',
  '/pig': '#dbeafe',
  '/couple': '#fde8f1',
  '/welcome': '#f3e8ff',
  '/journal': '#e0f2fe',
  '/challenges': '#ede9fe',
  '/stats': '#e0f2fe',
  '/notifications': '#fce7f3',
}

export default function App() {
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    const topColor = ROUTE_TOP_COLOR[loc.pathname] || '#f5efff'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', topColor)
  }, [loc.pathname])
  return (
    <PasscodeGate>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={loc} key={loc.pathname}>
          <Route element={<FullLayout />}>
            <Route path="/welcome" element={<WelcomeGate />} />
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
    </PasscodeGate>
  )
}

function PigGate() {
  const { journey } = useStore()
  if (!journey) return <Navigate to="/welcome" replace />
  return <Page><PigPage /></Page>
}

