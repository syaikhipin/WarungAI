'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface MenuItemInput {
  name: string
  price: number
  category: string
  aliases?: string[]
  imageUrl?: string
}

// Get all menu items
export async function getMenuItems() {
  return prisma.menuItem.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

// Get available menu items only
export async function getAvailableMenuItems() {
  return prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { category: 'asc' },
  })
}

// Get menu items by category
export async function getMenuItemsByCategory(category: string) {
  return prisma.menuItem.findMany({
    where: { category, isAvailable: true },
    orderBy: { name: 'asc' },
  })
}

// Get single menu item
export async function getMenuItem(id: number) {
  return prisma.menuItem.findUnique({
    where: { id },
  })
}

// Create menu item
export async function createMenuItem(data: MenuItemInput) {
  const item = await prisma.menuItem.create({
    data: {
      userId: 1,
      name: data.name,
      price: data.price,
      category: data.category,
      aliases: JSON.stringify(data.aliases || []),
      imageUrl: data.imageUrl,
    },
  })
  revalidatePath('/menu')

  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: item.id,
    userId: item.userId,
    name: item.name,
    price: Number(item.price), // Convert Decimal to number
    category: item.category,
    aliases: item.aliases,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

// Update menu item
export async function updateMenuItem(id: number, data: Partial<MenuItemInput>) {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.price !== undefined) updateData.price = data.price
  if (data.category !== undefined) updateData.category = data.category
  if (data.aliases !== undefined) updateData.aliases = JSON.stringify(data.aliases)
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl

  const item = await prisma.menuItem.update({
    where: { id },
    data: updateData,
  })
  revalidatePath('/menu')

  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: item.id,
    userId: item.userId,
    name: item.name,
    price: Number(item.price), // Convert Decimal to number
    category: item.category,
    aliases: item.aliases,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

// Delete menu item
export async function deleteMenuItem(id: number) {
  await prisma.menuItem.delete({
    where: { id },
  })
  revalidatePath('/menu')
}

// Toggle menu item availability
export async function toggleMenuItemAvailability(id: number) {
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) {
    throw new Error('Item tidak dijumpai')
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  })
  revalidatePath('/menu')

  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    price: Number(updated.price), // Convert Decimal to number
    category: updated.category,
    aliases: updated.aliases,
    isAvailable: updated.isAvailable,
    imageUrl: updated.imageUrl,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}

// Get menu context for voice parsing (formatted for Claude)
export async function getMenuContextForVoice() {
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    select: {
      id: true,
      name: true,
      price: true,
      aliases: true,
    },
  })

  return items.map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    aliases: typeof item.aliases === 'string' ? JSON.parse(item.aliases) : item.aliases,
  }))
}
