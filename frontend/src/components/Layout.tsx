import { useEffect, useState, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import { 
  Search,
  LayoutDashboard, 
  Plus, 
  Settings, 
  BookOpen,
  Zap,
  Layers,
  Cpu,
  Archive,
  Filter
} from 'lucide-react'

export default function Layout() {
  const { user, loading, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Global Filter State (for Dashboard)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const { data: dueData } = useQuery({
    queryKey: ['reminders-due-count'],
    queryFn: async () => (await api.get('/api/reminders/due')).data,
    enabled: !!user,
    refetchInterval: 30000
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
    enabled: location.pathname === '/dashboard'
  })

  useEffect(() => { fetchMe() }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><Cpu className="w-8 h-8 text-emerald-500 animate-spin" /></div>
  if (!user) { navigate('/login'); return null }

  const dueCount = dueData?.length || 0
  const isDashboard = location.pathname === '/dashboard'

  return (
    <div className="h-screen w-full flex flex-col bg-[#020617] font-sans overflow-hidden text-slate-100 selection:bg-emerald-500/30">
      
      {/* High-Impact Command Center Header */}
      <header className="flex-none bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-none">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-xs font-black tracking-tighter text-white hidden md:block">REMINOTE</h1>
            </div>

            {/* Red Box Area: Global Search */}
            <div className="flex-1 max-w-md relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search knowledge node..." 
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[11px] font-bold text-white outline-none focus:border-emerald-500/30 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Profile & Vault Toggle */}
            <div className="flex items-center gap-2 flex-none">
               {isDashboard && (
                 <button 
                   onClick={() => setShowArchived(!showArchived)}
                   className={`p-2 rounded-xl border transition-all ${
                     showArchived ? 'bg-emerald-500 text-[#020617] border-emerald-400 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5'
                   }`}
                 >
                   <Archive className="w-4 h-4" />
                 </button>
               )}
               <div className="w-8 h-8 bg-emerald-500 text-[#020617] rounded-xl flex items-center justify-center text-[10px] font-black border-2 border-emerald-400/20">
                {user.username.charAt(0).toUpperCase()}
               </div>
            </div>
          </div>

          {/* Tag Ribbon - Integrated into Header for Dashboard */}
          {isDashboard && tags && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 overflow-x-auto no-scrollbar pb-2"
            >
              <button 
                onClick={() => setSelectedTag('')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                  selectedTag === '' ? 'bg-white text-[#020617] border-white' : 'bg-white/5 text-slate-500 border-white/5'
                }`}
              >
                All
              </button>
              {tags.slice(0, 15).map((t: any) => (
                <button 
                  key={t.name}
                  onClick={() => setSelectedTag(t.name)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                    selectedTag === t.name ? 'bg-emerald-500 text-[#020617] border-emerald-400' : 'bg-white/5 text-slate-500 border-white/5'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </header>

      {/* Deep Space Content Area */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain pb-24 no-scrollbar">
        <div className="max-w-5xl mx-auto p-4 md:p-6 animate-fade-in">
          {/* We pass the state to the outlet via context or just use global stores if needed. 
              For simplicity now, I'll use a hacky event or just keep it in layout and pass down if I refactor more.
              Actually, I'll use window events or a simple state sharing for this demo. */}
          <Outlet context={{ search, selectedTag, showArchived }} />
        </div>
      </main>

      {/* Navigation */}
      <nav className="flex-none bg-[#020617]/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] px-4">
        {[
          { to: '/dashboard', icon: LayoutDashboard, label: 'Feed' },
          { to: '/tags', icon: BookOpen, label: 'Vault' },
          { to: '/reminders/new', icon: Plus, label: 'Commit' },
          { to: '/review', icon: Zap, label: 'Review', count: dueCount },
          { to: '/settings', icon: Settings, label: 'Node' },
        ].map(({ to, icon: Icon, label, count }) => {
          const isActive = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 w-full transition-all relative ${
                isActive ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5.5 h-5.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {count > 0 && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-[#020617] text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#020617]">
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-75'}`}>
                {label}
              </span>
              {isActive && (
                <motion.div layoutId="nav-line-dark" className="absolute top-0 left-6 right-6 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] rounded-full" />
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
