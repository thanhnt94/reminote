import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Save, Key, ShieldCheck, Wifi, Activity, Layers, Eye, EyeOff, AlertCircle, CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/api/client'

export default function SSOSettings() {
  const qc = useQueryClient()
  const [showToken, setShowToken] = useState(false)
  const [ssoTestResult, setSsoTestResult] = useState<any>(null)
  const [ssoTestLoading, setSsoTestLoading] = useState(false)

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

  const executeSsoTest = async () => {
    setSsoTestLoading(true)
    try {
      const { data } = await api.post('/api/admin/sso/test')
      setSsoTestResult(data)
    } finally { setSsoTestLoading(false) }
  }

  const ssoFields = settings?.filter((s: any) => s.category === 'sso' && s.key !== 'ENABLE_SSO') || []
  const isEnabled = getValue('ENABLE_SSO') === 'true'

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Master Toggle */}
          <div 
            onClick={() => updateMutation.mutate({ key: 'ENABLE_SSO', value: isEnabled ? 'false' : 'true' })}
            className={`w-full md:w-80 p-10 rounded-[3rem] border cursor-pointer transition-all flex flex-col justify-between group h-64 ${isEnabled ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}
          >
             <div className="flex items-center justify-between">
                <div className={`p-6 rounded-3xl ${isEnabled ? 'bg-indigo-500 text-black shadow-xl shadow-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
                   <Key className="w-10 h-10" />
                </div>
                <div className={`w-14 h-7 rounded-full p-1 transition-colors ${isEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                   <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                </div>
             </div>
             <div className="space-y-2">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Central Auth</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isEnabled ? 'Authentication Online' : 'Service Silenced'}</p>
             </div>
          </div>

          {/* Config Area */}
          <div className="flex-1 bg-[#0f172a] border border-white/5 rounded-[3rem] p-10 space-y-10 w-full">
             <div className="grid grid-cols-1 gap-6">
                {ssoFields.map((s: any) => (
                  <div key={s.key} className="space-y-1">
                     <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">{s.description}</label>
                     <div className="relative">
                        <input 
                          type={s.key.includes('SECRET') && !showToken ? 'password' : 'text'}
                          value={getEditValue(s.key)}
                          onChange={(e) => setEditValue(s.key, e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-indigo-500/30 outline-none transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                           {s.key.includes('SECRET') && (
                             <button onClick={() => setShowToken(!showToken)} className="p-2 text-slate-700 hover:text-white">
                                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                           )}
                           <button onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })} className="p-2 bg-white/5 hover:bg-indigo-500 text-slate-500 hover:text-black rounded-xl transition-all">
                              <Save className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
             
             <div className="pt-10 border-t border-white/5">
                <button 
                  onClick={executeSsoTest}
                  disabled={ssoTestLoading}
                  className="w-full py-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-xs font-black uppercase tracking-widest hover:bg-indigo-500/10 hover:text-indigo-400 transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                  {ssoTestLoading ? <Layers className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5 text-indigo-500" />}
                  {ssoTestLoading ? 'Handshaking...' : 'Verify CentralAuth Ecosystem Link'}
                </button>
                
                <AnimatePresence>
                  {ssoTestResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-6 rounded-[2rem] border flex items-center gap-4 ${ssoTestResult.success ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-red-500/5 border-red-500/10 text-red-400'}`}>
                       <Activity className="w-6 h-6" />
                       <span className="text-[11px] font-black uppercase tracking-tight">{ssoTestResult.message || ssoTestResult.error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
       </div>
    </div>
  )
}
