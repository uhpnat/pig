import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button, Chip, Field, Modal, MoneyInput, Toggle } from '@/components/ui'
import { previewPlan } from '@/domain/engine'
import { useJourney, useStore } from '@/hooks/useStore'
import { PlanPreviewCard } from '@/features/onboarding/PlanPreviewCard'
import { journeyToValues, onboardingSchema, valuesToJourney, type OnboardingValues } from '@/features/onboarding/schema'

/** Shared-rule edits. In a two-member journey both people must agree; every change is written to the audit log. */
export function EditRulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const j = useJourney()
  const { repo, run, toast } = useStore()
  const form = useForm<OnboardingValues>({ resolver: zodResolver(onboardingSchema), mode: 'onChange', values: journeyToValues(j) })
  const { register, control, watch, handleSubmit, formState: { errors } } = form
  const [consent, setConsent] = useState(false)
  const [reqConfirm, setReqConfirm] = useState(j.requireConfirmation)
  const v = watch()
  const draft = useMemo(() => valuesToJourney(v, j, true), [v, j])
  const plan = useMemo(() => previewPlan(draft), [draft])

  const submit = handleSubmit(async (vals: OnboardingValues) => {
    if (!consent) return toast('Cần cả hai đồng ý trước khi đổi quy tắc chung', 'error')
    const next = valuesToJourney(vals, j, true)
    const out = await run(repo.updateJourney({ ...next, requireConfirmation: reqConfirm }))
    if (out) { toast('Đã cập nhật & ghi vào nhật ký thay đổi ✅'); setConsent(false); onClose() }
  })

  return (
    <Modal open={open} onClose={onClose} title="Sửa quy tắc chung">
      <p className="muted mt-2 !text-xs leading-relaxed">Thay đổi thu nhập, ngân sách hay cách chia sẽ ảnh hưởng đến các lần mở số tiền <b>từ giờ trở đi</b>. Khoản đã xác nhận không bị thay đổi. Mọi chỉnh sửa được lưu trong nhật ký kiểm toán.</p>
      <form onSubmit={submit} noValidate>
        <Field label="Tên hành trình" error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tên người 1" error={errors.aName?.message} {...register('aName')} />
          <Field label="Tên người 2" error={errors.bName?.message} {...register('bName')} />
          <div>
            <span className="label">Giới tính {v.aName}</span>
            <Controller
              control={control}
              name="aGender"
              render={({ field }) => (
                <div className="flex gap-2">
                  <Chip on={field.value === 'male'} onClick={() => field.onChange('male')}>👦 Nam</Chip>
                  <Chip on={field.value === 'female'} onClick={() => field.onChange('female')}>👧 Nữ</Chip>
                </div>
              )}
            />
          </div>
          <div>
            <span className="label">Giới tính {v.bName}</span>
            <Controller
              control={control}
              name="bGender"
              render={({ field }) => (
                <div className="flex gap-2">
                  <Chip on={field.value === 'male'} onClick={() => field.onChange('male')}>👦 Nam</Chip>
                  <Chip on={field.value === 'female'} onClick={() => field.onChange('female')}>👧 Nữ</Chip>
                </div>
              )}
            />
          </div>
          <Controller control={control} name="aIncome" render={({ field }) => <MoneyInput label="Thu nhập 1" suffix="đ" value={field.value} onChange={field.onChange} error={errors.aIncome?.message} />} />
          <Controller control={control} name="bIncome" render={({ field }) => <MoneyInput label="Thu nhập 2" suffix="đ" value={field.value} onChange={field.onChange} error={errors.bIncome?.message} />} />
        </div>
        <Controller control={control} name="goal" render={({ field }) => <MoneyInput label="Mục tiêu chung" value={field.value} onChange={field.onChange} error={errors.goal?.message} />} />
        <Controller control={control} name="months" render={({ field }) => (
          <div><label className="label" htmlFor="em">Thời gian (tháng)</label><input id="em" className="field" inputMode="numeric" value={Number.isFinite(field.value) ? field.value : ''} onChange={(e) => field.onChange(e.target.value === '' ? NaN : Number(e.target.value.replace(/\D/g, '')))} />{errors.months && <p className="mt-1 text-xs font-bold text-[#e5484d]">{errors.months.message}</p>}</div>
        )} />
        <span className="label">Cách chia</span>
        <Controller control={control} name="fairness" render={({ field }) => (
          <div className="flex flex-wrap gap-2">{([['proportional', 'Theo thu nhập'], ['equal', 'Chia đều'], ['custom', 'Tuỳ chỉnh']] as const).map(([id, l]) => <Chip key={id} on={field.value === id} onClick={() => field.onChange(id)}>{l}</Chip>)}</div>
        )} />
        {v.fairness === 'custom' && (
          <Controller control={control} name="customPctA" render={({ field }) => (
            <div><label className="label" htmlFor="ecp">{v.aName} góp {field.value}%</label><input id="ecp" type="range" min={5} max={95} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} className="w-full accent-[#8f7cf0]" /></div>
          )} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Controller control={control} name="monthlyOverride" render={({ field }) => <MoneyInput label="Mục tiêu tháng" suffix="đ" value={field.value} onChange={field.onChange} placeholder="Tự động" />} />
          <Controller control={control} name="savingsPct" render={({ field }) => <div><label className="label" htmlFor="esp">% thu nhập</label><input id="esp" className="field" inputMode="decimal" value={field.value || ''} placeholder="Không" onChange={(e) => field.onChange(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} /></div>} />
          <Controller control={control} name="dailyMin" render={({ field }) => <MoneyInput label="Tối thiểu/ngày" suffix="đ" value={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="dailyMax" render={({ field }) => <MoneyInput label="Tối đa/ngày" suffix="đ" value={field.value} onChange={field.onChange} placeholder="Tự động" error={errors.dailyMax?.message} />} />
        </div>
        <Toggle checked={reqConfirm} onChange={setReqConfirm} label="Yêu cầu xác nhận khoản góp" hint="Bật: chỉ tiền đã xác nhận mới vào heo." />
        <div className="mt-2"><PlanPreviewCard plan={plan} journey={draft} /></div>
        <label className="mt-4 flex items-start gap-2.5 text-sm font-extrabold"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#8f7cf0]" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Cả hai chúng mình đã đồng ý với thay đổi này.</label>
        <div className="mt-5"><Button disabled={!consent} onClick={submit}>Lưu thay đổi</Button></div>
      </form>
    </Modal>
  )
}
