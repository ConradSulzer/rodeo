import { toast } from 'sonner'

type ToastMessage = Parameters<typeof toast>[0]
type ToastOptions = Parameters<typeof toast>[1]
type ToastVariant = 'success' | 'info' | 'warning' | 'error' | 'loading'
type ToastWithVariants = typeof toast & Record<ToastVariant, typeof toast>

const SHORT_DURATION = 800
const MEDIUM_DURATION = 2000

function showToastWithDuration(
  duration: number,
  message: ToastMessage,
  options?: ToastOptions,
  variant: ToastVariant | 'default' = 'default'
) {
  if (variant === 'default') {
    return toast(message, { ...options, duration })
  }
  const fn = (toast as ToastWithVariants)[variant]
  return fn(message, { ...options, duration })
}

export function toastShort(message: ToastMessage, options?: ToastOptions) {
  return showToastWithDuration(SHORT_DURATION, message, options)
}

export function toastShortSuccess(message: ToastMessage, options?: ToastOptions) {
  return showToastWithDuration(SHORT_DURATION, message, options, 'success')
}

export function toastMedium(message: ToastMessage, options?: ToastOptions) {
  return showToastWithDuration(MEDIUM_DURATION, message, options)
}

export function toastMediumSuccess(message: ToastMessage, options?: ToastOptions) {
  return showToastWithDuration(MEDIUM_DURATION, message, options, 'success')
}
