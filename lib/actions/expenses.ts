'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface ExpenseInput {
  amount: number
  category: string
  description?: string
  receiptImage?: string
}

// Expense categories are defined in the client component
// since server actions can only export async functions

// Create a new expense
export async function createExpense(data: ExpenseInput) {
  // Get active shift
  const activeShift = await prisma.shift.findFirst({
    where: { status: 'active' },
  })

  const expense = await prisma.expense.create({
    data: {
      userId: 1,
      shiftId: activeShift?.id,
      amount: data.amount,
      category: data.category,
      description: data.description,
      receiptImage: data.receiptImage,
    },
  })

  // Update daily summary
  const today = new Date().toISOString().split('T')[0]
  await updateDailySummaryAfterExpense(today)

  revalidatePath('/expenses')
  revalidatePath('/shift')

  return expense
}

// Get today's expenses
export async function getTodayExpenses() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: { expenseDate: 'desc' },
  })
}

// Get expenses by date
export async function getExpensesByDate(date: string) {
  const startOfDay = new Date(date)
  const endOfDay = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)

  return prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    orderBy: { expenseDate: 'desc' },
  })
}

// Get expenses by date range
export async function getExpensesByDateRange(startDate: string, endDate: string) {
  return prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      },
    },
    orderBy: { expenseDate: 'desc' },
  })
}

// Get expenses by category
export async function getExpensesByCategory(category: string) {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return prisma.expense.findMany({
    where: {
      category,
      expenseDate: {
        gte: firstDayOfMonth,
      },
    },
    orderBy: { expenseDate: 'desc' },
  })
}

// Delete expense
export async function deleteExpense(id: number) {
  const expense = await prisma.expense.findUnique({ where: { id } })

  if (!expense) {
    throw new Error('Perbelanjaan tidak dijumpai')
  }

  await prisma.expense.delete({ where: { id } })

  // Update daily summary
  const expenseDate = expense.expenseDate.toISOString().split('T')[0]
  await updateDailySummaryAfterExpense(expenseDate)

  revalidatePath('/expenses')
  revalidatePath('/shift')
}

// Get expense statistics for a period
export async function getExpenseStats(startDate: string, endDate: string) {
  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      },
    },
  })

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

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
    count: expenses.length,
    byCategory,
  }
}

// Get today's expense total
export async function getTodayExpenseTotal() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  return expenses.reduce((sum, e) => sum + Number(e.amount), 0)
}

// Helper function to update daily summary after expense changes
async function updateDailySummaryAfterExpense(date: string) {
  const startOfDay = new Date(date)
  const endOfDay = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  })

  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  })

  const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const cashPayments = transactions
    .filter(t => t.paymentMethod === 'Tunai')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const cardPayments = transactions
    .filter(t => t.paymentMethod === 'Kad')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const ewalletPayments = transactions
    .filter(t => t.paymentMethod === 'E-Wallet')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const qrPayments = transactions
    .filter(t => t.paymentMethod === 'QR Pay')
    .reduce((sum, t) => sum + Number(t.total), 0)

  await prisma.dailySummary.upsert({
    where: { summaryDate: date },
    create: {
      userId: 1,
      summaryDate: date,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      transactionCount: transactions.length,
      cashPayments,
      cardPayments,
      ewalletPayments,
      qrPayments,
    },
    update: {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      transactionCount: transactions.length,
      cashPayments,
      cardPayments,
      ewalletPayments,
      qrPayments,
    },
  })
}
