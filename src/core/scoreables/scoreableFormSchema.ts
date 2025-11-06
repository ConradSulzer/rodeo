import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`)

export const scoreableFormSchema = z.object({
  label: requiredString('Label'),
  unit: requiredString('Unit')
})

export type ScoreableFormInput = z.input<typeof scoreableFormSchema>
export type ScoreableFormData = z.output<typeof scoreableFormSchema>
