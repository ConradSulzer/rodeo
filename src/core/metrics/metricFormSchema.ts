import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`)

export const metricFormSchema = z.object({
  label: requiredString('Label'),
  unit: requiredString('Unit')
})

export type MetricFormInput = z.input<typeof metricFormSchema>
export type MetricFormData = z.output<typeof metricFormSchema>
