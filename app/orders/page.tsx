import { getCurrentShift } from '@/lib/actions/shifts'
import OrderingClient from './OrderingClient'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const currentShift = await getCurrentShift()

  return (
    <OrderingClient
      currentShift={currentShift ? {
        id: currentShift.id,
        openedAt: currentShift.openedAt.toISOString(),
        openingCash: Number(currentShift.openingCash),
      } : null}
    />
  )
}
