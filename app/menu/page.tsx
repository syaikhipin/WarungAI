import { getMenuItems } from '@/lib/actions/menu'
import MenuClient from './MenuClient'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const menuItems = await getMenuItems()

  // Transform for client
  const items = menuItems.map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    category: item.category,
    aliases: typeof item.aliases === 'string' ? JSON.parse(item.aliases) : item.aliases,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl,
  }))

  return <MenuClient initialItems={items} />
}
