import { useQuery } from '@tanstack/react-query'
import { Users, Shield, MessageCircle } from 'lucide-react'
import api from '@/api/client'

export default function AdminUsers() {
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/api/admin/users')).data,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-sm font-medium text-slate-500 px-5 py-3">User</th>
              <th className="text-left text-sm font-medium text-slate-500 px-5 py-3">Email</th>
              <th className="text-left text-sm font-medium text-slate-500 px-5 py-3">Role</th>
              <th className="text-left text-sm font-medium text-slate-500 px-5 py-3">Telegram</th>
              <th className="text-left text-sm font-medium text-slate-500 px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u: any) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <td className="px-5 py-3 text-sm text-white font-medium">{u.username}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{u.email || '—'}</td>
                <td className="px-5 py-3">
                  {u.is_admin ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400"><Shield className="w-3 h-3" />Admin</span>
                  ) : (
                    <span className="text-xs text-slate-500">User</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {u.telegram_chat_id ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-400"><MessageCircle className="w-3 h-3" />{u.telegram_chat_id}</span>
                  ) : <span className="text-xs text-slate-600">—</span>}
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
