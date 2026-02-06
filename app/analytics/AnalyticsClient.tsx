'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type {
  MenuItemSale,
  BusyHoursResult,
  TrendData,
} from '@/lib/actions/analytics'
import type { BalanceSheet } from '@/lib/types/balanceSheet'
import BalanceSheetComponent from '@/components/BalanceSheet'

interface Props {
  menuItemSales: MenuItemSale[]
  busyHours: BusyHoursResult
  salesTrends: TrendData[]
  expenseBreakdown: {
    total: number
    count: number
    byCategory: Record<string, number>
  }
  summary: {
    totalSales: number
    totalExpenses: number
    netProfit: number
    transactionCount: number
    avgOrderValue: number
  }
  balanceSheets: BalanceSheet[]
  defaultStartDate: string
  defaultEndDate: string
  defaultPeriod: 'daily' | 'weekly' | 'monthly'
}

const COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#9333ea',
  orange: '#ea580c',
  teal: '#14b8a6',
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ea580c', '#14b8a6', '#e11d48', '#6366f1']

export default function AnalyticsClient({
  menuItemSales,
  busyHours,
  salesTrends,
  expenseBreakdown,
  summary,
  balanceSheets,
  defaultStartDate,
  defaultEndDate,
  defaultPeriod,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Use key prop pattern instead of useEffect to sync state
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(defaultPeriod)

  const handleDateRangeChange = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      params.set('period', period)
      router.push(`/analytics?${params.toString()}`)
    })
  }

  const handleQuickSelect = (days: number) => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    
    setStartDate(start)
    setEndDate(end)
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('startDate', start)
      params.set('endDate', end)
      params.set('period', period)
      router.push(`/analytics?${params.toString()}`)
    })
  }

  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(newPeriod)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      params.set('period', newPeriod)
      router.push(`/analytics?${params.toString()}`)
    })
  }

  // Memoize expensive data transformations
  const hourlyChartData = useMemo(() => 
    busyHours.hourly.map(h => ({
      hour: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
      count: h.count,
      sales: h.sales,
    })),
    [busyHours.hourly]
  )

  // Top 10 menu items for chart
  const topItemsChartData = useMemo(() =>
    menuItemSales.slice(0, 10).map(item => ({
      name: item.name,
      revenue: item.revenue,
      quantity: item.quantity,
    })),
    [menuItemSales]
  )

  // Expense category chart data
  const expenseChartData = useMemo(() => 
    Object.entries(expenseBreakdown.byCategory).map(([category, amount]) => ({
      name: category,
      value: amount,
    })),
    [expenseBreakdown.byCategory]
  )

  // Format sales trends for chart
  const trendsChartData = useMemo(() => 
    salesTrends.map(trend => {
      let label = trend.period
      if (period === 'daily') {
        // Format: "15 Jan" or "Mon, 15"
        const date = new Date(trend.period + 'T00:00:00')
        label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      } else if (period === 'weekly') {
        // Format: "Week of 15 Jan"
        const date = new Date(trend.period + 'T00:00:00')
        label = `Week of ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
      } else {
        // Format: "Jan 2025"
        const [year, month] = trend.period.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        label = `${monthNames[parseInt(month) - 1]} ${year}`
      }

      return {
        period: label,
        sales: trend.sales,
        transactions: trend.transactions,
        avgOrderValue: trend.avgOrderValue,
      }
    }),
    [salesTrends, period]
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 safe-area-bottom">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Business Analytics</h1>
          <p className="text-slate-500 mt-1">Data and statistics for smart business decisions</p>
        </div>

        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="startDate">From Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="endDate">To Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleDateRangeChange} disabled={isPending}>
                  {isPending ? 'Loading...' : 'Apply'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(0)}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(7)}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(30)}>
                Last 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setStartDate(firstDay.toISOString().split('T')[0])
                setEndDate(today.toISOString().split('T')[0])
                handleDateRangeChange()
              }}>
                This Month
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Sales</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(summary.totalSales)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(summary.totalExpenses)}
                  </p>
                </div>
                <ShoppingBag className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Net Profit</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(summary.netProfit)}
                  </p>
                </div>
                {summary.netProfit >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Transaction Count</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {summary.transactionCount}
                  </p>
                </div>
                <Package className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Average Order</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(summary.avgOrderValue)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Profitable Menu Items */}
        <Card>
          <CardHeader>
            <CardTitle>Most Profitable Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Bar Chart */}
              {topItemsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topItemsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill={COLORS.primary} name="Total Sales" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No sales data for selected period
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-700">Item</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Quantity</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Total Sales</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Average Price</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Order Count</th>
                      <th className="text-right p-3 font-semibold text-slate-700">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItemSales.map((item, index) => {
                      const percentage = summary.totalSales > 0
                        ? (item.revenue / summary.totalSales) * 100
                        : 0
                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.revenue)}</td>
                          <td className="p-3 text-right">{formatCurrency(item.avgPrice)}</td>
                          <td className="p-3 text-right">{item.orderCount}</td>
                          <td className="p-3 text-right">{percentage.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {menuItemSales.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No menu items sold in this period
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Busiest Times */}
        <Card>
          <CardHeader>
            <CardTitle>Busiest Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Hourly Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">By Hour</h3>
                {busyHours.hourly.some(h => h.count > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hour" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={11}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill={COLORS.primary} name="Transaction Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    No transaction data for selected period
                  </div>
                )}
              </div>

              {/* Time Blocks Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">By Time Block</h3>
                {busyHours.timeBlocks.some(b => b.count > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={busyHours.timeBlocks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="block" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill={COLORS.success} name="Transaction Count" />
                      <Bar dataKey="sales" fill={COLORS.warning} name="Total Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No data for time blocks
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sales Trends</CardTitle>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Line Chart */}
              {trendsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      name="Total Sales"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No trend data for selected period
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-700">Period</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Total Sales</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Transaction Count</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Average Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendsChartData.map((trend, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">{trend.period}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(trend.sales)}</td>
                        <td className="p-3 text-right">{trend.transactions}</td>
                        <td className="p-3 text-right">{formatCurrency(trend.avgOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trendsChartData.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No trend data for this period
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pie Chart */}
              {expenseChartData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value" fill={COLORS.danger} name="Total Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No expenses for selected period
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-700">Category</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Total</th>
                      <th className="text-right p-3 font-semibold text-slate-700">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseChartData
                      .sort((a, b) => b.value - a.value)
                      .map((item, index) => {
                        const percentage = expenseBreakdown.total > 0
                          ? (item.value / expenseBreakdown.total) * 100
                          : 0
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(item.value)}</td>
                            <td className="p-3 text-right">{percentage.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {expenseChartData.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No expenses recorded in this period
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheets Section */}
        {balanceSheets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shift Financial Position</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {balanceSheets.length} shift{balanceSheets.length > 1 ? 's' : ''} in this period
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {balanceSheets.map((balanceSheet) => (
                  <BalanceSheetComponent
                    key={balanceSheet.shiftId}
                    balanceSheet={balanceSheet}
                    showExportButtons={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
