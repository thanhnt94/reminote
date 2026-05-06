import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users, Brain, Zap } from 'lucide-react'
import api from '@/api/client'

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/api/admin/stats')).data,
  })

  const cards = [
    { label: 'Total Reminders', value: stats?.total_reminders ?? '-', icon: Brain, color: 'emerald' },
    { label: 'Active', value: stats?.active_reminders ?? '-', icon: BarChart3, color: 'blue' },
    { label: 'Due Now', value: stats?.due_now ?? '-', icon: Zap, color: 'red' },
    { label: 'Users', value: stats?.total_users ?? '-', icon: Users, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl p-5 bg-gradient-to-br border ${colorMap[color]}`}>
            <Icon className="w-8 h-8 mb-3 opacity-80" />
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm opacity-60 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
