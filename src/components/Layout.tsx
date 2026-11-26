import { BookOpen, Heart, Home, Medal, WifiOff } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { FxHost, ToastHost } from '@/components/FxHost'
import { useOnline } from '@/hooks/useStore'

const TABS = [
  { to: '/', label: 'Trang chủ', Icon: Home, end: true },
  { to: '/journal', label: 'Nhật ký', Icon: BookOpen },
  { to: '/challenges', label: 'Thử thách', Icon: Medal },
  { to: '/couple', label: 'Của chúng mình', Icon: Heart },
]

export function AppFrame({ nav }: { nav: boolean }) {
  const online = useOnline()
  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px]" style={{ paddingBottom: nav ? 'calc(88px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' }}>
      {!online && (
        <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-[#3b2a6b] px-3 py-1.5 text-xs font-extrabold text-white">
          <WifiOff size={14} /> Đang ngoại tuyến – dữ liệu vẫn được lưu trên máy này
        </div>
      )}
      <main id="main"><Outlet /></main>
      {nav && (
        <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-30 flex justify-center rounded-t-[28px] px-2 pt-2 shadow-[0_-6px_24px_rgba(143,124,240,.2)] backdrop-blur-xl" style={{ background: 'var(--card)', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
          <div className="flex w-full max-w-[440px]">
            {TABS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab no-underline ${isActive ? 'tab-on' : ''}`}>
                <Icon size={22} aria-hidden /><span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <FxHost />
      <ToastHost />
    </div>
  )
}

export const TabLayout = () => <AppFrame nav />
export const FullLayout = () => <AppFrame nav={false} />
export { Outlet }
