import { 
  getMenuItemSales, 
  getBusyHours, 
  getSalesTrends, 
  getExpenseCategoryBreakdown,
  getAnalyticsSummary 
} from '@/lib/actions/analytics'
import { getAllShiftsBalanceSheets } from '@/lib/actions/balanceSheet'
import AnalyticsClient from './AnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; period?: string }>
}) {
  const params = await searchParams

  // Default to last 7 days if no dates provided
  const today = new Date()
  const defaultEndDate = today.toISOString().split('T')[0]
  const defaultStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const startDate = params.startDate || defaultStartDate
  const endDate = params.endDate || defaultEndDate
  const period = (params.period as 'daily' | 'weekly' | 'monthly') || 'daily'

  // Fetch all analytics data in parallel
  const [menuItemSales, busyHours, salesTrends, expenseBreakdown, summary, balanceSheets] = await Promise.all([
    getMenuItemSales(startDate, endDate),
    getBusyHours(startDate, endDate),
    getSalesTrends(startDate, endDate, period),
    getExpenseCategoryBreakdown(startDate, endDate),
    getAnalyticsSummary(startDate, endDate),
    getAllShiftsBalanceSheets(startDate, endDate),
  ])

  return (
    <AnalyticsClient
      menuItemSales={menuItemSales}
      busyHours={busyHours}
      salesTrends={salesTrends}
      expenseBreakdown={expenseBreakdown}
      summary={summary}
      balanceSheets={balanceSheets}
      defaultStartDate={startDate}
      defaultEndDate={endDate}
      defaultPeriod={period}
    />
  )
}
