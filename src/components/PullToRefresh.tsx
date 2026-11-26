import { RefreshCw } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/hooks/useStore'

const THRESHOLD = 66
const MAX_PULL = 110

export function PullToRefresh({ children }: { children: ReactNode }) {
  const { repo, run, toast } = useStore()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const active = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
    if (scrollTop <= 2) {
      startY.current = e.touches[0].clientY
      active.current = true
    } else {
      active.current = false
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active.current || startY.current === null || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) {
      setPull(0)
      return
    }
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
    if (scrollTop > 2) {
      active.current = false
      setPull(0)
      return
    }
    // Smooth rubber-band damping
    const damped = Math.min(MAX_PULL, Math.pow(dy, 0.82) * 1.35)
    setPull(damped)
  }

  const onTouchEnd = async () => {
    if (!active.current || refreshing) return
    active.current = false
    startY.current = null
    if (pull >= THRESHOLD) {
      setRefreshing(true)
      setPull(56)
      try {
        await run(repo.syncWithSheet('pull'))
        toast('Đã làm mới dữ liệu từ Google Sheets! 🐷✨')
      } finally {
        setTimeout(() => {
          setRefreshing(false)
          setPull(0)
        }, 350)
      }
    } else {
      setPull(0)
    }
  }

  const progress = Math.min(1, pull / THRESHOLD)
  const visible = pull > 6 || refreshing

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="relative min-h-screen"
    >
      {/* Floating cute piggy refresh indicator */}
      <div
        aria-live="polite"
        style={{
          height: visible ? `${Math.max(pull, refreshing ? 54 : 0)}px` : '0px',
          opacity: visible ? Math.min(1, progress * 1.25) : 0,
          transition: active.current ? 'none' : 'height 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
        className="pointer-events-none flex w-full items-center justify-center overflow-hidden"
      >
        <div className="flex items-center gap-2 rounded-full border-2 border-white bg-white/95 px-4 py-1.5 text-xs font-black text-[#172554] shadow-[0_8px_20px_rgba(143,124,240,.25)]">
          <span
            className={`inline-flex items-center justify-center text-base ${refreshing ? 'animate-bounce' : ''}`}
            style={{
              transform: refreshing ? undefined : `rotate(${Math.round(progress * 360)}deg)`,
            }}
          >
            🐷
          </span>
          <RefreshCw
            size={14}
            className={`text-[#ff3b6b] ${refreshing ? 'animate-spin' : ''}`}
            style={{
              transform: refreshing ? undefined : `rotate(${Math.round(progress * 240)}deg)`,
            }}
          />
          <span>
            {refreshing
              ? 'Đang tải dữ liệu mới...'
              : progress >= 1
                ? 'Thả tay để cập nhật ngay!'
                : 'Kéo xuống để làm mới...'}
          </span>
        </div>
      </div>

      {children}
    </div>
  )
}
