'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, Menu, DollarSign, Clock, History, Settings, BarChart3, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/orders', label: 'Orders', icon: Mic },
  { href: '/conversation', label: 'Chat', icon: MessageSquare },
  { href: '/menu', label: 'Menu', icon: Menu },
  { href: '/shift', label: 'Shift', icon: Clock },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
]

interface Props {
  className?: string
}

export default function MobileNav({ className }: Props) {
  const pathname = usePathname()

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-50', className)}>
      <div className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-lg h-16 flex items-center px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 h-full flex items-center justify-center"
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon
                    className={cn('w-5 h-5', isActive && 'stroke-[2.5]')}
                  />
                  <span
                    className={cn(
                      'text-[10px]',
                      isActive ? 'font-semibold' : 'font-medium'
                    )}
                  >
                    {label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
