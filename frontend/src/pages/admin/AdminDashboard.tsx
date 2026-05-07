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
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-20">
      <div className="mb-10">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">Intelligence</p>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Admin <span className="text-emerald-500 not-italic">Dashboard</span></h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`group relative rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 bg-gradient-to-br border transition-all hover:scale-[1.02] ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-8 lg:mb-12">
               <div className="p-3 lg:p-4 bg-white/10 rounded-xl lg:rounded-2xl border border-white/10 group-hover:bg-white/20 transition-all">
                  <Icon className="w-6 h-6 lg:w-8 lg:h-8" />
               </div>
               <div className="w-2 h-2 rounded-full bg-current animate-pulse opacity-40" />
            </div>
            
            <div className="space-y-1">
               <p className="text-4xl lg:text-5xl font-black tabular-nums tracking-tighter">{value}</p>
               <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
            </div>
            
            {/* Decorative background element */}
            <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity overflow-hidden pointer-events-none">
               <Icon className="w-32 h-32 translate-x-8 translate-y-8" />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for future charts */}
      <div className="mt-10 p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] border-dashed flex flex-col items-center justify-center gap-4 text-slate-700 min-h-[300px]">
         <BarChart3 className="w-12 h-12 opacity-20" />
         <p className="text-[10px] font-black uppercase tracking-[0.3em]">Real-time Telemetry Offline</p>
      </div>
    </div>
  )
}
