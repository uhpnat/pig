import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { formatMoneyInput, parseMoney } from '@/domain/format'
import { IMG, type ImgKey } from '@/lib/assets'

export type ButtonVariant = 'primary' | 'secondary' | 'pink' | 'violet' | 'ghost' | 'outline' | 'danger'

export type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: '',
  pink: '',
  secondary: 'btn-violet',
  violet: 'btn-violet',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
}

export function Button({
  variant = 'pink',
  size = 'md',
  block = true,
  loading = false,
  icon,
  disabled,
  children,
  className = '',
  ...p
}: BtnProps) {
  const v = VARIANT_CLASS[variant]
  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...p}
      className={`btn inline-flex items-center justify-center gap-1.5 ${v} ${size === 'sm' ? 'btn-sm' : ''} ${block ? '' : '!w-auto'} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  size = 'md',
  className = '',
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'md' | 'sm' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <button
      type="button"
      aria-label={label}
      {...p}
      className={`grid ${dim} shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-white/85 text-[#1e1b4b] shadow-sm backdrop-blur-md transition-transform active:scale-95 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function PageHeader({
  title,
  onBack,
  backLabel = 'Quay lại',
  right,
  className = '',
}: {
  title: ReactNode
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <header className={`relative flex min-h-10 items-center justify-center ${className}`}>
      {onBack && (
        <IconButton label={backLabel} onClick={onBack} className="absolute left-0">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </IconButton>
      )}
      <h1 className="px-12 text-center text-[20px] font-black tracking-tight text-[#172554]">
        {title}
      </h1>
      {right && <div className="absolute right-0">{right}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  right,
  className = '',
}: {
  title: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <h2 className="text-sm font-black text-[#1e1b4b]">{title}</h2>
      {right}
    </div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`my-3 border-0 border-t border-slate-100 ${className}`} />
}

export function Card({ className = '', children, ...p }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={`card ${className}`}>{children}</div>
}

export function Chip({ on, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type="button" aria-pressed={on} {...p} className={`chip ${on ? 'chip-on' : ''} ${className}`} />
}

export function Badge({ tone = 'ok', children }: { tone?: 'ok' | 'warn' | 'mute'; children: ReactNode }) {
  return <span className={`pill ${tone === 'warn' ? 'pill-warn' : tone === 'mute' ? 'pill-mute' : ''}`}>{children}</span>
}

export function ProgressBar({ value, className = '', label, track }: { value: number; className?: string; label?: string; track?: string }) {
  return (
    <div className={`bar ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label} style={track ? { background: track } : undefined}>
      <motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
    </div>
  )
}

export function MemberSplitBar({
  pctMale,
  pctFemale,
  hasData,
  heightClass = 'h-2',
  className = '',
}: {
  pctMale: number
  pctFemale: number
  hasData: boolean
  heightClass?: string
  className?: string
}) {
  return (
    <div className={`flex ${heightClass} w-full overflow-hidden rounded-full bg-slate-100 p-0.5 ${className}`}>
      {hasData ? (
        <>
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${pctMale}%` }}
          />
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-700"
            style={{ width: `${pctFemale}%` }}
          />
        </>
      ) : (
        <div className="h-full w-full rounded-full bg-slate-200/70" />
      )}
    </div>
  )
}

export function Avatar({ value, size = 48, className = '' }: { value: string; size?: number; className?: string }) {
  const isImg = value.startsWith('img:') || value.startsWith('data:') || value.startsWith('http')
  const src = value.startsWith('img:') ? IMG[value.slice(4) as ImgKey] : value
  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-b from-white to-[#ffe1ec] shadow-md ${className}`} style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden>
      {isImg ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{value}</span>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function EmptyState({ emoji = '🐷', title, hint, action }: { emoji?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <p className="h3 mt-2 !text-base">{title}</p>
      {hint && <p className="muted mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card text-center">
      <div className="text-4xl">😿</div>
      <p className="h3 mt-1">{message}</p>
      {onRetry && <div className="mt-3"><Button size="sm" block={false} onClick={onRetry}>Thử lại</Button></div>}
    </div>
  )
}

export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }>(function Field({ label, error, hint, id, className = '', ...p }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div>
      <label className="label" htmlFor={fid}>{label}</label>
      <input ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-e` : undefined} {...p} className={`field ${error ? 'field-error' : ''} ${className}`} />
      {hint && !error && <p className="muted mt-1 !text-xs">{hint}</p>}
      {error && <p id={`${fid}-e`} role="alert" className="mt-1 text-xs font-bold text-[#e5484d]">{error}</p>}
    </div>
  )
})

/** Numeric money input that displays vi-VN thousands separators and emits a number. */
export function MoneyInput({ label, value, onChange, error, hint, suffix = 'VND', id, ...p }: { label: string; value: number; onChange: (n: number) => void; error?: string; hint?: string; suffix?: string; id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div>
      <label className="label" htmlFor={fid}>{label}</label>
      <div className="relative">
        <input id={fid} inputMode="numeric" aria-invalid={!!error} {...p} value={formatMoneyInput(value)} onChange={(e) => onChange(parseMoney(e.target.value))} className={`field pr-16 ${error ? 'field-error' : ''}`} />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-mut">{suffix}</span>
      </div>
      {hint && !error && <p className="muted mt-1 !text-xs">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-bold text-[#e5484d]">{error}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-2 text-left" style={{ background: 'none', border: 0, color: 'inherit', fontFamily: 'inherit' }}>
      <span><span className="block text-sm font-extrabold">{label}</span>{hint && <span className="muted block !text-xs">{hint}</span>}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-vio' : 'bg-[#cfc8ee]'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1b4b]/50 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="max-h-[85dvh] w-full max-w-[410px] overflow-y-auto rounded-[32px] border-2 border-white p-5 text-[#1e1b4b] shadow-2xl outline-none"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fff5f9 100%)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="h2 !text-[#1e1b4b]">{title}</h2>
              <IconButton label="Đóng" size="sm" onClick={onClose} className="!bg-[#f3e8ff] !text-[#6d28d9] !shadow-none">
                <X size={18} />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Đồng ý', danger, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="muted mt-3 !text-sm leading-relaxed">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>Để sau</Button>
        <Button variant={danger ? 'danger' : 'pink'} size="sm" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export function Segmented<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="my-2 flex flex-wrap gap-2">
      {options.map((o) => <Chip key={String(o.value)} on={o.value === value} onClick={() => onChange(o.value)}>{o.label}</Chip>)}
    </div>
  )
}
