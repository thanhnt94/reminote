import { Outlet, NavLink } from 'react-router-dom'
import { Brain, BarChart3, Settings, Users, ArrowLeft } from 'lucide-react'

export default function AdminLayout() {
  const navItems = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard', end: true },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ]

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 glass border-r border-white/5 flex flex-col p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-2 px-2">
          <Brain className="w-8 h-8 text-amber-400" />
          <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
            Admin
          </span>
        </div>

        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 mb-4 text-sm text-slate-500 hover:text-slate-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </NavLink>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
