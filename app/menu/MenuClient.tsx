'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from '@/lib/actions/menu'
import { formatCurrency } from '@/lib/utils'

interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  aliases: string[]
  isAvailable: boolean
  imageUrl: string | null
}

interface Props {
  initialItems: MenuItem[]
}

const CATEGORIES = ['Makanan', 'Minuman', 'Lain-lain']

export default function MenuClient({ initialItems }: Props) {
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Makanan',
    aliases: '',
    imageUrl: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: 'Makanan',
      aliases: '',
      imageUrl: '',
    })
    setEditingItem(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      aliases: item.aliases.join(', '),
      imageUrl: item.imageUrl || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in all required information')
      return
    }

    const aliases = formData.aliases
      .split(',')
      .map(a => a.trim())
      .filter(a => a)

    startTransition(async () => {
      try {
        if (editingItem) {
          await updateMenuItem(editingItem.id, {
            name: formData.name,
            price: parseFloat(formData.price),
            category: formData.category,
            aliases,
            imageUrl: formData.imageUrl || undefined,
          })

          setItems(prev =>
            prev.map(item =>
              item.id === editingItem.id
                ? {
                    ...item,
                    name: formData.name,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    aliases,
                    imageUrl: formData.imageUrl || null,
                  }
                : item
            )
          )
        } else {
          const newItem = await createMenuItem({
            name: formData.name,
            price: parseFloat(formData.price),
            category: formData.category,
            aliases,
            imageUrl: formData.imageUrl || undefined,
          })

          setItems(prev => [
            {
              id: newItem.id,
              name: formData.name,
              price: parseFloat(formData.price),
              category: formData.category,
              aliases,
              isAvailable: true,
              imageUrl: formData.imageUrl || null,
            },
            ...prev,
          ])
        }

        setIsDialogOpen(false)
        resetForm()
      } catch (error) {
        console.error('Error saving menu item:', error)
        alert('Error saving menu item')
      }
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this item?')) return

    setIsDeleting(id)
    startTransition(async () => {
      try {
        await deleteMenuItem(id)
        setItems(prev => prev.filter(item => item.id !== id))
      } catch (error) {
        console.error('Error deleting menu item:', error)
        alert('Error deleting menu item')
      } finally {
        setIsDeleting(null)
      }
    })
  }

  const handleToggleAvailability = (id: number) => {
    startTransition(async () => {
      try {
        await toggleMenuItemAvailability(id)
        setItems(prev =>
          prev.map(item =>
            item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
          )
        )
      } catch (error) {
        console.error('Error toggling availability:', error)
        alert('Error updating availability')
      }
    })
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  return (
    <div className="min-h-screen bg-slate-50 p-4 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Management</p>
            <h1 className="text-2xl font-bold text-slate-900">Menu</h1>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Menu Items */}
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {category}
                <Badge variant="secondary">{categoryItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.isAvailable
                        ? 'bg-white border-slate-200'
                        : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {item.name}
                        </h3>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(item.price)}
                        </p>
                        {item.aliases.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Alias: {item.aliases.slice(0, 3).join(', ')}
                            {item.aliases.length > 3 && '...'}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() => handleToggleAvailability(item.id)}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting === item.id}
                      >
                        {isDeleting === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No item menu</p>
              <Button onClick={openAddDialog} className="mt-4">
                Add Item Pertama
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nasi Lemak"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="5.00"
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
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">Aliases (for voice)</Label>
                <Textarea
                  id="aliases"
                  value={formData.aliases}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, aliases: e.target.value }))
                  }
                  placeholder="nasi lemak biasa, lemak, nasik lemak"
                  className="min-h-[60px]"
                />
                <p className="text-xs text-slate-500">
                  Separate with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL Gambar (optional)</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
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
                ) : editingItem ? (
                  'Save'
                ) : (
                  'Add'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
