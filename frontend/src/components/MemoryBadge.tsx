import { motion } from 'framer-motion'

interface MemoryBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

export default function MemoryBadge({ level, size = 'md' }: MemoryBadgeProps) {
  const levels = [
    { label: 'Level 0', color: 'bg-red-500', text: 'New', light: 'bg-red-50 text-red-600 border-red-100' },
    { label: 'Level 1', color: 'bg-orange-500', text: 'Learning', light: 'bg-orange-50 text-orange-600 border-orange-100' },
    { label: 'Level 2', color: 'bg-amber-500', text: 'Improving', light: 'bg-amber-50 text-amber-600 border-amber-100' },
    { label: 'Level 3', color: 'bg-blue-500', text: 'Stable', light: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Level 4', color: 'bg-emerald-500', text: 'Advanced', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'Level 5', color: 'bg-emerald-600', text: 'Mastered', light: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ]

  const config = levels[level] || levels[0]
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[7px]',
    md: 'px-2.5 py-1 text-[9px]',
    lg: 'px-4 py-1.5 text-[10px]',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}>
        <div className={`absolute inset-0 rounded-full ${config.color} animate-pulse opacity-40`} />
        <div className={`absolute inset-0 rounded-full ${config.color} shadow-sm`} />
      </div>
      <span className={`${sizeClasses[size]} font-black uppercase tracking-widest rounded-md border ${config.light}`}>
        {config.text}
      </span>
    </div>
  )
}
