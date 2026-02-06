'use client'

import { useState, useTransition } from 'react'
import { Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle, Loader2, Mail, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { openShift, closeShift } from '@/lib/actions/shifts'
import { formatCurrency, formatTime, formatDateTime, formatDateWithWeekday } from '@/lib/utils'
import type { BalanceSheet } from '@/lib/types/balanceSheet'
import BalanceSheetComponent from '@/components/BalanceSheet'

interface CurrentShift {
  id: number
  openedAt: string
  openingCash: number
  transactionCount: number
  totalSales: number
  cashSales: number
}

interface ShiftRecord {
  id: number
  openedAt: string
  closedAt: string | null
  openingCash: number
  closingCash: number | null
  expectedCash: number | null
  cashDifference: number | null
  status: string
  transactionCount: number
  totalSales: number
  totalExpenses: number
  netProfit: number
  topItems: Array<{ name: string; quantity: number; revenue: number }>
  balanceSheet: BalanceSheet | null
}

interface Summary {
  totalSales: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
  cashPayments: number
  cardPayments: number
  ewalletPayments: number
  qrPayments: number
}

interface Props {
  currentShift: CurrentShift | null
  todayShifts: ShiftRecord[]
  todaySummary: Summary | null
}

export default function ShiftClient({ currentShift, todayShifts, todaySummary }: Props) {
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [isBalanceSheetDialogOpen, setIsBalanceSheetDialogOpen] = useState(false)
  const [selectedBalanceSheet, setSelectedBalanceSheet] = useState<BalanceSheet | null>(null)
  const [isPending, startTransition] = useTransition()
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [activeShift, setActiveShift] = useState<CurrentShift | null>(currentShift)

  const expectedCash = activeShift
    ? activeShift.openingCash + activeShift.cashSales
    : 0

  const cashDifference = closingCash
    ? parseFloat(closingCash) - expectedCash
    : 0

  const handleOpenShift = () => {
    if (!openingCash || parseFloat(openingCash) < 0) {
      alert('Please enter a valid opening cash amount')
      return
    }

    startTransition(async () => {
      try {
        const shift = await openShift(parseFloat(openingCash))
        setActiveShift({
          id: shift.id,
          openedAt: shift.openedAt.toISOString(),
          openingCash: parseFloat(openingCash),
          transactionCount: 0,
          totalSales: 0,
          cashSales: 0,
        })
        setIsOpenDialogOpen(false)
        setOpeningCash('')
      } catch (error) {
        console.error('Error opening shift:', error)
        alert(error instanceof Error ? error.message : 'Error opening shift')
      }
    })
  }

  const handleCloseShift = () => {
    if (!closingCash || parseFloat(closingCash) < 0) {
      alert('Please enter the actual cash amount')
      return
    }

    startTransition(async () => {
      try {
        await closeShift(parseFloat(closingCash), notes || undefined)
        setActiveShift(null)
        setIsCloseDialogOpen(false)
        setClosingCash('')
        setNotes('')
        // Reload page to get updated data
        window.location.reload()
      } catch (error) {
        console.error('Error closing shift:', error)
        alert(error instanceof Error ? error.message : 'Error closing shift')
      }
    })
  }

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) return 'text-green-600'
    if (Math.abs(diff) <= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifferenceIcon = (diff: number) => {
    if (diff === 0) return <CheckCircle className="w-5 h-5 text-green-600" />
    return <AlertCircle className="w-5 h-5 text-yellow-600" />
  }

  const handleViewBalanceSheet = (balanceSheet: BalanceSheet | null) => {
    if (balanceSheet) {
      setSelectedBalanceSheet(balanceSheet)
      setIsBalanceSheetDialogOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Management</p>
            <h1 className="text-2xl font-bold text-slate-900">Shift</h1>
          </div>
          {activeShift ? (
            <Badge variant="success" className="px-3 py-1.5">
              <Clock className="w-3 h-3 mr-1" />
              Active Shift
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1.5">
              No Shift
            </Badge>
          )}
        </div>

        {/* Active Shift Card */}
        {activeShift ? (
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/80">Shift Opened</p>
                  <p className="text-xl font-semibold">
                    {formatDateTime(activeShift.openedAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setIsCloseDialogOpen(true)}
                  className="bg-white text-green-600 hover:bg-white/90"
                >
                  Close Shift
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-sm text-white/80">Opening Cash</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(activeShift.openingCash)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/80">Transactions</p>
                  <p className="text-xl font-bold">{activeShift.transactionCount}</p>
                </div>
                <div>
                  <p className="text-sm text-white/80">Sales</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(activeShift.totalSales)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                No Active Shift
              </h2>
              <p className="text-slate-500 mb-6">
                Open a shift to start receiving orders
              </p>
              <Button size="lg" onClick={() => setIsOpenDialogOpen(true)}>
                <Clock className="w-4 h-4 mr-2" />
                Open Shift
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Summary */}
        {todaySummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Sales</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(todaySummary.totalSales)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Profit</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(todaySummary.netProfit)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <span className="text-sm">Transactions</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {todaySummary.transactionCount}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <span className="text-sm">Expenses</span>
              </div>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(todaySummary.totalExpenses)}
              </p>
            </Card>
          </div>
        )}

        {/* Payment Breakdown */}
        {todaySummary && todaySummary.totalSales > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Cash', amount: todaySummary.cashPayments },
                  { label: 'Card', amount: todaySummary.cardPayments },
                  { label: 'E-Wallet', amount: todaySummary.ewalletPayments },
                  { label: 'QR Pay', amount: todaySummary.qrPayments },
                ].map(({ label, amount }) => {
                  const percentage = (amount / todaySummary.totalSales) * 100
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-medium">
                          {formatCurrency(amount)} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Shifts */}
        {todayShifts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Today's Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayShifts
                  .filter(s => s.status === 'closed')
                  .map(shift => (
                    <div
                      key={shift.id}
                      className="p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {formatDateWithWeekday(shift.closedAt!)} - {formatTime(shift.openedAt)} - {formatTime(shift.closedAt!)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {shift.transactionCount} transactions
                          </p>
                          {shift.topItems && shift.topItems.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <p className="text-xs font-medium text-slate-700 mb-1">Top Items:</p>
                              <div className="flex flex-wrap gap-2">
                                {shift.topItems.map((item, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                  >
                                    <span className="font-semibold">#{index + 1}</span>
                                    <span>{item.name}</span>
                                    <span className="text-blue-600">({item.quantity}x)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(shift.totalSales)}
                          </p>
                          {shift.netProfit !== undefined && shift.netProfit !== null && (
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <span
                                className={`text-sm font-medium ${
                                  shift.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {shift.netProfit >= 0 ? '+' : ''}
                                {formatCurrency(shift.netProfit)}
                              </span>
                            </div>
                          )}
                          {shift.cashDifference !== null && (
                            <div className="flex items-center gap-1 justify-end mt-1">
                              {getDifferenceIcon(shift.cashDifference)}
                              <span
                                className={`text-sm font-medium ${getDifferenceColor(
                                  shift.cashDifference
                                )}`}
                              >
                                {shift.cashDifference >= 0 ? '+' : ''}
                                {formatCurrency(shift.cashDifference)}
                              </span>
                            </div>
                          )}
                          {shift.balanceSheet && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 gap-2"
                              onClick={() => handleViewBalanceSheet(shift.balanceSheet)}
                            >
                              <FileText className="w-4 h-4" />
                              View Financial Statement
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Open Shift Dialog */}
        <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open Shift</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openingCash">Opening Cash</Label>
                <Input
                  id="openingCash"
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                />
                <p className="text-xs text-slate-500">
                  Enter the amount of cash in the drawer at the start of the shift
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenShift} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Open Shift'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Shift Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Close Shift</DialogTitle>
            </DialogHeader>

            {activeShift && (
              <div className="space-y-4">
                {/* Shift Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Opening Cash</span>
                    <span className="font-medium">
                      {formatCurrency(activeShift.openingCash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash Sales</span>
                    <span className="font-medium">
                      {formatCurrency(activeShift.cashSales)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Expected Cash</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(expectedCash)}
                    </span>
                  </div>
                </div>

                {/* Closing Cash Input */}
                <div className="space-y-2">
                  <Label htmlFor="closingCash">Actual Cash</Label>
                  <Input
                    id="closingCash"
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={e => setClosingCash(e.target.value)}
                    placeholder="0.00"
                    className="text-lg"
                  />
                </div>

                {/* Difference Display */}
                {closingCash && (
                  <div
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      cashDifference === 0
                        ? 'bg-green-50'
                        : Math.abs(cashDifference) <= 5
                          ? 'bg-yellow-50'
                          : 'bg-red-50'
                    }`}
                  >
                    <span className="font-medium">Difference</span>
                    <div className="flex items-center gap-2">
                      {getDifferenceIcon(cashDifference)}
                      <span className={`font-bold ${getDifferenceColor(cashDifference)}`}>
                        {cashDifference >= 0 ? '+' : ''}
                        {formatCurrency(cashDifference)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any notes for this shift..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCloseShift} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close Shift
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Balance Sheet Dialog */}
        <Dialog open={isBalanceSheetDialogOpen} onOpenChange={setIsBalanceSheetDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shift Financial Position</DialogTitle>
            </DialogHeader>
            {selectedBalanceSheet && (
              <BalanceSheetComponent
                balanceSheet={selectedBalanceSheet}
                showExportButtons={true}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBalanceSheetDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
