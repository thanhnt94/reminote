import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Settings, Bell, Shield, LogOut, Send, Smartphone, Globe, Bot, Save, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/api/client'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const qc = useQueryClient()
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get('/api/admin/settings')).data,
    enabled: user?.is_admin
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      return (await api.put(`/api/admin/settings/${key}`, { value })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      setEditingKey(null)
    }
  })

  const sendTestPush = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      await api.post('/api/admin/test-push')
      setTestResult({ success: true, message: 'Đã gửi! Kiểm tra Telegram của bạn.' })
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: err.response?.data?.detail || 'Gửi lỗi. Đảm bảo đã /link bot.' 
      })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">System Configuration</h1>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* User Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-black">
          {user?.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900">{user?.username}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user?.is_admin ? 'Administrator' : 'Learner'}</p>
        </div>
      </div>

      {/* Telegram Connectivity */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Bot className="w-3.5 h-3.5 text-amber-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telegram Sync</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Connection Status</p>
              <p className="text-[10px] text-slate-500">
                {user?.telegram_chat_id ? `✅ Connected (ID: ${user.telegram_chat_id})` : '❌ Not connected. Run /link on bot.'}
              </p>
            </div>
            <button 
              onClick={sendTestPush}
              disabled={testLoading || !user?.telegram_chat_id}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-30"
            >
              {testLoading ? 'Sending...' : 'Test Push'}
            </button>
          </div>
          {testResult && (
            <div className={`p-2 rounded-lg text-[9px] font-bold border ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </section>

      {/* Admin Settings CRUD */}
      {user?.is_admin && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Server Settings</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {settings?.map((s: any) => (
              <div key={s.key} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.key}</label>
                  {editingKey === s.key ? (
                    <div className="flex gap-1">
                      <button onClick={() => updateMutation.mutate({ key: s.key, value: editValue })} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-md">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingKey(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-md">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingKey(s.key); setEditValue(s.value || '') }} className="text-[9px] font-black text-blue-500 uppercase hover:underline">Edit</button>
                  )}
                </div>
                {editingKey === s.key ? (
                  <input 
                    type="text" 
                    value={editValue} 
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-500/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs font-mono text-slate-600 truncate bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    {s.value || <span className="italic text-slate-300">Not set</span>}
                  </p>
                )}
                <p className="text-[9px] text-slate-400 italic">{s.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
import { X } from 'lucide-react'
