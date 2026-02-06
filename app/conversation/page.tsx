import { getCurrentShift } from '@/lib/actions/shifts'
import { getMenuItems } from '@/lib/actions/menu'
import ConversationClient from './ConversationClient'

export const dynamic = 'force-dynamic'

export default async function ConversationPage() {
  const currentShift = await getCurrentShift()
  const menuItems = await getMenuItems()

  return (
    <ConversationClient
      currentShift={currentShift ? {
        id: currentShift.id,
        openedAt: currentShift.openedAt.toISOString(),
        openingCash: Number(currentShift.openingCash),
      } : null}
      menuItems={menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        category: item.category,
      }))}
    />
  )
}
