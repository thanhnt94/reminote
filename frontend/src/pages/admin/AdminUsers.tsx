import { useQuery } from '@tanstack/react-query'
import { Users, Shield, MessageCircle } from 'lucide-react'
import api from '@/api/client'

export default function AdminUsers() {
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/api/admin/users')).data,
  })

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">Management</p>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Identity <span className="text-amber-500 not-italic">Nodes</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 p-2 rounded-2xl">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div className="px-4">
            <p className="text-[10px] font-black text-slate-500 uppercase">Population</p>
            <p className="text-lg font-black text-white">{users?.length || 0} Entities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(users || []).map((u: any) => (
          <div key={u.id} className="group relative bg-white/[0.02] border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 transition-all hover:bg-white/[0.04]">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-amber-500/20 transition-all">
                  <span className="text-xl font-black text-slate-400 group-hover:text-amber-500 uppercase">{u.username[0]}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">{u.username}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{u.email || 'no_email_relay'}</p>
                </div>
              </div>
              {u.is_admin ? (
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
              ) : (
                <div className="p-2 bg-white/5 rounded-xl">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2">
                  <MessageCircle className={`w-4 h-4 ${u.telegram_chat_id ? 'text-blue-400' : 'text-slate-700'}`} />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Telegram</span>
                </div>
                <span className={`text-[11px] font-black uppercase ${u.telegram_chat_id ? 'text-blue-400' : 'text-slate-700'}`}>
                  {u.telegram_chat_id ? 'Synchronized' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between px-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Initialization</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(u.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
            
            {/* Rank Badge */}
            <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${u.is_admin ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800 border-white/5 text-slate-400 opacity-0 group-hover:opacity-100'}`}>
              {u.is_admin ? 'Superuser' : 'Node'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
