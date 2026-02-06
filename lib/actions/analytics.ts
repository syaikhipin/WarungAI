'use server'

import prisma from '@/lib/prisma'

export interface MenuItemSale {
  name: string
  quantity: number
  revenue: number
  avgPrice: number
  orderCount: number
}

export interface HourlyData {
  hour: number
  count: number
  sales: number
}

export interface TimeBlockData {
  block: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
  count: number
  sales: number
}

export interface BusyHoursResult {
  hourly: HourlyData[]
  timeBlocks: TimeBlockData[]
}

export interface TrendData {
  period: string
  sales: number
  transactions: number
  avgOrderValue: number
}

// Get menu item sales analysis for a date range
export async function getMenuItemSales(startDate: string, endDate: string): Promise<MenuItemSale[]> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
  })

  // Aggregate items from all transactions
  const itemMap = new Map<string, { quantity: number; revenue: number; orderCount: number }>()

  transactions.forEach(transaction => {
    const items = typeof transaction.items === 'string' 
      ? JSON.parse(transaction.items) 
      : transaction.items

    items.forEach((item: { name: string; quantity: number; price: number }) => {
      const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0, orderCount: 0 }
      itemMap.set(item.name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.price * item.quantity),
        orderCount: existing.orderCount + 1,
      })
    })
  })

  // Convert to array
  const result: MenuItemSale[] = Array.from(itemMap.entries()).map(([name, data]) => ({
    name,
    quantity: data.quantity,
    revenue: data.revenue,
    avgPrice: data.revenue / data.quantity,
    orderCount: data.orderCount,
  }))

  // Sort by revenue descending
  return result.sort((a, b) => b.revenue - a.revenue)
}

// Get busy hours analysis
export async function getBusyHours(startDate: string, endDate: string): Promise<BusyHoursResult> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  // Fetch only needed fields for performance
  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      transactionDate: true,
      total: true,
    },
  })

  // Initialize hourly arrays (0-23)
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    sales: 0,
  }))

  // Initialize time blocks
  const timeBlocks: Record<string, TimeBlockData> = {
    Morning: { block: 'Morning', count: 0, sales: 0 },
    Afternoon: { block: 'Afternoon', count: 0, sales: 0 },
    Evening: { block: 'Evening', count: 0, sales: 0 },
    Night: { block: 'Night', count: 0, sales: 0 },
  }

  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate)
    const hour = date.getHours()
    const total = Number(transaction.total)

    // Update hourly data
    hourlyData[hour].count++
    hourlyData[hour].sales += total

    // Update time blocks
    if (hour >= 6 && hour < 12) {
      // Morning: 6 AM - 12 PM
      timeBlocks.Morning.count++
      timeBlocks.Morning.sales += total
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: 12 PM - 6 PM
      timeBlocks.Afternoon.count++
      timeBlocks.Afternoon.sales += total
    } else if (hour >= 18 && hour < 22) {
      // Evening: 6 PM - 10 PM
      timeBlocks.Evening.count++
      timeBlocks.Evening.sales += total
    } else {
      // Night: 10 PM - 6 AM
      timeBlocks.Night.count++
      timeBlocks.Night.sales += total
    }
  })

  return {
    hourly: hourlyData,
    timeBlocks: Object.values(timeBlocks),
  }
}

// Get sales trends (daily, weekly, or monthly)
export async function getSalesTrends(
  startDate: string,
  endDate: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<TrendData[]> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  if (period === 'daily') {
    // Use daily summaries if available, otherwise aggregate transactions
    const summaries = await prisma.dailySummary.findMany({
      where: {
        summaryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { summaryDate: 'asc' },
    })

    if (summaries.length > 0) {
      return summaries.map(summary => ({
        period: summary.summaryDate,
        sales: Number(summary.totalSales),
        transactions: summary.transactionCount,
        avgOrderValue: summary.transactionCount > 0
          ? Number(summary.totalSales) / summary.transactionCount
          : 0,
      }))
    }

    // Fallback: aggregate from transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const dailyMap = new Map<string, { sales: number; count: number }>()

    transactions.forEach(t => {
      const dateStr = t.transactionDate.toISOString().split('T')[0]
      const existing = dailyMap.get(dateStr) || { sales: 0, count: 0 }
      dailyMap.set(dateStr, {
        sales: existing.sales + Number(t.total),
        count: existing.count + 1,
      })
    })

    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        sales: data.sales,
        transactions: data.count,
        avgOrderValue: data.count > 0 ? data.sales / data.count : 0,
      }))
  }

  // For weekly and monthly, aggregate from transactions using select for performance
  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      transactionDate: true,
      total: true,
    },
  })

  const periodMap = new Map<string, { sales: number; count: number }>()

  transactions.forEach(t => {
    const date = new Date(t.transactionDate)
    let periodKey: string

    if (period === 'weekly') {
      // Get week start date (Monday)
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      weekStart.setDate(diff)
      periodKey = weekStart.toISOString().split('T')[0]
    } else {
      // Monthly: YYYY-MM format
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    const existing = periodMap.get(periodKey) || { sales: 0, count: 0 }
    periodMap.set(periodKey, {
      sales: existing.sales + Number(t.total),
      count: existing.count + 1,
    })
  })

  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      sales: data.sales,
      transactions: data.count,
      avgOrderValue: data.count > 0 ? data.sales / data.count : 0,
    }))
}

// Get expense category breakdown
export async function getExpenseCategoryBreakdown(startDate: string, endDate: string) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  // Use aggregation for total, but need individual records for category grouping
  const [expenseStats, expenses] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    }),
  ])

  const total = Number(expenseStats._sum.amount || 0)

  // Group by category
  const byCategory: Record<string, number> = {}
  expenses.forEach(e => {
    if (!byCategory[e.category]) {
      byCategory[e.category] = 0
    }
    byCategory[e.category] += Number(e.amount)
  })

  return {
    total,
    count: expenseStats._count,
    byCategory,
  }
}

// Get summary metrics for a date range
export async function getAnalyticsSummary(startDate: string, endDate: string) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  const [transactionStats, expenseStats] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        total: true,
      },
      _count: true,
    }),
    getExpenseCategoryBreakdown(startDate, endDate),
  ])

  const totalSales = Number(transactionStats._sum.total || 0)
  const transactionCount = transactionStats._count
  const avgOrderValue = transactionCount > 0 ? totalSales / transactionCount : 0

  return {
    totalSales,
    totalExpenses: expenseStats.total,
    netProfit: totalSales - expenseStats.total,
    transactionCount,
    avgOrderValue,
  }
}
