'use server'

import prisma from '@/lib/prisma'
import type { BalanceSheet } from '@/lib/types/balanceSheet'

/**
 * Get balance sheet data for a specific shift
 */
export async function getShiftBalanceSheet(shiftId: number): Promise<BalanceSheet | null> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      transactions: true,
      expenses: true,
    },
  })

  if (!shift) {
    return null
  }

  // Calculate revenue by payment method using aggregations for performance
  const [transactionStats, expenseStats] = await Promise.all([
    prisma.transaction.aggregate({
      where: { shiftId },
      _sum: {
        total: true,
      },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { shiftId },
      _sum: {
        amount: true,
      },
    }),
  ])

  // Get payment method breakdowns using aggregations
  const [cashSalesResult, cardSalesResult, ewalletSalesResult, qrSalesResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        shiftId,
        paymentMethod: 'Tunai',
      },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: {
        shiftId,
        paymentMethod: 'Kad',
      },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: {
        shiftId,
        paymentMethod: 'E-Wallet',
      },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: {
        shiftId,
        paymentMethod: 'QR Pay',
      },
      _sum: { total: true },
    }),
  ])

  const cashSales = Number(cashSalesResult._sum.total || 0)
  const cardSales = Number(cardSalesResult._sum.total || 0)
  const ewalletSales = Number(ewalletSalesResult._sum.total || 0)
  const qrSales = Number(qrSalesResult._sum.total || 0)
  const totalSales = Number(transactionStats._sum.total || 0)
  const totalExpenses = Number(expenseStats._sum.amount || 0)
  const transactionCount = transactionStats._count

  // Calculate expenses by category
  const expensesByCategory: Record<string, number> = {}
  const expenses = shift.expenses

  expenses.forEach(expense => {
    const category = expense.category
    const amount = Number(expense.amount)
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0
    }
    expensesByCategory[category] += amount
  })

  // Calculate financial metrics
  const openingCash = Number(shift.openingCash)
  const closingCash = shift.closingCash ? Number(shift.closingCash) : null
  const expectedCash = shift.expectedCash ? Number(shift.expectedCash) : null
  const cashDifference = shift.cashDifference ? Number(shift.cashDifference) : null
  const netProfit = totalSales - totalExpenses

  return {
    shiftId: shift.id,
    shiftInfo: {
      openedAt: shift.openedAt.toISOString(),
      closedAt: shift.closedAt?.toISOString() || null,
      status: shift.status,
    },
    openingCash,
    revenue: {
      cashSales,
      cardSales,
      ewalletSales,
      qrSales,
      totalSales,
    },
    expenses: {
      byCategory: expensesByCategory,
      totalExpenses,
    },
    closingCash,
    expectedCash,
    cashDifference,
    netProfit,
    transactionCount,
  }
}

/**
 * Get balance sheets for all shifts in a date range
 */
export async function getAllShiftsBalanceSheets(
  startDate: string,
  endDate: string
): Promise<BalanceSheet[]> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T23:59:59')

  // Get all closed shifts in the date range
  const shifts = await prisma.shift.findMany({
    where: {
      status: 'closed',
      closedAt: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { closedAt: 'desc' },
    select: {
      id: true,
    },
  })

  // Fetch balance sheet for each shift in parallel
  const balanceSheets = await Promise.all(
    shifts.map(shift => getShiftBalanceSheet(shift.id))
  )

  // Filter out null values (shouldn't happen, but TypeScript safety)
  return balanceSheets.filter((bs): bs is BalanceSheet => bs !== null)
}
