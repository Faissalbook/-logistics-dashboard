import { useNavigate } from 'react-router-dom'
import { useI18n } from '../store/uiStore'
import { useBudgetStore } from '../store/budgetStore'
import { monthKeyOf } from '../utils/dates'
import TransactionForm from '../components/TransactionForm'

export default function AddTransaction() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const addTransaction = useBudgetStore((s) => s.addTransaction)
  const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('tx.addTitle')}</h1>
      <div className="card p-5 animate-fade-up">
        <TransactionForm
          submitLabel={t('common.add')}
          onSubmit={(values) => {
            addTransaction(values)
            setSelectedMonth(monthKeyOf(values.date))
            navigate('/transactions')
          }}
        />
      </div>
    </div>
  )
}
