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

const PRESETS = [6, 12, 24, 36]
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
  const {
    register,
    control,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = form
  const v = watch()
  const base = state.journey ?? defaultJourney(v.startDate)
  const draftJourney = useMemo(() => valuesToJourney(v as OnboardingValues, base, false), [v, base])
  const plan = useMemo(() => previewPlan(draftJourney), [draftJourney])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step] as never)
    if (!ok) return toast('Kiểm tra lại các ô màu đỏ nhé', 'error')
    setStep((s) => s + 1)
  }

  const confirm = async () => {
    const ok = await trigger()
    if (!ok) {
      setStep(0)
      return toast('Còn thông tin chưa hợp lệ', 'error')
    }
    const done = await run(repo.saveJourney(valuesToJourney(getValues(), base, false)))
    if (done) nav('/pig')
  }

  const loadDemo = async () => {
    if (await run(repo.loadDemo())) {
      toast('Đã tải dữ liệu mẫu 🐷')
      nav('/')
    }
  }

  return (
    <div
      className="min-h-screen px-4 pb-16 pt-3.5"
      style={{
        background: 'linear-gradient(180deg, #f3e8ff 0%, #ffe6f1 45%, #fff7fa 100%)',
      }}
    >
      {/* Top Bar matching 01_onboarding.png */}
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => setStep(step - 1)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        ) : (
          <span className="w-10" />
        )}
        <div className="flex gap-1.5" aria-label={`Bước ${step + 1} trên 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-7 bg-[#ff4d7d]' : 'w-2 bg-[#c4b5fd]'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={loadDemo}
          className="cursor-pointer border-0 bg-transparent text-[14px] font-black text-[#172554]"
        >
          Bỏ qua
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
        >
          {step === 0 && (
            <>
              {/* 3D Couple & Pig Hero (`ob.jpg` includes the title & illustration matching 01_onboarding.png) */}
              <div className="-mx-4 mt-1 overflow-hidden">
                <img
                  src={IMG.ob}
                  alt="Bắt đầu hành trình tiết kiệm cùng nhau"
                  className="block w-full select-none object-cover"
                  style={{
                    maskImage: 'linear-gradient(180deg, #000 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(180deg, #000 88%, transparent 100%)',
                  }}
                />
              </div>

              {/* Overlapping White Card matching 01_onboarding.png */}
              <div className="relative -mt-6 rounded-[32px] border-2 border-white bg-white/95 p-5 shadow-[0_16px_36px_rgba(143,124,240,.2)]">
                <div className="flex items-center gap-2 text-[15px] font-black text-[#172554]">
                  <span className="text-lg">📅</span> Thời gian tiết kiệm
                </div>
                <Controller
                  control={control}
                  name="months"
                  render={({ field }) => (
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {PRESETS.map((m) => {
                        const active = field.value === m
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => field.onChange(m)}
                            className={`cursor-pointer rounded-2xl border-2 py-2.5 text-[14px] font-black transition-all ${
                              active
                                ? 'border-[#6366f1] bg-[#e0e7ff] text-[#1e1b4b] shadow-sm'
                                : 'border-transparent bg-[#f8fafc] text-[#475569]'
                            }`}
                            style={{ fontFamily: 'inherit' }}
                          >
                            {durationLabel(m)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                />

                <Field
                  label="💗 Tên hành trình của hai đứa"
                  placeholder="Heo Nhà Mình"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Controller
                  control={control}
                  name="aIncome"
                  render={({ field }) => (
                    <MoneyInput
                      label="💰 Số lương 1 tháng (ước tính)"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.aIncome?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="goal"
                  render={({ field }) => (
                    <MoneyInput
                      label="🎯 Mục tiêu"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.goal?.message}
                    />
                  )}
                />
              </div>

              <Button className="mt-4 !py-4 !text-[18px]" onClick={next}>
                Tiếp tục →
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="h1 mt-4 text-center">Hai bạn là ai nhỉ? 👫</h1>
              <p className="muted mt-1 text-center">Thu nhập giúp chia mức góp mỗi ngày thật công bằng.</p>
              {(['a', 'b'] as const).map((k, i) => (
                <Card key={k}>
                  <h2 className="h3">{i ? '💙 Người thứ hai' : '💗 Người thứ nhất'}</h2>
                  <Field
                    label="Tên hiển thị"
                    error={errors[`${k}Name` as 'aName']?.message}
                    {...register(`${k}Name` as 'aName')}
                  />
                  <span className="label">Ảnh đại diện</span>
                  <Controller
                    control={control}
                    name={`${k}Avatar` as 'aAvatar'}
                    render={({ field }) => (
                      <AvatarPicker
                        label={`Ảnh đại diện ${i + 1}`}
                        value={field.value}
                        onChange={field.onChange}
                        onError={(m) => toast(m, 'error')}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`${k}Income` as 'aIncome'}
                    render={({ field }) => (
                      <MoneyInput
                        label="Thu nhập hàng tháng"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors[`${k}Income` as 'aIncome']?.message}
                      />
                    )}
                  />
                </Card>
              ))}
              <Button className="mt-4 !py-4 !text-[18px]" onClick={next}>
                Tiếp tục →
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="h1 mt-4 text-center">Quy tắc chia mức góp 🎯</h1>
              <Card>
                <span className="label !mt-0">Cách chia mức góp</span>
                <Controller
                  control={control}
                  name="fairness"
                  render={({ field }) => (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {MODES.map((m) => (
                          <Chip key={m.id} on={field.value === m.id} onClick={() => field.onChange(m.id)}>
                            {m.label}
                          </Chip>
                        ))}
                      </div>
                      <p className="muted mt-1.5 !text-xs">{MODES.find((m) => m.id === field.value)?.hint}</p>
                    </>
                  )}
                />
                {v.fairness === 'custom' && (
                  <Controller
                    control={control}
                    name="customPctA"
                    render={({ field }) => (
                      <div>
                        <label className="label" htmlFor="cpa">
                          {v.aName || 'Người 1'} góp {field.value}% · {v.bName || 'Người 2'} {100 - field.value}%
                        </label>
                        <input
                          id="cpa"
                          type="range"
                          min={5}
                          max={95}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="w-full accent-[#8f7cf0]"
                        />
                      </div>
                    )}
                  />
                )}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="dailyMin"
                    render={({ field }) => (
                      <MoneyInput label="Tối thiểu/ngày" suffix="đ" value={field.value} onChange={field.onChange} />
                    )}
                  />
                  <Controller
                    control={control}
                    name="dailyMax"
                    render={({ field }) => (
                      <MoneyInput
                        label="Tối đa/ngày"
                        suffix="đ"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Tự động"
                        error={errors.dailyMax?.message}
                      />
                    )}
                  />
                </div>
              </Card>
              <div className="mt-3.5">
                <PlanPreviewCard plan={plan} journey={draftJourney} />
              </div>
              <Button className="mt-4 !py-4 !text-[18px]" onClick={next}>
                Xem lại & Tạo heo →
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="h1 mt-4 text-center">Xác nhận hành trình ✨</h1>
              <Card>
                <h2 className="h2 text-center">{draftJourney.name}</h2>
                <p className="muted text-center">
                  {fmtDate(draftJourney.startDate)} → {fmtDate(addMonths(draftJourney.startDate, draftJourney.months))} ·{' '}
                  {durationLabel(draftJourney.months)}
                </p>
                <p className="mt-3 text-center text-3xl font-black text-[#ff3b6b]">{vnd(draftJourney.goal)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  {(['a', 'b'] as const).map((k) => (
                    <div key={k} className="rounded-2xl bg-[#f8fafc] p-3">
                      <p className="h3">{draftJourney.members[k].name}</p>
                      <p className="muted">{vnd(draftJourney.members[k].income)}</p>
                      <p className="text-sm font-black text-[#7c3aed]">góp {pct(plan.planned[k] * 100)}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="mt-3.5">
                <PlanPreviewCard plan={plan} journey={draftJourney} />
              </div>
              <Button className="mt-4 !py-4 !text-[18px]" onClick={confirm}>
                Tiếp tục tạo heo 🐷
              </Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
