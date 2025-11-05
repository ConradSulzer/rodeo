import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`)

// helper: validate & format to "(###) ###-####" or "###-####"
function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) {
    // (225) 123-4567
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 7) {
    // 123-4567 (no area code)
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  // Will be caught and returned in z.transform()
  throw new Error('Phone number must have 7 or 10 digits')
}

// optional but validated if present
const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim() ?? ''
    if (!trimmed) return undefined
    try {
      return formatUSPhone(trimmed)
    } catch {
      return trimmed
    }
  })
  .refine(
    (v) => {
      if (!v) return true // allow undefined
      const digits = v.replace(/\D/g, '')
      return digits.length === 7 || digits.length === 10
    },
    { message: 'Phone number must have 7 or 10 digits' }
  )
  .transform((v) => (v ? formatUSPhone(v) : undefined))

export const playerFormSchema = z.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
  displayName: requiredString('Display name'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email({ message: 'Enter a valid email' })),
  cellPhone: optionalPhone,
  emergencyContact: optionalPhone
})

export type PlayerFormInput = z.input<typeof playerFormSchema>
export type PlayerFormData = z.output<typeof playerFormSchema>
