import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pig, PIG_BACKGROUNDS, PIG_COLORS, PIG_STYLES, type PigMood } from '@/components/pig/Pig'
import { Button, Card, Chip, Field } from '@/components/ui'
import { useJourney, useStore } from '@/hooks/useStore'
import type { PigConfig } from '@/domain/types'

const MOOD_CYCLE: { mood: PigMood; label: string }[] = [
  { mood: 'idle', label: 'Thong thả' }, { mood: 'happy', label: 'Vui vẻ' }, { mood: 'dancing', label: 'Nhảy múa' },
  { mood: 'eating', label: 'Ăn xu' }, { mood: 'sleeping', label: 'Ngủ' }, { mood: 'celebrating', label: 'Ăn mừng' },
]

export default function PigPage() {
  const j = useJourney()
  const { repo, run, motionOff, celebrate } = useStore()
  const nav = useNavigate()
  const [pig, setPig] = useState<PigConfig>(j.pig)
  const [mood, setMood] = useState<PigMood>('happy')
  const [err, setErr] = useState('')
  const set = (p: Partial<PigConfig>) => setPig((x) => ({ ...x, ...p }))
  const bg = PIG_BACKGROUNDS.find((b) => b.id === pig.background)!

  const save = async () => {
    if (!pig.name.trim()) return setErr('Hãy đặt tên cho heo')
    const ok = j.setupDone
      ? await run(repo.updateJourney({ pig: { ...pig, name: pig.name.trim() } }))
      : await run(repo.saveJourney({ ...j, pig: { ...pig, name: pig.name.trim() }, setupDone: true }))
    if (ok) { celebrate(); nav(j.setupDone ? '/couple' : '/') }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="h1 text-center">Tạo heo của bạn</h1>
      <p className="muted mt-1 text-center">Chọn kiểu, màu và đặt tên cho heo nhé!</p>

      <div className="mx-auto mt-4 grid h-[230px] w-[260px] place-items-center rounded-[44px] border-[3px] border-white shadow-[0_14px_30px_rgba(110,120,220,.3)]" style={{ background: bg.css }}>
        <Pig config={pig} progress={0} mood={mood} size={200} reducedMotion={motionOff} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Xem thử chuyển động">
        {MOOD_CYCLE.map((m) => <Chip key={m.mood} on={mood === m.mood} onClick={() => setMood(m.mood)}>{m.label}</Chip>)}
      </div>

      <Card>
        <h2 className="h3">Kiểu heo</h2>
        <div className="mt-2 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Kiểu heo">
          {PIG_STYLES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={pig.style === s.id} onClick={() => set({ style: s.id })}
              className={`thumb flex flex-col items-center gap-1 !rounded-2xl px-1 py-2 text-center ${pig.style === s.id ? 'thumb-on' : ''}`} style={{ color: '#3b2a6b' }}>
              <Pig config={{ ...pig, style: s.id }} size={64} reducedMotion />
              <span className="text-[11px] font-extrabold leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
        <h2 className="h3 mt-4">Màu heo</h2>
        <div className="mt-2 flex gap-2.5" role="radiogroup" aria-label="Màu heo">
          {PIG_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={pig.color === c} aria-label={`Màu ${c}`} onClick={() => set({ color: c })}
              className={`h-9 w-9 rounded-full border-[3px] border-white shadow ${pig.color === c ? 'ring-4 ring-vio' : ''}`} style={{ background: c }} />
          ))}
        </div>
        <h2 className="h3 mt-4">Phông nền</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {PIG_BACKGROUNDS.map((b) => <Chip key={b.id} on={pig.background === b.id} onClick={() => set({ background: b.id })}>{b.label}</Chip>)}
        </div>
        <Field label="Tên heo" value={pig.name} maxLength={24} error={err} onChange={(e) => { set({ name: e.target.value }); setErr('') }} />
        <p className="muted mt-3 !text-xs">Heo sẽ lớn dần, đổi phụ kiện và ánh vàng theo tiến độ mục tiêu. Đây chỉ là trang trí, không ảnh hưởng đến số tiền.</p>
      </Card>
      <Button className="mt-4" onClick={save}>Xác nhận</Button>
      {j.setupDone && <Button variant="ghost" className="mt-2.5" onClick={() => nav(-1)}>Huỷ</Button>}
    </div>
  )
}
