import { z } from 'zod'
import { addMonths } from '@/domain/format'
import { defaultJourney } from '@/domain/seed'
import type { FairnessMode, Journey } from '@/domain/types'

export const onboardingSchema = z
  .object({
    name: z.string().trim().min(1, 'Hãy đặt tên cho hành trình').max(40, 'Tên tối đa 40 ký tự'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Chọn ngày bắt đầu'),
    months: z.number({ error: 'Nhập số tháng' }).int('Số tháng phải là số nguyên').min(1, 'Tối thiểu 1 tháng').max(120, 'Tối đa 120 tháng'),
    aName: z.string().trim().min(1, 'Nhập tên').max(20, 'Tối đa 20 ký tự'),
    aAvatar: z.string().min(1),
    aIncome: z.number().min(0, 'Không được âm').max(10_000_000_000, 'Số quá lớn'),
    bName: z.string().trim().min(1, 'Nhập tên').max(20, 'Tối đa 20 ký tự'),
    bAvatar: z.string().min(1),
    bIncome: z.number().min(0, 'Không được âm').max(10_000_000_000, 'Số quá lớn'),
    goal: z.number().min(1_000_000, 'Mục tiêu tối thiểu 1.000.000đ').max(100_000_000_000, 'Số quá lớn'),
    fairness: z.enum(['proportional', 'equal', 'custom']),
    customPctA: z.number().min(5, 'Tối thiểu 5%').max(95, 'Tối đa 95%'),
    savingsPct: z.number().min(0).max(100, 'Tối đa 100%'),
    monthlyOverride: z.number().min(0),
    dailyMin: z.number().min(0),
    dailyMax: z.number().min(0),
  })
  .refine((v) => v.dailyMax === 0 || v.dailyMax >= v.dailyMin, { path: ['dailyMax'], message: 'Mức tối đa phải lớn hơn hoặc bằng mức tối thiểu' })
  .refine((v) => v.fairness !== 'proportional' || v.aIncome + v.bIncome > 0, { path: ['aIncome'], message: 'Chế độ theo thu nhập cần ít nhất một khoản thu nhập > 0' })

export type OnboardingValues = z.infer<typeof onboardingSchema>

export const STEP_FIELDS: (keyof OnboardingValues)[][] = [
  ['name', 'startDate', 'months'],
  ['aName', 'aIncome', 'bName', 'bIncome'],
  ['goal', 'fairness', 'customPctA', 'savingsPct', 'monthlyOverride', 'dailyMin', 'dailyMax'],
]

export function initialValues(today: string): OnboardingValues {
  const j = defaultJourney(today)
  return {
    name: j.name, startDate: today, months: 12,
    aName: j.members.a.name, aAvatar: j.members.a.avatar, aIncome: j.members.a.income,
    bName: j.members.b.name, bAvatar: j.members.b.avatar, bIncome: j.members.b.income,
    goal: j.goal, fairness: 'proportional', customPctA: 50, savingsPct: 0, monthlyOverride: 0, dailyMin: j.dailyMin, dailyMax: 0,
  }
}

export function valuesToJourney(v: OnboardingValues, base: Journey, setupDone: boolean): Journey {
  const today = v.startDate
  return {
    ...base,
    id: base.id,
    name: v.name.trim(), startDate: v.startDate, months: v.months, endDate: addMonths(v.startDate, v.months),
    goal: v.goal, fairness: v.fairness as FairnessMode, customPctA: v.customPctA,
    savingsPct: v.savingsPct > 0 ? v.savingsPct : null,
    monthlyBudgetOverride: v.monthlyOverride > 0 ? v.monthlyOverride : null,
    dailyMin: v.dailyMin, dailyMax: v.dailyMax > 0 ? v.dailyMax : null,
    members: {
      a: { ...base.members.a, name: v.aName.trim(), avatar: v.aAvatar, income: v.aIncome, joinedAt: today },
      b: { ...base.members.b, name: v.bName.trim(), avatar: v.bAvatar, income: v.bIncome, joinedAt: today },
    },
    pig: { ...base.pig, name: base.pig.name || v.name.trim() },
    setupDone,
  }
}

export function journeyToValues(j: Journey): OnboardingValues {
  return {
    name: j.name, startDate: j.startDate, months: j.months,
    aName: j.members.a.name, aAvatar: j.members.a.avatar, aIncome: j.members.a.income,
    bName: j.members.b.name, bAvatar: j.members.b.avatar, bIncome: j.members.b.income,
    goal: j.goal, fairness: j.fairness, customPctA: j.customPctA,
    savingsPct: j.savingsPct ?? 0, monthlyOverride: j.monthlyBudgetOverride ?? 0, dailyMin: j.dailyMin, dailyMax: j.dailyMax ?? 0,
  }
}
