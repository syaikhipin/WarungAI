'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface OrderItem {
  item_id?: number
  name: string
  price: number
  quantity: number
}

export interface CreateTransactionInput {
  items: OrderItem[]
  subtotal: number
  tax?: number
  total: number
  paymentMethod: 'Cash' | 'Card' | 'E-Wallet' | 'QR Pay'
  paymentReceived?: number
  changeGiven?: number
  notes?: string
}

// Create a new transaction
export async function createTransaction(data: CreateTransactionInput) {
  // Get active shift
  const activeShift = await prisma.shift.findFirst({
    where: { status: 'active' },
  })

  const transaction = await prisma.transaction.create({
    data: {
      userId: 1,
      shiftId: activeShift?.id,
      items: JSON.stringify(data.items),
      subtotal: data.subtotal,
      tax: data.tax || 0,
      total: data.total,
      paymentMethod: data.paymentMethod,
      paymentReceived: data.paymentReceived,
      changeGiven: data.changeGiven,
      notes: data.notes,
    },
  })

  // Update daily summary
  const today = new Date().toISOString().split('T')[0]
  await updateDailySummaryAfterTransaction(today)

  revalidatePath('/orders')
  revalidatePath('/shift')
  revalidatePath('/history')

  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: transaction.id,
    userId: transaction.userId,
    shiftId: transaction.shiftId,
    items: transaction.items,
    subtotal: Number(transaction.subtotal), // Convert Decimal to number
    tax: Number(transaction.tax), // Convert Decimal to number
    total: Number(transaction.total), // Convert Decimal to number
    paymentMethod: transaction.paymentMethod,
    paymentReceived: transaction.paymentReceived ? Number(transaction.paymentReceived) : null, // Convert Decimal to number
    changeGiven: transaction.changeGiven ? Number(transaction.changeGiven) : null, // Convert Decimal to number
    transactionDate: transaction.transactionDate.toISOString(),
    notes: transaction.notes,
  }
}

// Get today's transactions
export async function getTodayTransactions() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: { transactionDate: 'desc' },
  })
}

// Get recent transactions
export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    take: limit,
    orderBy: { transactionDate: 'desc' },
  })
}

// Get transactions by date range
export async function getTransactionsByDateRange(startDate: string, endDate: string) {
  return prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      },
    },
    orderBy: { transactionDate: 'desc' },
  })
}

// Get transactions for a specific shift
export async function getTransactionsByShift(shiftId: number) {
  return prisma.transaction.findMany({
    where: { shiftId },
    orderBy: { transactionDate: 'desc' },
  })
}

// Get transaction by ID
export async function getTransaction(id: number) {
  return prisma.transaction.findUnique({
    where: { id },
  })
}

// Get transactions count and total for today
export async function getTodayStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const transactionCount = transactions.length

  // Group by payment method
  const byPaymentMethod = {
    Cash: 0,
    Card: 0,
    'E-Wallet': 0,
    'QR Pay': 0,
  }

  transactions.forEach(t => {
    const method = t.paymentMethod as keyof typeof byPaymentMethod
    if (byPaymentMethod[method] !== undefined) {
      byPaymentMethod[method] += Number(t.total)
    }
  })

  return {
    totalSales,
    transactionCount,
    byPaymentMethod,
  }
}

// Helper function to update daily summary after a transaction
async function updateDailySummaryAfterTransaction(date: string) {
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
    .filter(t => t.paymentMethod === 'Cash')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const cardPayments = transactions
    .filter(t => t.paymentMethod === 'Card')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const ewalletPayments = transactions
    .filter(t => t.paymentMethod === 'E-Wallet')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const qrPayments = transactions
    .filter(t => t.paymentMethod === 'QR Pay')
    .reduce((sum, t) => sum + Number(t.total), 0)

  // Calculate top selling items
  const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {}
  transactions.forEach(t => {
    const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items
    items.forEach((item: OrderItem) => {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { name: item.name, quantity: 0, revenue: 0 }
      }
      itemCounts[item.name].quantity += item.quantity
      itemCounts[item.name].revenue += item.price * item.quantity
    })
  })

  const topSellingItems = Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

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
      topSellingItems: JSON.stringify(topSellingItems),
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
      topSellingItems: JSON.stringify(topSellingItems),
    },
  })
}
