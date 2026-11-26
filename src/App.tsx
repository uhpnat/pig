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

export const ROUTE_THEME: Record<string, { top: string; bottom: string }> = {
  '/': { top: '#b8e1ff', bottom: '#fde8f1' },
  '/reveal': { top: '#5b3dc8', bottom: '#fde8f1' },
  '/pig': { top: '#dbeafe', bottom: '#fce7f3' },
  '/couple': { top: '#fde8f1', bottom: '#fdf2f7' },
  '/welcome': { top: '#f3e8ff', bottom: '#fff7fa' },
  '/journal': { top: '#e0f2fe', bottom: '#ffeef5' },
  '/challenges': { top: '#ede9fe', bottom: '#ffeef5' },
  '/stats': { top: '#e0f2fe', bottom: '#ffeef5' },
  '/notifications': { top: '#fce7f3', bottom: '#ffeef5' },
}

export default function App() {
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    const theme = ROUTE_THEME[loc.pathname] || { top: '#b8e1ff', bottom: '#f5efff' }
    document.documentElement.style.setProperty('--page-top-color', theme.top)
    document.documentElement.style.setProperty('--page-bottom-color', theme.bottom)
    document.documentElement.style.backgroundColor = theme.top
    document.body.style.backgroundColor = theme.top
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    metas.forEach((m) => m.setAttribute('content', theme.top))
  }, [loc.pathname])
  return (
    <PasscodeGate>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={loc} key={loc.pathname}>
          <Route element={<FullLayout />}>
            <Route path="/welcome" element={<WelcomeGate />} />
            <Route path="/reveal" element={<Gate><Page><RevealPage /></Page></Gate>} />
            <Route path="/stats" element={<Gate><Page><Suspense fallback={<div className="p-8 text-center font-black text-vio">Đang tải biểu đồ…</div>}><StatsPage /></Suspense></Page></Gate>} />
            <Route path="/notifications" element={<Gate><Page><NotificationsPage /></Page></Gate>} />
          </Route>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Gate><Page><HomePage /></Page></Gate>} />
            <Route path="/pig" element={<PigGate />} />
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

