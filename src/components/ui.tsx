import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { formatMoneyInput, parseMoney } from '@/domain/format'
import { IMG, type ImgKey } from '@/lib/assets'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'pink' | 'violet' | 'ghost'; size?: 'md' | 'sm'; block?: boolean }

export function Button({ variant = 'pink', size = 'md', block = true, className = '', ...p }: BtnProps) {
  const v = variant === 'violet' ? 'btn-violet' : variant === 'ghost' ? 'btn-ghost' : ''
  return <button type="button" {...p} className={`btn ${v} ${size === 'sm' ? 'btn-sm' : ''} ${block ? '' : '!w-auto'} ${className}`} />
}

export function Card({ className = '', children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
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
    ref.current?.focus()
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1e1b4b]/45 backdrop-blur-[2px] sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-[34px] border-t-2 border-white p-5 text-[#1e1b4b] shadow-2xl outline-none sm:rounded-[34px]" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fff5f9 100%)', paddingBottom: 'calc(22px + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <h2 className="h2 !text-[#1e1b4b]">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-[#f3e8ff] text-[#6d28d9]"><X size={18} /></button>
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
        <Button size="sm" onClick={() => { onConfirm(); onClose() }} className={danger ? '!bg-none !bg-[#e5484d]' : ''}>{confirmLabel}</Button>
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
