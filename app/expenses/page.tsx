import { getTodayExpenses, getTodayExpenseTotal } from '@/lib/actions/expenses'
import ExpenseClient from './ExpenseClient'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const [expenses, totalToday] = await Promise.all([
    getTodayExpenses(),
    getTodayExpenseTotal(),
  ])

  // Transform for client
  const expenseItems = expenses.map(expense => ({
    id: expense.id,
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.description,
    expenseDate: expense.expenseDate.toISOString(),
  }))

  return <ExpenseClient initialExpenses={expenseItems} totalToday={totalToday} />
}
