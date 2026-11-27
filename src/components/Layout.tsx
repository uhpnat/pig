import { Clock, Heart, Home, Trophy, WifiOff } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROUTE_THEME } from '@/App'
import { CoupleChatDrawer } from '@/components/CoupleChatDrawer'
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
      {/* Fixed full-screen backdrop layer (-z-10) so top & bottom safe-area edges smoothly match the active page without any foreground seam line */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, ${theme.top} 0%, ${theme.top} 35%, ${theme.bottom} 65%, ${theme.bottom} 100%)`,
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
      <CoupleChatDrawer />
    </div>
  )
}

export const TabLayout = () => <AppFrame nav />
export const FullLayout = () => <AppFrame nav={false} />
export { Outlet }
