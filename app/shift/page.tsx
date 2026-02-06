import { getCurrentShift, getTodayShifts } from '@/lib/actions/shifts'
import { getTodaySummary } from '@/lib/actions/dailySummaries'
import { getMenuItems } from '@/lib/actions/menu'
import { getShiftBalanceSheet } from '@/lib/actions/balanceSheet'
import ShiftClient from './ShiftClient'

export const dynamic = 'force-dynamic'

export default async function ShiftPage() {
  const [currentShift, todayShifts, todaySummary, menuItems] = await Promise.all([
    getCurrentShift(),
    getTodayShifts(),
    getTodaySummary(),
    getMenuItems(),
  ])

  // Transform for client
  const shift = currentShift
    ? {
        id: currentShift.id,
        openedAt: currentShift.openedAt.toISOString(),
        openingCash: Number(currentShift.openingCash),
        transactionCount: currentShift.transactions.length,
        totalSales: currentShift.transactions.reduce(
          (sum, t) => sum + Number(t.total),
          0
        ),
        cashSales: currentShift.transactions
          .filter(t => t.paymentMethod === 'Tunai')
          .reduce((sum, t) => sum + Number(t.total), 0),
      }
    : null

  // Fetch balance sheets for closed shifts in parallel
  const closedShifts = todayShifts.filter(s => s.status === 'closed')
  const balanceSheetsData = await Promise.all(
    closedShifts.map(shift => getShiftBalanceSheet(shift.id))
  )
  const balanceSheetsMap = new Map(
    balanceSheetsData
      .filter((bs): bs is NonNullable<typeof bs> => bs !== null)
      .map(bs => [bs.shiftId, bs])
  )

  const shifts = todayShifts.map(s => {
    const totalSales = s.transactions.reduce((sum, t) => sum + Number(t.total), 0)
    const totalExpenses = s.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const netProfit = totalSales - totalExpenses
    
    // Calculate top 3 items for this shift
    const itemMap = new Map<string, { quantity: number; revenue: number }>()
    
    s.transactions.forEach(transaction => {
      const items = typeof transaction.items === 'string' 
        ? JSON.parse(transaction.items) 
        : transaction.items

      items.forEach((item: { name: string; quantity: number; price: number }) => {
        const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 }
        itemMap.set(item.name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        })
      })
    })

    // Get top 3 items by revenue
    const topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name: name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
    
    return {
      id: s.id,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() || null,
      openingCash: Number(s.openingCash),
      closingCash: s.closingCash ? Number(s.closingCash) : null,
      expectedCash: s.expectedCash ? Number(s.expectedCash) : null,
      cashDifference: s.cashDifference ? Number(s.cashDifference) : null,
      status: s.status,
      transactionCount: s.transactions.length,
      totalSales,
      totalExpenses,
      netProfit,
      topItems,
      balanceSheet: balanceSheetsMap.get(s.id) || null,
    }
  })

  const summary = todaySummary
    ? {
        totalSales: Number(todaySummary.totalSales),
        totalExpenses: Number(todaySummary.totalExpenses),
        netProfit: Number(todaySummary.netProfit),
        transactionCount: todaySummary.transactionCount,
        cashPayments: Number(todaySummary.cashPayments),
        cardPayments: Number(todaySummary.cardPayments),
        ewalletPayments: Number(todaySummary.ewalletPayments),
        qrPayments: Number(todaySummary.qrPayments),
      }
    : null

  return (
    <ShiftClient
      currentShift={shift}
      todayShifts={shifts}
      todaySummary={summary}
    />
  )
}
