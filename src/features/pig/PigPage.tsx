import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PIG_BACKGROUNDS, PIG_STYLES } from '@/components/pig/Pig'
import { Button, Card, Chip, Field } from '@/components/ui'
import { useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import type { PigConfig } from '@/domain/types'

const STYLE_IMG: Record<PigConfig['style'], string> = {
  crown: IMG.big,
  baby: IMG.t0,
  round: IMG.t1,
  glasses: IMG.t2,
  hat: IMG.t1,
  hoodie: IMG.t3,
}

const STYLE_THUMB: Record<PigConfig['style'], string> = {
  crown: IMG.t0,
  baby: IMG.t0,
  round: IMG.t1,
  glasses: IMG.t2,
  hat: IMG.t1,
  hoodie: IMG.t3,
}

export default function PigPage() {
  const j = useJourney()
  const { repo, run, celebrate } = useStore()
  const nav = useNavigate()
  const [pig, setPig] = useState<PigConfig>(j.pig)
  const [err, setErr] = useState('')
  const set = (p: Partial<PigConfig>) => setPig((x) => ({ ...x, ...p }))
  const bg = PIG_BACKGROUNDS.find((b) => b.id === pig.background) || PIG_BACKGROUNDS[0]

  const save = async () => {
    if (!pig.name.trim()) return setErr('Hãy đặt tên cho heo')
    const ok = j.setupDone
      ? await run(repo.updateJourney({ pig: { ...pig, name: pig.name.trim() } }))
      : await run(repo.saveJourney({ ...j, pig: { ...pig, name: pig.name.trim() }, setupDone: true }))
    if (ok) {
      celebrate()
      nav(j.setupDone ? '/couple' : '/')
    }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <h1 className="h1 text-center text-[#1e1b4b]">Tạo heo của bạn</h1>
      <p className="muted mt-1 text-center">Chọn kiểu heo 3D và đặt tên cho bé heo nhé!</p>

      <div
        className="mx-auto mt-4 grid h-[220px] w-[245px] place-items-center overflow-hidden rounded-[44px] border-[4px] border-white shadow-[0_16px_34px_rgba(110,120,220,.32)]"
        style={{ background: bg.css }}
      >
        <img
          src={STYLE_IMG[pig.style] || IMG.big}
          alt={pig.name}
          className="h-[88%] w-[88%] rounded-[32px] object-cover shadow-md transition-transform duration-300 hover:scale-105"
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2.5" role="radiogroup" aria-label="Kiểu heo">
        {PIG_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={pig.style === s.id}
            onClick={() => set({ style: s.id })}
            className={`thumb flex flex-col items-center gap-1 !rounded-2xl p-1.5 transition-all ${
              pig.style === s.id ? 'thumb-on scale-105' : 'opacity-85'
            }`}
          >
            <img src={STYLE_THUMB[s.id]} alt={s.label} className="h-14 w-14 rounded-xl object-cover" />
            <span className="px-1 text-[11px] font-extrabold text-[#1e1b4b]">{s.label}</span>
          </button>
        ))}
      </div>

      <Card>
        <h2 className="h3 text-[#1e1b4b]">Phông nền</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {PIG_BACKGROUNDS.map((b) => (
            <Chip key={b.id} on={pig.background === b.id} onClick={() => set({ background: b.id })}>
              {b.label}
            </Chip>
          ))}
        </div>
        <Field
          label="Tên heo đất"
          value={pig.name}
          maxLength={24}
          error={err}
          onChange={(e) => {
            set({ name: e.target.value })
            setErr('')
          }}
        />
      </Card>
      <Button className="mt-4" onClick={save}>
        Xác nhận
      </Button>
      {j.setupDone && (
        <Button variant="ghost" className="mt-2.5" onClick={() => nav(-1)}>
          Quay lại
        </Button>
      )}
    </div>
  )
}
