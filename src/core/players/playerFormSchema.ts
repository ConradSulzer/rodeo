import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`)

const optionalString = z
  .union([z.string(), z.undefined()])
  .transform((value) => (typeof value === 'string' ? value.trim() : ''))

export const playerFormSchema = z.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
  displayName: requiredString('Display name'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email({ message: 'Enter a valid email' })),
  cellPhone: optionalString,
  emergencyContact: optionalString
})

export type PlayerFormInput = z.input<typeof playerFormSchema>
export type PlayerFormData = z.output<typeof playerFormSchema>
