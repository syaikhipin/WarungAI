import { getRecentTransactions } from '@/lib/actions/transactions'
import { getRecentSummaries } from '@/lib/actions/dailySummaries'
import HistoryClient from './HistoryClient'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const [transactions, summaries] = await Promise.all([
    getRecentTransactions(100),
    getRecentSummaries(30),
  ])

  // Transform for client
  const transactionItems = transactions.map(t => ({
    id: t.id,
    items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
    total: Number(t.total),
    paymentMethod: t.paymentMethod,
    transactionDate: t.transactionDate.toISOString(),
  }))

  const summaryItems = summaries.map(s => ({
    summaryDate: s.summaryDate,
    totalSales: Number(s.totalSales),
    totalExpenses: Number(s.totalExpenses),
    netProfit: Number(s.netProfit),
    transactionCount: s.transactionCount,
  }))

  return (
    <HistoryClient
      transactions={transactionItems}
      summaries={summaryItems}
    />
  )
}
