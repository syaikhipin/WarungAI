'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Get current active shift
export async function getCurrentShift() {
  return prisma.shift.findFirst({
    where: { status: 'active' },
    include: {
      transactions: true,
      expenses: true,
    },
  })
}

// Get today's shifts
export async function getTodayShifts() {
  const today = new Date().toISOString().split('T')[0]

  return prisma.shift.findMany({
    where: {
      openedAt: {
        gte: new Date(today),
        lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      transactions: true,
      expenses: true,
    },
    orderBy: { openedAt: 'desc' },
  })
}

// Open a new shift
export async function openShift(openingCash: number) {
  // Check if there's already an active shift
  const existingShift = await prisma.shift.findFirst({
    where: { status: 'active' },
  })

  if (existingShift) {
    throw new Error('There is already an active shift. Please close it first.')
  }

  const shift = await prisma.shift.create({
    data: {
      userId: 1,
      openedAt: new Date(),
      openingCash,
      status: 'active',
    },
  })

  revalidatePath('/shift')
  revalidatePath('/orders')
  
  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: shift.id,
    userId: shift.userId,
    openedAt: shift.openedAt,
    openingCash: Number(shift.openingCash), // Convert Decimal to number
    status: shift.status,
    closedAt: shift.closedAt,
    closingCash: shift.closingCash ? Number(shift.closingCash) : null,
    expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
    cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
    notes: shift.notes,
  }
}

// Close the current shift
export async function closeShift(closingCash: number, notes?: string) {
  const activeShift = await prisma.shift.findFirst({
    where: { status: 'active' },
    include: {
      transactions: true,
    },
  })

  if (!activeShift) {
    throw new Error('No active shift found.')
  }

  // Calculate totals
  const transactions = activeShift.transactions
  const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0)

  // Calculate by payment method
  const cashSales = transactions
    .filter(t => t.paymentMethod === 'Cash')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const cardSales = transactions
    .filter(t => t.paymentMethod === 'Card')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const ewalletSales = transactions
    .filter(t => t.paymentMethod === 'E-Wallet')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const qrSales = transactions
    .filter(t => t.paymentMethod === 'QR Pay')
    .reduce((sum, t) => sum + Number(t.total), 0)

  // Calculate expected cash
  const expectedCash = Number(activeShift.openingCash) + cashSales
  const cashDifference = closingCash - expectedCash

  const closedShift = await prisma.shift.update({
    where: { id: activeShift.id },
    data: {
      closedAt: new Date(),
      closingCash,
      expectedCash,
      cashDifference,
      status: 'closed',
      notes,
    },
    include: {
      transactions: true,
    },
  })

  // Update or create daily summary
  const today = new Date().toISOString().split('T')[0]
  await updateDailySummary(today)

  // Send email notification (non-blocking, fire-and-forget)
  try {
    const shiftDate = closedShift.openedAt.toISOString().split('T')[0]
    
    // Format payment method breakdown
    const byPaymentMethod = {
      cash: {
        count: transactions.filter(t => t.paymentMethod === 'Cash').length,
        total: cashSales,
      },
      card: {
        count: transactions.filter(t => t.paymentMethod === 'Card').length,
        total: cardSales,
      },
      ewallet: {
        count: transactions.filter(t => t.paymentMethod === 'E-Wallet').length,
        total: ewalletSales,
      },
      qr: {
        count: transactions.filter(t => t.paymentMethod === 'QR Pay').length,
        total: qrSales,
      },
    }

    // Format shift data for email
    const shiftData = {
      shiftNumber: 1, // You may want to track shift numbers
      date: shiftDate,
      openedAt: closedShift.openedAt.getTime(),
      closedAt: closedShift.closedAt?.getTime() || Date.now(),
      openingCash: Number(closedShift.openingCash),
      closingCash: Number(closedShift.closingCash || 0),
      totalSales,
      transactionCount: transactions.length,
      byPaymentMethod,
      notes: closedShift.notes || '',
    }

    // Format transactions for email (convert Date and Decimal fields)
    const emailTransactions = transactions.map(t => ({
      completedAt: t.transactionDate.getTime(),
      items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
      total: Number(t.total),
      paymentMethod: t.paymentMethod,
    }))

    // Send email asynchronously (don't await - fire and forget)
    // In server actions, use internal URL construction
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    fetch(`${baseUrl}/api/email/send-shift-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftData,
        transactions: emailTransactions,
      }),
    }).then((response) => {
      if (!response.ok) {
        console.error('Email API returned error:', response.status, response.statusText)
      } else {
        console.log('✅ Shift closure email sent successfully')
      }
    }).catch((error) => {
      console.error('Failed to send shift closure email:', error)
      // Don't throw - email failure shouldn't block shift closure
    })
  } catch (emailError) {
    console.error('Error preparing shift closure email:', emailError)
    // Don't throw - email failure shouldn't block shift closure
  }

  revalidatePath('/shift')
  revalidatePath('/orders')
  revalidatePath('/analytics') // Revalidate analytics to show new balance sheet

  // Note: Balance sheet is automatically available after shift close
  // It's calculated on-demand from shift transactions and expenses
  // Use getShiftBalanceSheet(shiftId) to retrieve it

  return {
    shift: closedShift,
    summary: {
      totalSales,
      cashSales,
      cardSales,
      ewalletSales,
      qrSales,
      expectedCash,
      closingCash,
      cashDifference,
      transactionCount: transactions.length,
    },
  }
}

// Get shift report data
export async function getShiftReport(shiftId: number) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      transactions: true,
      expenses: true,
    },
  })

  if (!shift) {
    throw new Error('Shift not found')
  }

  const transactions = shift.transactions
  const expenses = shift.expenses

  const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const cashSales = transactions
    .filter(t => t.paymentMethod === 'Cash')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const cardSales = transactions
    .filter(t => t.paymentMethod === 'Card')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const ewalletSales = transactions
    .filter(t => t.paymentMethod === 'E-Wallet')
    .reduce((sum, t) => sum + Number(t.total), 0)

  const qrSales = transactions
    .filter(t => t.paymentMethod === 'QR Pay')
    .reduce((sum, t) => sum + Number(t.total), 0)

  return {
    shift,
    transactions,
    expenses,
    summary: {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      cashSales,
      cardSales,
      ewalletSales,
      qrSales,
      transactionCount: transactions.length,
      openingCash: Number(shift.openingCash),
      closingCash: shift.closingCash ? Number(shift.closingCash) : null,
      expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
      cashDifference: shift.cashDifference ? Number(shift.cashDifference) : null,
    },
  }
}

// Helper function to update daily summary
async function updateDailySummary(date: string) {
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
