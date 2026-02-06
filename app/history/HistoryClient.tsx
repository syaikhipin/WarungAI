'use client'

import { useState } from 'react'
import { Calendar, Receipt, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface Transaction {
  id: number
  items: OrderItem[]
  total: number
  paymentMethod: string
  transactionDate: string
}

interface Summary {
  summaryDate: string
  totalSales: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
}

interface Props {
  transactions: Transaction[]
  summaries: Summary[]
}

export default function HistoryClient({ transactions, summaries }: Props) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const paymentMethodLabels: Record<string, string> = {
    Tunai: 'Cash',
    Kad: 'Card',
    'E-Wallet': 'E-Wallet',
    'QR Pay': 'QR Pay',
  }

  const paymentMethodColors: Record<string, string> = {
    Tunai: 'bg-green-100 text-green-800',
    Kad: 'bg-blue-100 text-blue-800',
    'E-Wallet': 'bg-purple-100 text-purple-800',
    'QR Pay': 'bg-orange-100 text-orange-800',
  }

  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, t) => {
    const date = t.transactionDate.split('T')[0]
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(t)
    return acc
  }, {} as Record<string, Transaction[]>)

  // Calculate totals
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0)
  const totalTransactions = transactions.length

  return (
    <div className="min-h-screen bg-slate-50 p-4 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <p className="text-sm text-slate-500">Report</p>
          <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Sales</span>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totalSales)}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Receipt className="w-4 h-4" />
              <span className="text-sm">Transactions</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{totalTransactions}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="w-full">
            <TabsTrigger value="transactions" className="flex-1">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex-1">
              Daily Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No transactions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map(t => (
                          <TableRow
                            key={t.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => setSelectedTransaction(t)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {formatDate(t.transactionDate)}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatTime(t.transactionDate)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                {t.items.slice(0, 2).map((item, i) => (
                                  <span key={i}>
                                    {item.quantity}x {item.name}
                                    {i < Math.min(t.items.length, 2) - 1 && ', '}
                                  </span>
                                ))}
                                {t.items.length > 2 && (
                                  <span className="text-slate-500">
                                    {' '}
                                    +{t.items.length - 2} more
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  paymentMethodColors[t.paymentMethod] ||
                                  'bg-slate-100 text-slate-800'
                                }
                              >
                                {paymentMethodLabels[t.paymentMethod] || t.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(t.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Daily Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {summaries.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No summary data</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summaries.map(s => (
                      <div
                        key={s.summaryDate}
                        className="p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatDate(s.summaryDate)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {s.transactionCount} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatCurrency(s.totalSales)}
                            </p>
                            {s.netProfit !== s.totalSales && (
                              <p className="text-sm text-slate-500">
                                Profit: {formatCurrency(s.netProfit)}
                              </p>
                            )}
                          </div>
                        </div>
                        {s.totalExpenses > 0 && (
                          <div className="mt-2 pt-2 border-t flex justify-between text-sm">
                            <span className="text-slate-500">Expenses</span>
                            <span className="text-red-600">
                              -{formatCurrency(s.totalExpenses)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTransaction(null)}
          >
            <Card
              className="max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="text-lg">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-slate-500">
                  {formatDate(selectedTransaction.transactionDate)} at{' '}
                  {formatTime(selectedTransaction.transactionDate)}
                </div>

                <div className="space-y-2">
                  {selectedTransaction.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatCurrency(selectedTransaction.total)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-500">Payment Method</span>
                    <Badge
                      className={
                        paymentMethodColors[selectedTransaction.paymentMethod] ||
                        'bg-slate-100 text-slate-800'
                      }
                    >
                      {paymentMethodLabels[selectedTransaction.paymentMethod] ||
                        selectedTransaction.paymentMethod}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
