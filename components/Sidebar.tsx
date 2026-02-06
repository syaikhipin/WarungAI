'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, Menu, DollarSign, Clock, History, Settings, BarChart3, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/orders', label: 'Orders', icon: Mic },
  { href: '/conversation', label: 'Conversation', icon: MessageSquare },
  { href: '/menu', label: 'Menu', icon: Menu },
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/shift', label: 'Shift', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface Props {
  className?: string
}

export default function Sidebar({ className }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col',
        className
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">WarungAI</h1>
        <p className="text-sm text-slate-500">Voice POS System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          WarungAI v1.0
        </p>
      </div>
    </aside>
  )
}
