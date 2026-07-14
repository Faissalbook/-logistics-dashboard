import { useEffect, useRef } from 'react'
import { X, Loader2, Inbox } from 'lucide-react'
import { useI18n } from '../store/uiStore'

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />
}

export function LoadingScreen() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-neutral-500">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{t('common.loading')}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center animate-fade-up">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-neutral-400 dark:bg-white/10">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={ref}
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 animate-scale-in sm:rounded-card ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, danger = true }) {
  const { t } = useI18n()
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel || t('common.confirm')}
        </button>
      </div>
    </Modal>
  )
}

/**
 * Progress bar per dataviz meter spec: the unfilled track is a lighter step
 * of the fill's own hue. Width is always clamped to [0, 100] upstream.
 */
export function ProgressBar({ value, colorClass, trackClass, over = false }) {
  const width = Math.min(Math.max(value, 0), 100)
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full ${over ? 'bg-danger/15 dark:bg-danger-dark/20' : trackClass}`}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${over ? 'bg-danger dark:bg-danger-dark' : colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
