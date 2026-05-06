import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Save, Globe, ShieldCheck, Zap, Activity, Eye, EyeOff, Terminal
} from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/api/client'

export default function WebPushSettings() {
  const qc = useQueryClient()
  const [showToken, setShowToken] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get('/api/admin/settings')).data as any[],
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/api/admin/settings/${key}`, { value })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  const getValue = (key: string) => settings?.find((s: any) => s.key === key)?.value || ''
  const getEditValue = (key: string) => editValues[key] ?? getValue(key)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const setEditValue = (key: string, value: string) => setEditValues((prev) => ({ ...prev, [key]: value }))

  const isEnabled = getValue('ENABLE_WEB_PUSH') === 'true'

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="grid grid-cols-1 md:flex items-center gap-8">
          {/* Master Toggle */}
          <div 
            onClick={() => updateMutation.mutate({ key: 'ENABLE_WEB_PUSH', value: isEnabled ? 'false' : 'true' })}
            className={`w-full md:w-80 p-10 rounded-[3rem] border cursor-pointer transition-all flex flex-col justify-between group h-64 ${isEnabled ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}
          >
             <div className="flex items-center justify-between">
                <div className={`p-6 rounded-3xl ${isEnabled ? 'bg-blue-500 text-black shadow-xl shadow-blue-500/30' : 'bg-slate-800 text-slate-500'}`}>
                   <Globe className="w-10 h-10" />
                </div>
                <div className={`w-14 h-7 rounded-full p-1 transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                   <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                </div>
             </div>
             <div className="space-y-2">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Web App Push</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isEnabled ? 'Protocol Active' : 'Protocol Silenced'}</p>
             </div>
          </div>

          {/* Info Card */}
          <div className="flex-1 bg-[#0f172a] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-center h-64">
             <div className="flex items-center gap-6">
                <div className="p-6 bg-blue-500/10 rounded-[2rem] border border-blue-500/20">
                   <ShieldCheck className="w-10 h-10 text-blue-500" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-white uppercase">VAPID Security Layer</h3>
                   <p className="text-xs text-slate-500 max-w-md font-medium leading-relaxed">Web App Push relies on the Voluntary Application Server Identification (VAPID) protocol to securely communicate with browser push services.</p>
                </div>
             </div>
          </div>
       </div>

       {/* VAPID Credentials */}
       <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-10">
          <div className="flex items-center gap-3 mb-8">
             <Terminal className="w-5 h-5 text-blue-500" />
             <h3 className="text-lg font-black text-white uppercase tracking-tight">Security Credentials</h3>
          </div>
          <div className="grid grid-cols-1 gap-6">
             {settings?.filter((s: any) => s.category === 'security').map((s: any) => (
                <div key={s.key} className="space-y-1">
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">{s.description}</label>
                   <div className="relative group">
                      <input 
                        type={s.key.includes('PRIVATE') && !showToken ? 'password' : 'text'}
                        value={getEditValue(s.key)}
                        onChange={(e) => setEditValue(s.key, e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-blue-500/30 outline-none transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                        {s.key.includes('PRIVATE') && (
                          <button onClick={() => setShowToken(!showToken)} className="p-2 text-slate-700 hover:text-white">
                             {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })} className="p-2 bg-white/5 hover:bg-blue-500 text-slate-500 hover:text-black rounded-xl transition-all">
                           <Save className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  )
}
