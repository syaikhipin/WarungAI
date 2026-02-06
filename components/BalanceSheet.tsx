'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateWithWeekday, formatTime } from '@/lib/utils'
import type { BalanceSheet } from '@/lib/types/balanceSheet'
import { exportBalanceSheetToExcel, exportBalanceSheetToPDF } from '@/lib/utils/export'

interface BalanceSheetProps {
  balanceSheet: BalanceSheet
  showExportButtons?: boolean
}

export default function BalanceSheetComponent({
  balanceSheet,
  showExportButtons = true,
}: BalanceSheetProps) {
  const handleExportExcel = () => {
    try {
      exportBalanceSheetToExcel(balanceSheet, balanceSheet.shiftInfo)
    } catch (error) {
      alert('Failed to export to Excel. Please try again.')
      console.error('Excel export error:', error)
    }
  }

  const handleExportPDF = () => {
    try {
      exportBalanceSheetToPDF(balanceSheet, balanceSheet.shiftInfo)
    } catch (error) {
      alert('Failed to export to PDF. Please try again.')
      console.error('PDF export error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Shift Financial Position</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {balanceSheet.shiftInfo.closedAt
                ? formatDateWithWeekday(balanceSheet.shiftInfo.closedAt)
                : formatDateWithWeekday(balanceSheet.shiftInfo.openedAt)}
            </p>
          </div>
          {showExportButtons && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Revenue and Expenses */}
          <div className="space-y-6">
            {/* Shift Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Shift Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Open Date:</span>
                  <span className="font-medium">
                    {formatDateWithWeekday(balanceSheet.shiftInfo.openedAt)}
                  </span>
                </div>
                {balanceSheet.shiftInfo.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Close Date:</span>
                    <span className="font-medium">
                      {formatDateWithWeekday(balanceSheet.shiftInfo.closedAt)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Open Time:</span>
                  <span className="font-medium">
                    {formatTime(balanceSheet.shiftInfo.openedAt)}
                  </span>
                </div>
                {balanceSheet.shiftInfo.closedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Close Time:</span>
                    <span className="font-medium">
                      {formatTime(balanceSheet.shiftInfo.closedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cash Section */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Cash</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Cash:</span>
                  <span className="font-medium">
                    {formatCurrency(balanceSheet.openingCash)}
                  </span>
                </div>
                {balanceSheet.expectedCash !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expected Cash:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(balanceSheet.expectedCash)}
                    </span>
                  </div>
                )}
                {balanceSheet.closingCash !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Closing Cash:</span>
                    <span className="font-medium">
                      {formatCurrency(balanceSheet.closingCash)}
                    </span>
                  </div>
                )}
                {balanceSheet.cashDifference !== null && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Difference:</span>
                    <span
                      className={`font-bold ${
                        balanceSheet.cashDifference === 0
                          ? 'text-green-600'
                          : Math.abs(balanceSheet.cashDifference) <= 5
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {balanceSheet.cashDifference >= 0 ? '+' : ''}
                      {formatCurrency(balanceSheet.cashDifference)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-green-700 mb-3">Revenue</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cash Sales:</span>
                  <span className="font-medium">
                    {formatCurrency(balanceSheet.revenue.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Card Sales:</span>
                  <span className="font-medium">
                    {formatCurrency(balanceSheet.revenue.cardSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">E-Wallet Sales:</span>
                  <span className="font-medium">
                    {formatCurrency(balanceSheet.revenue.ewalletSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">QR Pay Sales:</span>
                  <span className="font-medium">
                    {formatCurrency(balanceSheet.revenue.qrSales)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-green-200">
                  <span className="font-semibold text-green-700">Total Revenue:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(balanceSheet.revenue.totalSales)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="font-semibold text-red-700 mb-3">Expenses</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(balanceSheet.expenses.byCategory).length > 0 ? (
                  <>
                    {Object.entries(balanceSheet.expenses.byCategory).map(([category, amount]) => (
                      <div key={category} className="flex justify-between">
                        <span className="text-slate-600">{category}:</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-red-200">
                      <span className="font-semibold text-red-700">Total Expenses:</span>
                      <span className="font-bold text-red-700">
                        {formatCurrency(balanceSheet.expenses.totalExpenses)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 italic">No expenses recorded</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Summary */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-4">Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-blue-700">Total Revenue</span>
                    <span className="text-lg font-bold text-blue-900">
                      {formatCurrency(balanceSheet.revenue.totalSales)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-blue-700">Total Expenses</span>
                    <span className="text-lg font-bold text-blue-900">
                      {formatCurrency(balanceSheet.expenses.totalExpenses)}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-blue-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-blue-900">Net Profit</span>
                    <span
                      className={`text-2xl font-bold ${
                        balanceSheet.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {balanceSheet.netProfit >= 0 ? '+' : ''}
                      {formatCurrency(balanceSheet.netProfit)}
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Transaction Count</span>
                    <span className="text-base font-semibold text-blue-900">
                      {balanceSheet.transactionCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Additional Info</h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Shift Status:</span>
                  <span className="font-medium capitalize">{balanceSheet.shiftInfo.status}</span>
                </div>
                {balanceSheet.revenue.totalSales > 0 && (
                  <div className="flex justify-between">
                    <span>Average Order:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        balanceSheet.revenue.totalSales / balanceSheet.transactionCount
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
