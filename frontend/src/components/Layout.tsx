import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, PlusSquare, GraduationCap, 
  Settings, Tags, LogOut, Search, 
  Brain, User as UserIcon, X, Tag as TagIcon,
  SlidersHorizontal, Filter, ArrowRight, Zap
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/api/client'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const isReviewPage = location.pathname === '/review'
  const isCreatePage = location.pathname === '/reminders/new'
  const isEditPage = location.pathname.endsWith('/edit')
  const isDetailPage = location.pathname.startsWith('/reminders/') && !isCreatePage && !isEditPage

  // Immersive content (no padding, full screen)
  const isContentImmersive = isReviewPage || isDetailPage || isCreatePage || isEditPage
  // Hide navigation bars (desktop sidebar & mobile bottom bar)
  const hideNav = isCreatePage || isEditPage

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
  })

  const filteredTags = tagsData?.filter((t: any) => 
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  ).slice(0, 100)

  useEffect(() => {
    if (showTagSelector && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [showTagSelector])

  // GLOBAL SCROLL LOCK LOGIC FOR LIGHTBOXES
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const lightbox = document.querySelector('.fixed.inset-0.z-\\[300\\]')
      if (lightbox) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      document.body.style.overflow = ''
    }
  }, [])

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Feed' },
    { path: '/review', icon: GraduationCap, label: 'Review' },
    { path: '/reminders/new', icon: PlusSquare, label: 'Inject' },
    { path: '/tags', icon: Tags, label: 'Taxonomy' },
    { path: '/settings', icon: Settings, label: 'Config' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-emerald-500/30 flex">
      
      {/* QUICK TAG SELECTOR MODAL */}
      <AnimatePresence>
        {showTagSelector && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setShowTagSelector(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] space-y-8"
              onClick={e => e.stopPropagation()}
            >
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Neural Search</p>
                     <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Pick <span className="text-emerald-500 not-italic">Taxonomy</span></h2>
                  </div>
                  <button onClick={() => setShowTagSelector(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                     <X className="w-6 h-6 text-slate-500" />
                  </button>
               </div>

               <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    ref={tagInputRef}
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Type to filter 10,000+ tags..."
                    className="w-full bg-black/40 border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-xl font-bold text-white focus:outline-none focus:border-emerald-500/30 transition-all shadow-inner"
                  />
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {filteredTags?.map((t: any) => (
                     <button
                       key={t.name}
                       onClick={() => {
                          setSelectedTag(t.name)
                          setShowTagSelector(false)
                          setTagSearch('')
                          if (location.pathname !== '/dashboard') navigate('/dashboard')
                       }}
                       className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left"
                     >
                        <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-500">#{t.name}</span>
                        <ArrowRight className="w-4 h-4 text-slate-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                     </button>
                  ))}
                  {filteredTags?.length === 0 && (
                     <div className="col-span-full py-20 text-center opacity-20">
                        <TagIcon className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching neural patterns</p>
                     </div>
                  )}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      {!hideNav && (
        <aside className="fixed left-0 top-0 bottom-0 w-24 hidden md:flex flex-col items-center py-8 bg-[#0f172a]/40 border-r border-white/5 backdrop-blur-3xl z-[110]">
           <div 
             onClick={() => navigate('/dashboard')}
             className="p-3.5 bg-emerald-500 rounded-2xl cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.4)] mb-14 hover:scale-110 transition-transform"
           >
              <Brain className="w-7 h-7 text-black" />
           </div>

           <nav className="flex-1 flex flex-col gap-6">
              {navItems.map((item) => {
                 const isActive = location.pathname === item.path
                 return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`relative p-4.5 rounded-2xl transition-all group ${isActive ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-400'}`}
                    >
                       <item.icon className="w-7 h-7 relative z-10" />
                       {isActive && (
                          <motion.div 
                            layoutId="side-nav-active"
                            className="absolute inset-0 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl"
                          />
                       )}
                    </button>
                 )
              })}
           </nav>

           <button onClick={() => logout()} className="p-4.5 text-slate-800 hover:text-red-500 transition-colors mt-auto">
              <LogOut className="w-7 h-7" />
           </button>
        </aside>
      )}

      {/* MAIN WRAPPER */}
      <div className={`flex-1 ${!hideNav ? 'md:ml-24' : ''} flex flex-col min-w-0`}>
        
        {/* GLOBAL UNIFIED HEADER - Hidden on Immersive Pages */}
        {!isContentImmersive && (
          <header className="sticky top-0 z-[100] bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5">
            <div className="px-4 md:px-12 py-2 flex items-center justify-between gap-4">
                <div 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center cursor-pointer group"
                >
                  <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.4)] group-hover:rotate-12 transition-transform">
                      <Brain className="w-5 h-5 text-black" />
                  </div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight uppercase hidden lg:block italic ml-3">Remi<span className="text-emerald-500 not-italic">Note</span></h1>
                </div>

                <div className="flex-1 max-w-3xl relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        if (location.pathname !== '/dashboard') navigate('/dashboard')
                    }}
                    placeholder="Scan neural patterns..."
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-14 pr-10 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500/20 focus:bg-white/[0.05] transition-all"
                  />
                  {search && (
                      <button onClick={() => setSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-emerald-500 shadow-xl group cursor-pointer hover:border-emerald-500/30 transition-all">
                      <UserIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
            </div>

            {/* BOTTOM ROW: TAXONOMY STRIP - Exclusive to Dashboard */}
            {location.pathname === '/dashboard' && (
              <div className="px-4 md:px-12 py-0.5 flex items-center gap-2 overflow-hidden border-t border-white/[0.03] bg-black/10">
                  
                  <button 
                    onClick={() => setShowTagSelector(true)}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-95 group mr-2 shadow-xl shadow-emerald-500/5"
                  >
                    <Filter className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  </button>
                  
                  <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                    <button 
                      onClick={() => setSelectedTag('')}
                      className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedTag ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-slate-600 border-white/5 hover:text-slate-300'}`}
                    >
                        All Segments
                  </button>
                  {tagsData?.slice(0, 50).map((t: any) => (
                      <button 
                        key={t.name}
                        onClick={() => {
                          setSelectedTag(t.name === selectedTag ? '' : t.name)
                        }}
                        className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border group flex items-center gap-2 ${selectedTag === t.name ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-slate-500 border-white/5 hover:border-emerald-500/20 hover:text-emerald-500'}`}
                      >
                        #{t.name}
                      </button>
                  ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto pl-2 border-l border-white/5">
                      <button 
                        onClick={() => setShowArchived(!showArchived)}
                        className={`p-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${showArchived ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-slate-500 border-white/5 hover:text-amber-500'}`}
                        title="Vault"
                      >
                          <Zap className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Vault</span>
                      </button>
                  </div>
              </div>
            )}
          </header>
        )}

        <main className={`${isContentImmersive ? 'flex-1 flex flex-col px-0 py-0 overflow-hidden' : 'px-3 md:px-12 py-3 md:py-8 pb-32 md:pb-12'} max-w-[1920px] mx-auto w-full`}>
          <Outlet context={{ search, setSearch, selectedTag, setSelectedTag, showArchived, setShowArchived }} />
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-6 z-50">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`p-4 rounded-2xl transition-all ${isActive ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500'}`}
              >
                <item.icon className="w-6 h-6" />
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
