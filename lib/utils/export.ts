import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BalanceSheet } from '@/lib/types/balanceSheet'
import { formatCurrency, formatDateWithWeekday, formatTime } from '@/lib/utils'

/**
 * Export balance sheet to Excel format
 */
export function exportBalanceSheetToExcel(
  balanceSheet: BalanceSheet,
  shiftInfo: { openedAt: string; closedAt: string | null }
): void {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Prepare data for balance sheet
    const balanceSheetData = [
      ['SHIFT FINANCIAL STATEMENT', ''],
      ['', ''],
      ['Shift Information', ''],
      ['Open Date', formatDateWithWeekday(shiftInfo.openedAt)],
      ['Close Date', shiftInfo.closedAt ? formatDateWithWeekday(shiftInfo.closedAt) : '-'],
      ['Open Time', formatTime(shiftInfo.openedAt)],
      ['Close Time', shiftInfo.closedAt ? formatTime(shiftInfo.closedAt) : '-'],
      ['', ''],
      ['CASH', ''],
      ['Opening Cash', balanceSheet.openingCash],
      ['Expected Cash', balanceSheet.expectedCash ?? 0],
      ['Closing Cash', balanceSheet.closingCash ?? 0],
      ['Difference', balanceSheet.cashDifference ?? 0],
      ['', ''],
      ['REVENUE', ''],
      ['Cash Sales', balanceSheet.revenue.cashSales],
      ['Card Sales', balanceSheet.revenue.cardSales],
      ['E-Wallet Sales', balanceSheet.revenue.ewalletSales],
      ['QR Pay Sales', balanceSheet.revenue.qrSales],
      ['TOTAL REVENUE', balanceSheet.revenue.totalSales],
      ['', ''],
      ['EXPENSES', ''],
    ]

    // Add expenses by category
    Object.entries(balanceSheet.expenses.byCategory).forEach(([category, amount]) => {
      balanceSheetData.push([category, amount])
    })

    balanceSheetData.push(['TOTAL EXPENSES', balanceSheet.expenses.totalExpenses])
    balanceSheetData.push(['', ''])
    balanceSheetData.push(['NET PROFIT', balanceSheet.netProfit])
    balanceSheetData.push(['', ''])
    balanceSheetData.push(['Transaction Count', balanceSheet.transactionCount])

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(balanceSheetData)

    // Set column widths
    worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Statement')

    // Generate filename
    const dateStr = shiftInfo.closedAt
      ? new Date(shiftInfo.closedAt).toISOString().split('T')[0]
      : new Date(shiftInfo.openedAt).toISOString().split('T')[0]
    const filename = `Shift_Financial_Statement_${dateStr}.xlsx`

    // Write file
    XLSX.writeFile(workbook, filename)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('Failed to export to Excel')
  }
}

/**
 * Export balance sheet to PDF format
 */
export function exportBalanceSheetToPDF(
  balanceSheet: BalanceSheet,
  shiftInfo: { openedAt: string; closedAt: string | null }
): void {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let yPos = margin

    // Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('SHIFT FINANCIAL STATEMENT', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    // Shift Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Shift Information', margin, yPos)
    yPos += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Open Date: ${formatDateWithWeekday(shiftInfo.openedAt)}`, margin, yPos)
    yPos += 6
    doc.text(
      `Close Date: ${shiftInfo.closedAt ? formatDateWithWeekday(shiftInfo.closedAt) : '-'}`,
      margin,
      yPos
    )
    yPos += 6
    doc.text(`Open Time: ${formatTime(shiftInfo.openedAt)}`, margin, yPos)
    yPos += 6
    doc.text(
      `Close Time: ${shiftInfo.closedAt ? formatTime(shiftInfo.closedAt) : '-'}`,
      margin,
      yPos
    )
    yPos += 10

    // Cash Section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('CASH', margin, yPos)
    yPos += 7

    const cashData = [
      ['Opening Cash', formatCurrency(balanceSheet.openingCash)],
      ['Expected Cash', formatCurrency(balanceSheet.expectedCash ?? 0)],
      ['Closing Cash', formatCurrency(balanceSheet.closingCash ?? 0)],
      ['Difference', formatCurrency(balanceSheet.cashDifference ?? 0)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: cashData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // Revenue Section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('REVENUE', margin, yPos)
    yPos += 7

    const revenueData = [
      ['Cash Sales', formatCurrency(balanceSheet.revenue.cashSales)],
      ['Card Sales', formatCurrency(balanceSheet.revenue.cardSales)],
      ['E-Wallet Sales', formatCurrency(balanceSheet.revenue.ewalletSales)],
      ['QR Pay Sales', formatCurrency(balanceSheet.revenue.qrSales)],
      ['TOTAL REVENUE', formatCurrency(balanceSheet.revenue.totalSales)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: revenueData,
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin },
      foot: [['TOTAL REVENUE', formatCurrency(balanceSheet.revenue.totalSales)]],
      footStyles: { fillColor: [40, 167, 69], fontStyle: 'bold' },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // Expenses Section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('EXPENSES', margin, yPos)
    yPos += 7

    const expenseRows = Object.entries(balanceSheet.expenses.byCategory).map(([category, amount]) => [
      category,
      formatCurrency(amount),
    ])

    const expenseData = [
      ...expenseRows,
      ['TOTAL EXPENSES', formatCurrency(balanceSheet.expenses.totalExpenses)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin },
      foot: [['TOTAL EXPENSES', formatCurrency(balanceSheet.expenses.totalExpenses)]],
      footStyles: { fillColor: [220, 53, 69], fontStyle: 'bold' },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // Summary Section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('SUMMARY', margin, yPos)
    yPos += 7

    const summaryData = [
      ['Net Profit', formatCurrency(balanceSheet.netProfit)],
      ['Transaction Count', balanceSheet.transactionCount.toString()],
    ]

    autoTable(doc, {
      startY: yPos,
      body: summaryData,
      theme: 'striped',
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin },
    })

    // Generate filename
    const dateStr = shiftInfo.closedAt
      ? new Date(shiftInfo.closedAt).toISOString().split('T')[0]
      : new Date(shiftInfo.openedAt).toISOString().split('T')[0]
    const filename = `Shift_Financial_Statement_${dateStr}.pdf`

    // Save PDF
    doc.save(filename)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export to PDF')
  }
}
