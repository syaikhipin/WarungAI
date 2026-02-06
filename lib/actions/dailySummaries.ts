'use server'

import prisma from '@/lib/prisma'

// Get today's summary
export async function getTodaySummary() {
  const today = new Date().toISOString().split('T')[0]
  return prisma.dailySummary.findUnique({
    where: { summaryDate: today },
  })
}

// Get summary by date
export async function getSummaryByDate(date: string) {
  return prisma.dailySummary.findUnique({
    where: { summaryDate: date },
  })
}

// Get recent summaries (last N days)
export async function getRecentSummaries(days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  return prisma.dailySummary.findMany({
    where: {
      summaryDate: {
        gte: startDateStr,
      },
    },
    orderBy: { summaryDate: 'desc' },
  })
}

// Get summaries by date range
export async function getSummariesByDateRange(startDate: string, endDate: string) {
  return prisma.dailySummary.findMany({
    where: {
      summaryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { summaryDate: 'desc' },
  })
}

// Get weekly summary (current week)
export async function getWeeklySummary() {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
  const startDateStr = startOfWeek.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const summaries = await prisma.dailySummary.findMany({
    where: {
      summaryDate: {
        gte: startDateStr,
        lte: endDateStr,
      },
    },
  })

  const totalSales = summaries.reduce((sum, s) => sum + Number(s.totalSales), 0)
  const totalExpenses = summaries.reduce((sum, s) => sum + Number(s.totalExpenses), 0)
  const transactionCount = summaries.reduce((sum, s) => sum + s.transactionCount, 0)

  const cashPayments = summaries.reduce((sum, s) => sum + Number(s.cashPayments), 0)
  const cardPayments = summaries.reduce((sum, s) => sum + Number(s.cardPayments), 0)
  const ewalletPayments = summaries.reduce((sum, s) => sum + Number(s.ewalletPayments), 0)
  const qrPayments = summaries.reduce((sum, s) => sum + Number(s.qrPayments), 0)

  return {
    period: 'This Week',
    startDate: startDateStr,
    endDate: endDateStr,
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    transactionCount,
    byPaymentMethod: {
      Cash: cashPayments,
      Card: cardPayments,
      'E-Wallet': ewalletPayments,
      'QR Pay': qrPayments,
    },
    dailySummaries: summaries,
  }
}

// Get monthly summary (current month)
export async function getMonthlySummary() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startDateStr = startOfMonth.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const summaries = await prisma.dailySummary.findMany({
    where: {
      summaryDate: {
        gte: startDateStr,
        lte: endDateStr,
      },
    },
  })

  const totalSales = summaries.reduce((sum, s) => sum + Number(s.totalSales), 0)
  const totalExpenses = summaries.reduce((sum, s) => sum + Number(s.totalExpenses), 0)
  const transactionCount = summaries.reduce((sum, s) => sum + s.transactionCount, 0)

  const cashPayments = summaries.reduce((sum, s) => sum + Number(s.cashPayments), 0)
  const cardPayments = summaries.reduce((sum, s) => sum + Number(s.cardPayments), 0)
  const ewalletPayments = summaries.reduce((sum, s) => sum + Number(s.ewalletPayments), 0)
  const qrPayments = summaries.reduce((sum, s) => sum + Number(s.qrPayments), 0)

  // Aggregate top selling items
  const allTopItems: Record<string, { name: string; quantity: number; revenue: number }> = {}
  summaries.forEach(s => {
    if (s.topSellingItems) {
      const items = typeof s.topSellingItems === 'string'
        ? JSON.parse(s.topSellingItems)
        : s.topSellingItems

      items.forEach((item: { name: string; quantity: number; revenue: number }) => {
        if (!allTopItems[item.name]) {
          allTopItems[item.name] = { name: item.name, quantity: 0, revenue: 0 }
        }
        allTopItems[item.name].quantity += item.quantity
        allTopItems[item.name].revenue += item.revenue
      })
    }
  })

  const topSellingItems = Object.values(allTopItems)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    period: 'This Month',
    startDate: startDateStr,
    endDate: endDateStr,
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    transactionCount,
    byPaymentMethod: {
      Cash: cashPayments,
      Card: cardPayments,
      'E-Wallet': ewalletPayments,
      'QR Pay': qrPayments,
    },
    topSellingItems,
    dailySummaries: summaries,
  }
}

// Get dashboard data (for main dashboard)
export async function getDashboardData(period: 'today' | 'week' | 'month' = 'today') {
  if (period === 'today') {
    const summary = await getTodaySummary()
    if (!summary) {
      return {
        period: 'Today',
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        transactionCount: 0,
        byPaymentMethod: {
          Cash: 0,
          Card: 0,
          'E-Wallet': 0,
          'QR Pay': 0,
        },
        topSellingItems: [],
      }
    }

    const topSellingItems = summary.topSellingItems
      ? (typeof summary.topSellingItems === 'string'
          ? JSON.parse(summary.topSellingItems)
          : summary.topSellingItems)
      : []

    return {
      period: 'Today',
      totalSales: Number(summary.totalSales),
      totalExpenses: Number(summary.totalExpenses),
      netProfit: Number(summary.netProfit),
      transactionCount: summary.transactionCount,
      byPaymentMethod: {
        Cash: Number(summary.cashPayments),
        Card: Number(summary.cardPayments),
        'E-Wallet': Number(summary.ewalletPayments),
        'QR Pay': Number(summary.qrPayments),
      },
      topSellingItems,
    }
  }

  if (period === 'week') {
    return getWeeklySummary()
  }

  return getMonthlySummary()
}
