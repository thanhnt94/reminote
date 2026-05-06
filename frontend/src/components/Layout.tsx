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
  Filter,
  X,
  Tag as TagIcon
} from 'lucide-react'

export default function Layout() {
  const { user, loading, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Global Filter State (for Dashboard)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showTagExplorer, setShowTagExplorer] = useState(false)
  const [tagSearch, setTagSearch] = useState('')

  const { data: dueData } = useQuery({
    queryKey: ['reminders-due-count'],
    queryFn: async () => (await api.get('/api/reminders/due')).data,
    enabled: !!user,
    refetchInterval: 30000
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
    enabled: location.pathname === '/dashboard'
  })

  useEffect(() => { fetchMe() }, [])

  // Smart Tag Filtering for Explorer
  const allTags = tagsData || []
  const filteredTags = useMemo(() => {
    return allTags.filter((t: any) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
  }, [allTags, tagSearch])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><Cpu className="w-8 h-8 text-emerald-500 animate-spin" /></div>
  if (!user) { navigate('/login'); return null }

  const dueCount = dueData?.length || 0
  const isDashboard = location.pathname === '/dashboard'

  return (
    <div className="h-screen w-full flex flex-col bg-[#020617] font-sans overflow-hidden text-slate-100 selection:bg-emerald-500/30">
      
      {/* Command Center Header */}
      <header className="flex-none bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-none">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-xs font-black tracking-tighter text-white hidden md:block">REMINOTE</h1>
            </div>

            <div className="flex-1 max-w-md relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search knowledge node..." 
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold text-white outline-none focus:border-emerald-500/30 focus:bg-white/10 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-none">
               {isDashboard && (
                 <button 
                   onClick={() => setShowArchived(!showArchived)}
                   className={`p-2.5 rounded-xl border transition-all ${
                     showArchived ? 'bg-emerald-500 text-[#020617] border-emerald-400 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5'
                   }`}
                 >
                   <Archive className="w-4 h-4" />
                 </button>
               )}
               <div className="w-9 h-9 bg-emerald-500 text-[#020617] rounded-xl flex items-center justify-center text-[11px] font-black border-2 border-emerald-400/20">
                {user.username.charAt(0).toUpperCase()}
               </div>
            </div>
          </div>

          {/* Integrated Tag Ribbon + Filter Button */}
          {isDashboard && tagsData && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 pb-1">
                <button 
                  onClick={() => setSelectedTag('')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                    selectedTag === '' ? 'bg-white text-[#020617] border-white shadow-lg' : 'bg-white/5 text-slate-500 border-white/5'
                  }`}
                >
                  All Nodes
                </button>
                {tagsData.slice(0, 15).map((t: any) => (
                  <button 
                    key={t.name}
                    onClick={() => setSelectedTag(t.name)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
                      selectedTag === t.name ? 'bg-emerald-500 text-[#020617] border-emerald-400 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowTagExplorer(true)}
                className="p-2 bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-xl mb-1"
                title="Explore 100+ Tags"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </header>

      {/* Tag Explorer Modal (Taisaku for 100+ tags) */}
      <AnimatePresence>
        {showTagExplorer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTagExplorer(false)}
              className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[65vh]"
            >
              <div className="p-8 border-b border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white tracking-tighter">Tag Explorer</h3>
                  <button onClick={() => setShowTagExplorer(false)} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search in 100+ tags..." 
                    autoFocus
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((t: any) => (
                    <button 
                      key={t.name}
                      onClick={() => { setSelectedTag(t.name); setShowTagExplorer(false); }}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-3 ${
                        selectedTag === t.name 
                        ? 'bg-emerald-500 text-[#020617] border-emerald-400' 
                        : 'bg-white/5 text-slate-400 border-white/5 hover:border-emerald-500/30'
                      }`}
                    >
                      <TagIcon className="w-3 h-3 opacity-30" />
                      {t.name}
                      <span className="opacity-30 bg-black/20 px-1.5 py-0.5 rounded-md text-[8px]">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain pb-24 no-scrollbar">
        <div className="max-w-5xl mx-auto p-4 md:p-6 animate-fade-in">
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
