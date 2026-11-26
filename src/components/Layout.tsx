import { Clock, Heart, Home, Trophy, WifiOff } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROUTE_THEME } from '@/App'
import { FxHost, ToastHost } from '@/components/FxHost'
import { GenderSelectDialog } from '@/components/GenderSelectDialog'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useOnline } from '@/hooks/useStore'

const TABS = [
  { to: '/', label: 'Trang chủ', Icon: Home, end: true },
  { to: '/journal', label: 'Nhật ký', Icon: Clock },
  { to: '/challenges', label: 'Thử thách', Icon: Trophy },
  { to: '/couple', label: 'Của chúng mình', Icon: Heart },
]

export function AppFrame({ nav }: { nav: boolean }) {
  const online = useOnline()
  const loc = useLocation()
  const theme = ROUTE_THEME[loc.pathname] || { top: '#b8e1ff', bottom: '#fde8f1' }
  return (
    <div
      className="mx-auto min-h-[100dvh] w-full max-w-[440px]"
    >
      {/* Top foreground 4px + safe-area fixed bar (z-50) so iOS Safari WebKit ALWAYS samples the active page's top color and never gets stuck on /reveal's purple! */}
      <div
        key={`top-bar-${loc.pathname}`}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        style={{
          height: 'calc(4px + env(safe-area-inset-top, 0px))',
          backgroundColor: theme.top,
        }}
      />
      {/* Fixed top & bottom backdrop layers */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10"
        style={{
          height: 'calc(88px + env(safe-area-inset-top, 0px))',
          backgroundColor: theme.top,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10"
        style={{
          height: 'calc(88px + env(safe-area-inset-bottom, 0px))',
          backgroundColor: theme.bottom,
        }}
      />
      {!online && (
        <div
          role="status"
          className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-[#3b2a6b] px-3 py-1.5 text-xs font-extrabold text-white"
          style={{ paddingTop: 'calc(6px + env(safe-area-inset-top, 0px))' }}
        >
          <WifiOff size={14} /> Đang ngoại tuyến – dữ liệu vẫn được lưu trên máy này
        </div>
      )}
      <PullToRefresh>
        <main id="main"><Outlet /></main>
      </PullToRefresh>
      {nav && (
        <nav
          aria-label="Điều hướng chính"
          className="fixed inset-x-0 bottom-0 z-30 flex justify-center rounded-t-[28px] border-t-2 border-white bg-white/95 px-2 pt-2 shadow-[0_-8px_28px_rgba(143,124,240,.18)] backdrop-blur-xl"
          style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex w-full max-w-[440px]">
            {TABS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab no-underline ${isActive ? 'tab-on' : ''}`}>
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.6 : 2.1} aria-hidden />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <FxHost />
      <ToastHost />
      <GenderSelectDialog />
    </div>
  )
}

export const TabLayout = () => <AppFrame nav />
export const FullLayout = () => <AppFrame nav={false} />
export { Outlet }
