import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { AVATAR_PRESETS } from '@/lib/assets'
import { fileToAvatar } from '@/lib/fx'

export function AvatarPicker({ value, onChange, label, onError }: { value: string; onChange: (v: string) => void; label: string; onError?: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const custom = value.startsWith('data:')
  return (
    <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap items-center gap-2">
      {AVATAR_PRESETS.map((a, i) => (
        <button key={a} type="button" role="radio" aria-checked={value === a} aria-label={`Ảnh đại diện ${i + 1}`} onClick={() => onChange(a)}
          className={`rounded-full p-0.5 ${value === a ? 'ring-4 ring-vio' : ''}`} style={{ background: 'none', border: 0 }}>
          <Avatar value={a} size={42} />
        </button>
      ))}
      {custom && <button type="button" role="radio" aria-checked aria-label="Ảnh đã tải lên" className="rounded-full p-0.5 ring-4 ring-vio" style={{ background: 'none', border: 0 }}><Avatar value={value} size={42} /></button>}
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="chip flex items-center gap-1"><Upload size={14} /> {busy ? 'Đang xử lý…' : 'Tải ảnh'}</button>
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        setBusy(true)
        try { onChange(await fileToAvatar(f)) } catch (err) { onError?.((err as Error).message) } finally { setBusy(false) }
      }} />
    </div>
  )
}
