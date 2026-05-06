import { Outlet, NavLink } from 'react-router-dom'
import { BarChart3, ArrowLeft, Layers, ShieldCheck, Key, MessageSquare, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminLayout() {
  const navItems = [
    { to: '/admin', icon: BarChart3, label: 'Performance', end: true },
    { to: '/admin/sso', icon: Key, label: 'SSO Login' },
    { to: '/admin/telegram', icon: MessageSquare, label: 'Telegram Notification' },
    { to: '/admin/web-push', icon: Globe, label: 'Web App Notification' },
  ]

  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Admin Sidebar */}
      <aside className="w-72 bg-[#020617] border-r border-white/5 flex flex-col p-6 sticky top-0 h-screen z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xs font-black tracking-[0.3em] text-white uppercase">REMINOTE</h1>
            <p className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">Admin Control</p>
          </div>
        </div>

        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-4 py-3 mb-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white bg-white/5 rounded-2xl border border-white/5 transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Neural Feed
        </NavLink>

        <nav className="flex-1 space-y-2">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative group ${
                  isActive
                    ? 'bg-emerald-500 text-[#020617] font-black shadow-xl shadow-emerald-500/10'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
              {/* Active Indicator Pin */}
              <motion.div 
                className={`absolute right-4 w-1.5 h-1.5 rounded-full bg-black/20`}
                initial={false}
                animate={{ scale: 1 }}
              />
            </NavLink>
          ))}
        </nav>

        <div className="pt-10 border-t border-white/5 opacity-20">
           <Layers className="w-10 h-10 text-white mx-auto" />
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-10 overflow-y-auto no-scrollbar relative">
        {/* Background Ambient Glow */}
        <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full -z-10" />
        <div className="max-w-6xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
