import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { formatMonth, shiftMonth, currentMonthKey } from '../utils/dates'

export default function MonthSelector({ month, onChange }) {
  const { locale, isRTL } = useI18n()
  const isCurrent = month === currentMonthKey()
  const Prev = isRTL ? ChevronRight : ChevronLeft
  const Next = isRTL ? ChevronLeft : ChevronRight

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-surface-light p-1 dark:border-white/10 dark:bg-surface-dark">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Previous month"
      >
        <Prev className="h-4 w-4" />
      </button>
      <button
        onClick={() => !isCurrent && onChange(currentMonthKey())}
        className={`min-w-[9rem] px-2 text-center text-sm font-semibold capitalize ${
          isCurrent ? 'cursor-default' : 'cursor-pointer hover:text-needs dark:hover:text-needs-dark'
        }`}
        title={isCurrent ? undefined : 'Jump to current month'}
      >
        {formatMonth(month, locale)}
      </button>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Next month"
      >
        <Next className="h-4 w-4" />
      </button>
    </div>
  )
}
