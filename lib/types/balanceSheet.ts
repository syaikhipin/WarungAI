// Balance Sheet Type Definitions

export interface BalanceSheet {
  shiftId: number
  shiftInfo: {
    openedAt: string
    closedAt: string | null
    status: string
  }
  openingCash: number
  revenue: {
    cashSales: number
    cardSales: number
    ewalletSales: number
    qrSales: number
    totalSales: number
  }
  expenses: {
    byCategory: Record<string, number>
    totalExpenses: number
  }
  closingCash: number | null
  expectedCash: number | null
  cashDifference: number | null
  netProfit: number
  transactionCount: number
}

export interface BalanceSheetExportOptions {
  shiftId: number
  shiftInfo: {
    openedAt: string
    closedAt: string | null
  }
  format: 'excel' | 'pdf'
}
