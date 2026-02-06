'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Loader2, Receipt } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createExpense, deleteExpense } from '@/lib/actions/expenses'

const EXPENSE_CATEGORIES = [
  'Raw Materials',
  'Salary',
  'Rent',
  'Utilities',
  'Transportation',
  'Others',
] as const
import { formatCurrency, formatTime } from '@/lib/utils'

interface Expense {
  id: number
  amount: number
  category: string
  description: string | null
  expenseDate: string
}

interface Props {
  initialExpenses: Expense[]
  totalToday: number
}

export default function ExpenseClient({ initialExpenses, totalToday }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [total, setTotal] = useState(totalToday)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Raw Materials',
    description: '',
  })

  const resetForm = () => {
    setFormData({
      amount: '',
      category: 'Raw Materials',
      description: '',
    })
  }

  const handleSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    startTransition(async () => {
      try {
        const newExpense = await createExpense({
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description || undefined,
        })

        const expenseItem: Expense = {
          id: newExpense.id,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description || null,
          expenseDate: new Date().toISOString(),
        }

        setExpenses(prev => [expenseItem, ...prev])
        setTotal(prev => prev + parseFloat(formData.amount))
        setIsDialogOpen(false)
        resetForm()
      } catch (error) {
        console.error('Error creating expense:', error)
        alert('Error saving expense')
      }
    })
  }

  const handleDelete = (id: number, amount: number) => {
    if (!confirm('Delete this expense?')) return

    setIsDeleting(id)
    startTransition(async () => {
      try {
        await deleteExpense(id)
        setExpenses(prev => prev.filter(e => e.id !== id))
        setTotal(prev => prev - amount)
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Error deleting expense')
      } finally {
        setIsDeleting(null)
      }
    })
  }

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = { items: [], total: 0 }
    }
    acc[expense.category].items.push(expense)
    acc[expense.category].total += expense.amount
    return acc
  }, {} as Record<string, { items: Expense[]; total: number }>)

  const categoryColors: Record<string, string> = {
    'Raw Materials': 'bg-orange-100 text-orange-800',
    'Salary': 'bg-blue-100 text-blue-800',
    'Rent': 'bg-purple-100 text-purple-800',
    'Utilities': 'bg-yellow-100 text-yellow-800',
    'Transportation': 'bg-green-100 text-green-800',
    'Others': 'bg-slate-100 text-slate-800',
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Management</p>
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/80">Total Expenses Today</p>
                <p className="text-3xl font-bold">{formatCurrency(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Summary */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(expensesByCategory).map(([category, data]) => (
              <Card key={category} className="p-4">
                <Badge className={categoryColors[category] || 'bg-slate-100 text-slate-800'}>
                  {category}
                </Badge>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {formatCurrency(data.total)}
                </p>
                <p className="text-sm text-slate-500">{data.items.length} item</p>
              </Card>
            ))}
          </div>
        )}

        {/* Expense List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Expense List</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No expenses today</p>
                <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                  Add Expense
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            categoryColors[expense.category] || 'bg-slate-100 text-slate-800'
                          }
                        >
                          {expense.category}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatTime(expense.expenseDate)}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {expense.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-red-600">
                        -{formatCurrency(expense.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(expense.id, expense.amount)}
                        disabled={isDeleting === expense.id}
                      >
                        {isDeleting === expense.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Expense Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="0.00"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="e.g., Bought vegetables at market"
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
