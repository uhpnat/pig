import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AvatarPicker } from '@/components/AvatarPicker'
import { Button, Card, Chip, Field, MoneyInput } from '@/components/ui'
import { previewPlan } from '@/domain/engine'
import { addMonths, durationLabel, fmtDate, pct, vnd } from '@/domain/format'
import { defaultJourney } from '@/domain/seed'
import { useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import { PlanPreviewCard } from './PlanPreviewCard'
import { initialValues, onboardingSchema, STEP_FIELDS, valuesToJourney, type OnboardingValues } from './schema'

const PRESETS = [3, 6, 12, 24, 36]
const MODES = [
  { id: 'proportional', label: 'Theo thu nhập', hint: 'Người thu nhập cao góp nhiều hơn theo tỷ lệ (mặc định).' },
  { id: 'equal', label: 'Chia đều', hint: 'Mỗi người góp 50%.' },
  { id: 'custom', label: 'Tùy chỉnh', hint: 'Tự chọn tỷ lệ góp của người thứ nhất.' },
] as const

export default function OnboardingPage() {
  const { state, repo, run, today, toast } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(state.draft?.step ?? 0)
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: (state.draft?.values as OnboardingValues | undefined) ?? initialValues(today),
  })
  const { register, control, watch, trigger, getValues, formState: { errors } } = form
  const v = watch()
  const base = state.journey ?? defaultJourney(v.startDate)
  const draftJourney = useMemo(() => valuesToJourney(v as OnboardingValues, base, false), [v, base])
  const plan = useMemo(() => previewPlan(draftJourney), [draftJourney])

  useEffect(() => { window.scrollTo(0, 0) }, [step])

  const saveDraft = async (silent = false) => {
    await run(repo.saveDraft({ step, values: getValues() }))
    if (!silent) toast('Đã lưu nháp 💾')
  }
  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step] as never)
    if (!ok) return toast('Kiểm tra lại các ô màu đỏ nhé', 'error')
    setStep((s) => s + 1)
  }
  const confirm = async () => {
    const ok = await trigger()
    if (!ok) { setStep(0); return toast('Còn thông tin chưa hợp lệ', 'error') }
    const done = await run(repo.saveJourney(valuesToJourney(getValues(), base, false)))
    if (done) nav('/pig')
  }
  const loadDemo = async () => { if (await run(repo.loadDemo())) { toast('Đã tải dữ liệu mẫu 🐷'); nav('/') } }

  return (
    <div className="px-4 pb-24 pt-3.5">
      {step > 0 && (
        <button type="button" className="chip flex items-center gap-1" onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Quay lại</button>
      )}
      <div className="mt-3 flex justify-center gap-1.5" aria-label={`Bước ${step + 1} trên 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-pink' : 'w-2 bg-vio/30'}`} />)}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <>
              <div className="-mx-4 mt-2"><img src={IMG.ob} alt="Chú heo cùng những đồng xu" className="block w-full" style={{ maskImage: 'linear-gradient(#000 88%, transparent)' }} /></div>
              <h1 className="h1 -mt-3 text-center">Bắt đầu hành trình tiết kiệm cùng nhau! 💗</h1>
              <p className="muted mt-1.5 text-center">Cùng nuôi heo đất, đạt mục tiêu và biến ước mơ thành hiện thực.</p>
              <Card>
                <h2 className="h3">🗺️ Hành trình tiết kiệm</h2>
                <Field label="Tên hành trình" placeholder="Heo Nhà Mình" error={errors.name?.message} {...register('name')} />
                <Field label="Ngày bắt đầu" type="date" error={errors.startDate?.message} {...register('startDate')} />
                <span className="label">Thời gian tiết kiệm</span>
                <Controller control={control} name="months" render={({ field }) => (
                  <>
                    <div className="flex flex-wrap gap-2">{PRESETS.map((m) => <Chip key={m} on={field.value === m} onClick={() => field.onChange(m)}>{durationLabel(m)}</Chip>)}</div>
                    <label className="label" htmlFor="months">Hoặc nhập số tháng</label>
                    <input id="months" className={`field ${errors.months ? 'field-error' : ''}`} inputMode="numeric" value={Number.isFinite(field.value) ? field.value : ''} onChange={(e) => field.onChange(e.target.value === '' ? NaN : Number(e.target.value.replace(/\D/g, '')))} />
                  </>
                )} />
                {errors.months && <p role="alert" className="mt-1 text-xs font-bold text-[#e5484d]">{errors.months.message}</p>}
                {Number.isFinite(v.months) && v.startDate && <p className="muted mt-2">📅 Kết thúc vào <b>{fmtDate(addMonths(v.startDate, v.months))}</b></p>}
              </Card>
              <Button className="mt-4" onClick={next}>Tiếp tục →</Button>
              <Button variant="ghost" className="mt-2.5" onClick={() => saveDraft()}>Lưu nháp</Button>
              <Button variant="ghost" className="mt-2.5" onClick={loadDemo}>Xem thử với dữ liệu mẫu</Button>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="h1 mt-4 text-center">Hai bạn là ai nhỉ? 👫</h1>
              <p className="muted mt-1 text-center">Thu nhập chỉ dùng để chia mức góp công bằng.</p>
              {(['a', 'b'] as const).map((k, i) => (
                <Card key={k}>
                  <h2 className="h3">{i ? '💙 Người thứ hai' : '💗 Người thứ nhất'}</h2>
                  <Field label="Tên hiển thị" error={errors[`${k}Name` as 'aName']?.message} {...register(`${k}Name` as 'aName')} />
                  <span className="label">Ảnh đại diện</span>
                  <Controller control={control} name={`${k}Avatar` as 'aAvatar'} render={({ field }) => <AvatarPicker label={`Ảnh đại diện ${i + 1}`} value={field.value} onChange={field.onChange} onError={(m) => toast(m, 'error')} />} />
                  <Controller control={control} name={`${k}Income` as 'aIncome'} render={({ field }) => (
                    <MoneyInput label="Thu nhập hàng tháng" value={field.value} onChange={field.onChange} error={errors[`${k}Income` as 'aIncome']?.message} inputMode="numeric" />
                  )} />
                </Card>
              ))}
              <Button className="mt-4" onClick={next}>Tiếp tục →</Button>
              <Button variant="ghost" className="mt-2.5" onClick={() => saveDraft()}>Lưu nháp</Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="h1 mt-4 text-center">Mục tiêu & quy tắc 🎯</h1>
              <Card>
                <Controller control={control} name="goal" render={({ field }) => <MoneyInput label="🎯 Mục tiêu chung" value={field.value} onChange={field.onChange} error={errors.goal?.message} />} />
                <span className="label">Cách chia mức góp</span>
                <Controller control={control} name="fairness" render={({ field }) => (
                  <>
                    <div className="flex flex-wrap gap-2">{MODES.map((m) => <Chip key={m.id} on={field.value === m.id} onClick={() => field.onChange(m.id)}>{m.label}</Chip>)}</div>
                    <p className="muted mt-1.5 !text-xs">{MODES.find((m) => m.id === field.value)?.hint}</p>
                  </>
                )} />
                {v.fairness === 'custom' && (
                  <Controller control={control} name="customPctA" render={({ field }) => (
                    <div>
                      <label className="label" htmlFor="cpa">{v.aName || 'Người 1'} góp {field.value}% · {v.bName || 'Người 2'} {100 - field.value}%</label>
                      <input id="cpa" type="range" min={5} max={95} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} className="w-full accent-[#8f7cf0]" />
                    </div>
                  )} />
                )}
              </Card>
              <Card>
                <h2 className="h3">💰 Ngân sách (tuỳ chọn)</h2>
                <p className="muted mt-1 !text-xs">Mặc định = mục tiêu ÷ số tháng. Có thể đặt theo % thu nhập hoặc số tiền cố định.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Controller control={control} name="savingsPct" render={({ field }) => (
                    <div><label className="label" htmlFor="sp">% thu nhập chung</label><input id="sp" className="field" inputMode="decimal" placeholder="Không đặt" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} />{errors.savingsPct && <p className="mt-1 text-xs font-bold text-[#e5484d]">{errors.savingsPct.message}</p>}</div>
                  )} />
                  <Controller control={control} name="monthlyOverride" render={({ field }) => <MoneyInput label="Mục tiêu tháng" suffix="đ" value={field.value} onChange={field.onChange} placeholder="Không đặt" />} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller control={control} name="dailyMin" render={({ field }) => <MoneyInput label="Tối thiểu/ngày" suffix="đ" value={field.value} onChange={field.onChange} hint="Tổng 2 người" />} />
                  <Controller control={control} name="dailyMax" render={({ field }) => <MoneyInput label="Tối đa/ngày" suffix="đ" value={field.value} onChange={field.onChange} placeholder="Tự động" error={errors.dailyMax?.message} hint="Tổng 2 người" />} />
                </div>
              </Card>
              <div className="mt-3.5"><PlanPreviewCard plan={plan} journey={draftJourney} /></div>
              <Button className="mt-4" onClick={next}>Xem lại & xác nhận →</Button>
              <Button variant="ghost" className="mt-2.5" onClick={() => saveDraft()}>Lưu nháp</Button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="h1 mt-4 text-center">Xác nhận hành trình ✨</h1>
              <Card>
                <h2 className="h2 text-center">{draftJourney.name}</h2>
                <p className="muted text-center">{fmtDate(draftJourney.startDate)} → {fmtDate(draftJourney.endDate)} · {durationLabel(draftJourney.months)}</p>
                <p className="mt-3 text-center text-3xl font-black text-pink">{vnd(draftJourney.goal)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  {(['a', 'b'] as const).map((k) => (
                    <div key={k} className="rounded-2xl bg-white/60 p-2.5">
                      <p className="h3">{draftJourney.members[k].name}</p>
                      <p className="muted">{vnd(draftJourney.members[k].income)}</p>
                      <p className="text-sm font-black text-vio">góp {pct(plan.planned[k] * 100)}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="mt-3.5"><PlanPreviewCard plan={plan} journey={draftJourney} /></div>
              <p className="muted mt-3 text-center !text-xs">Piggy Duo chỉ ghi lại cam kết và khoản góp thực tế, không giữ hay chuyển tiền thật.</p>
              <Button className="mt-4" onClick={confirm}>Tiếp tục tạo heo 🐷</Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
