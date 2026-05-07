import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Save, Bot, Clock, MessageSquare, Radio, Activity, CheckCircle2, AlertCircle, Zap, Globe, Eye, EyeOff, Moon, Sun, ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/api/client'

export default function TelegramSettings() {
  const qc = useQueryClient()
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
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
  
  // Local states for sliders to ensure "snappy" feeling
  const [localInterval, setLocalInterval] = useState<string>('60')
  const [localStart, setLocalStart] = useState<string>('8')
  const [localEnd, setLocalEnd] = useState<string>('22')
  const [localMax, setLocalMax] = useState<string>('15')

  // Sync local state when data arrives
  useEffect(() => {
    if (settings) {
      setLocalInterval(getValue('GLOBAL_PUSH_INTERVAL'))
      setLocalStart(getValue('GLOBAL_ACTIVE_START'))
      setLocalEnd(getValue('GLOBAL_ACTIVE_END'))
      setLocalMax(getValue('MAX_DAILY_PUSHES'))
    }
  }, [settings])

  const getEditValue = (key: string) => editValues[key] ?? getValue(key)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const setEditValue = (key: string, value: string) => setEditValues((prev) => ({ ...prev, [key]: value }))

  const executeBroadcastTest = async () => {
    setBroadcastLoading(true)
    try {
      const { data } = await api.post('/api/admin/bot/broadcast-test')
      setBroadcastResult(data)
    } finally { setBroadcastLoading(false) }
  }

  const isEnabled = getValue('ENABLE_TELEGRAM_PUSH') === 'true'

  return (
    <div className="space-y-8 animate-fade-in pb-20">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div 
            onClick={() => updateMutation.mutate({ key: 'ENABLE_TELEGRAM_PUSH', value: isEnabled ? 'false' : 'true' })}
            className={`p-6 lg:p-10 rounded-2xl lg:rounded-[3rem] border cursor-pointer transition-all flex flex-col justify-between group lg:h-64 ${isEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}
          >
             <div className="flex items-center justify-between mb-8 lg:mb-0">
                <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-3xl ${isEnabled ? 'bg-emerald-500 text-black shadow-xl shadow-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                   <MessageSquare className="w-6 h-6 lg:w-10 lg:h-10" />
                </div>
                <div className={`w-12 lg:w-14 h-6 lg:h-7 rounded-full p-1 transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                   <div className={`w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6 lg:translate-x-7' : 'translate-x-0'}`} />
                </div>
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter italic">Telegram Bot</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isEnabled ? 'Protocol Active' : 'Protocol Silenced'}</p>
             </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500/10 via-white/[0.01] to-black border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 flex flex-col justify-between relative overflow-hidden group">
             <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                <Radio className="w-48 lg:w-64 h-48 lg:h-64 -translate-y-6 lg:-translate-y-10 translate-x-6 lg:translate-x-10" />
             </div>
             <div className="relative z-10 max-w-lg space-y-4">
                <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter italic">Diagnostic Pulse</h3>
                <p className="text-[11px] lg:text-xs text-slate-400 font-medium leading-relaxed">Verify bot synchronization and transmission health.</p>
                <button 
                   onClick={executeBroadcastTest}
                   disabled={broadcastLoading}
                   className="w-full sm:w-auto px-8 lg:px-10 py-4 lg:py-5 bg-emerald-500 text-black rounded-xl lg:rounded-[2rem] text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/30 disabled:opacity-30"
                >
                   {broadcastLoading ? 'Relaying...' : 'Execute Pulse Test'}
                </button>
             </div>
          </div>
       </div>

       <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 space-y-8 lg:space-y-12">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <h3 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter italic">Neural Scheduler</h3>
                <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Global delivery interval & active window</p>
             </div>
             <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-emerald-500/20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             {/* Interval Slider */}
             <div className="space-y-8 bg-black/40 p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Push Interval</p>
                      <p className="text-xs font-bold text-white uppercase">Frequency Matrix</p>
                   </div>
                   <div className="text-right">
                      <span className="text-4xl font-black text-emerald-500 tabular-nums">{localInterval}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1 uppercase">Min</span>
                   </div>
                </div>
                <input 
                  type="range" min="15" max="480" step="15"
                  value={localInterval}
                  onChange={(e) => setLocalInterval(e.target.value)}
                  onMouseUp={() => updateMutation.mutate({ key: 'GLOBAL_PUSH_INTERVAL', value: localInterval })}
                  onTouchEnd={() => updateMutation.mutate({ key: 'GLOBAL_PUSH_INTERVAL', value: localInterval })}
                  className="w-full accent-emerald-500 h-2 bg-white/5 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase tracking-widest">
                   <span>15m (High Frequency)</span>
                   <span>8h (Low Frequency)</span>
                </div>
             </div>

             {/* Active Range */}
             <div className="space-y-8 bg-black/40 p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Window</p>
                      <p className="text-xs font-bold text-white uppercase">Allowed delivery range</p>
                   </div>
                   <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-blue-500 tabular-nums">{localStart.padStart(2, '0')}</span>
                      <span className="text-sm font-bold text-slate-500">—</span>
                      <span className="text-4xl font-black text-blue-500 tabular-nums">{localEnd.padStart(2, '0')}</span>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                         <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-500" /> Start Hour</span>
                         <span className="tabular-nums">{localStart}:00</span>
                      </div>
                      <input 
                        type="range" min="0" max="23" step="1"
                        value={localStart}
                        onChange={(e) => setLocalStart(e.target.value)}
                        onMouseUp={() => updateMutation.mutate({ key: 'GLOBAL_ACTIVE_START', value: localStart })}
                        onTouchEnd={() => updateMutation.mutate({ key: 'GLOBAL_ACTIVE_START', value: localStart })}
                        className="w-full accent-blue-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                         <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-indigo-500" /> End Hour</span>
                         <span className="tabular-nums">{localEnd}:00</span>
                      </div>
                      <input 
                        type="range" min="0" max="23" step="1"
                        value={localEnd}
                        onChange={(e) => setLocalEnd(e.target.value)}
                        onMouseUp={() => updateMutation.mutate({ key: 'GLOBAL_ACTIVE_END', value: localEnd })}
                        onTouchEnd={() => updateMutation.mutate({ key: 'GLOBAL_ACTIVE_END', value: localEnd })}
                        className="w-full accent-blue-500 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex items-center gap-4">
                <Zap className="w-6 h-6 text-amber-500" />
                <div className="flex-1">
                   <p className="text-[9px] font-black text-slate-500 uppercase">Max Daily Pushes</p>
                   <input 
                    type="range" min="1" max="100" step="1"
                    value={localMax}
                    onChange={(e) => setLocalMax(e.target.value)}
                    onMouseUp={() => updateMutation.mutate({ key: 'MAX_DAILY_PUSHES', value: localMax })}
                    onTouchEnd={() => updateMutation.mutate({ key: 'MAX_DAILY_PUSHES', value: localMax })}
                    className="w-full accent-amber-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                   />
                </div>
                <span className="text-xl font-black text-white tabular-nums">{localMax}</span>
             </div>
             <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex items-center gap-4">
                <Globe className="w-6 h-6 text-blue-500" />
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase">Timezone</p>
                   <p className="text-[10px] font-bold text-white uppercase tracking-tight">{getValue('PUSH_TIMEZONE')}</p>
                </div>
             </div>
             <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase">Sync Status</p>
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Real-time</p>
                </div>
             </div>
          </div>
       </div>

       {/* Bot Config */}
       <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
             <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" />
             <h3 className="text-base lg:text-lg font-black text-white uppercase tracking-tight italic">Infrastructure Tunnel</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {settings?.filter((s: any) => s.category === 'bot').map((s: any) => (
                <div key={s.key} className="space-y-2">
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">{s.description}</label>
                   <div className="relative group">
                      <input 
                        type={s.key.includes('TOKEN') && !showToken ? 'password' : 'text'}
                        value={getEditValue(s.key)}
                        onChange={(e) => setEditValue(s.key, e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-emerald-500/30 outline-none transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                        {s.key.includes('TOKEN') && (
                          <button onClick={() => setShowToken(!showToken)} className="p-2 text-slate-700 hover:text-white">
                             {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })} className="p-2 bg-white/5 hover:bg-emerald-500 text-slate-500 hover:text-black rounded-xl transition-all">
                           <Save className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>

       <AnimatePresence>
        {broadcastResult && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-10 right-10 w-full max-w-sm z-[100]">
             <div className="bg-[#1e293b]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-[10px] font-black uppercase text-emerald-500">Pulse Report</h4>
                   <button onClick={() => setBroadcastResult(null)} className="text-slate-500 hover:text-white"><Activity className="w-4 h-4" /></button>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Telegram Response</p>
                   <p className="text-[10px] font-black text-emerald-400 uppercase">{broadcastResult.telegram}</p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
