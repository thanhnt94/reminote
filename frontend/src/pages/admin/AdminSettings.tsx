import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Save, TestTube, Bot, Clock, Eye, EyeOff, Zap, 
  ShieldCheck, Globe, Bell, Power, Terminal, 
  MessageSquare, Radio, CheckCircle2, AlertCircle,
  Activity, Key, Server, Settings as SettingsIcon,
  Wifi, Share2, Layers, Cpu, Database, Sliders,
  Moon, Sun, ChevronRight, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/api/client'

type TabType = 'core' | 'sso' | 'notifications';

export default function AdminSettings() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('core')
  const [showToken, setShowToken] = useState(false)
  
  // Test States
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
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

  // --- Handlers ---
  const executeBroadcastTest = async () => {
    setBroadcastLoading(true)
    try {
      const { data } = await api.post('/api/admin/bot/broadcast-test')
      setBroadcastResult(data)
    } finally { setBroadcastLoading(false) }
  }

  const executeSsoTest = async () => {
    setSsoTestLoading(true)
    try {
      const { data } = await api.post('/api/admin/sso/test')
      setSsoTestResult(data)
    } finally { setSsoTestLoading(false) }
  }

  // --- Hour Matrix Picker ---
  const HourMatrix = () => {
    const currentHours = getValue('PUSH_SCHEDULE_HOURS').split(',').map(Number).filter((h: number) => !isNaN(h));
    const toggleHour = (h: number) => {
      let newHours: number[];
      if (currentHours.includes(h)) {
        newHours = currentHours.filter((hour: number) => hour !== h);
      } else {
        newHours = [...currentHours, h].sort((a: number, b: number) => a - b);
      }
      updateMutation.mutate({ key: 'PUSH_SCHEDULE_HOURS', value: newHours.join(',') });
    };

    return (
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <button
            key={i}
            onClick={() => toggleHour(i)}
            className={`h-11 rounded-xl text-[10px] font-black border transition-all ${
              currentHours.includes(i) 
              ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20 scale-105' 
              : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
            }`}
          >
            {i.toString().padStart(2, '0')}
          </button>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'core', label: 'Core Config', desc: 'Base protocols & scheduler', icon: Cpu, color: 'emerald' },
    { id: 'notifications', label: 'Push Pipeline', desc: 'Telegram & Web delivery', icon: Bell, color: 'blue' },
    { id: 'sso', label: 'Identity Hub', desc: 'CentralAuth SSO management', icon: Key, color: 'indigo' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 md:gap-10 animate-fade-in pb-20">
      
      {/* NAVIGATION - Responsive Sidebar/Header */}
      <aside className="w-full lg:w-80 flex flex-col gap-4">
        <div className="px-2 mb-2 lg:mb-6">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Administration</p>
           <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Neural <span className="text-emerald-500 not-italic">Core</span></h2>
        </div>

        {/* Mobile Horizontal Tabs / Desktop Vertical List */}
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`group flex flex-shrink-0 items-center gap-4 p-4 lg:p-5 rounded-2xl lg:rounded-[2rem] border transition-all text-left relative overflow-hidden min-w-[160px] lg:min-w-0 ${
                activeTab === tab.id 
                ? 'bg-white/[0.03] border-white/10 shadow-xl' 
                : 'bg-transparent border-transparent opacity-40 hover:opacity-100'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-indicator" 
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-${tab.color}-500 hidden lg:block`} 
                />
              )}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-indicator-mobile" 
                  className={`absolute left-0 right-0 bottom-0 h-1 bg-${tab.color}-500 lg:hidden`} 
                />
              )}
              
              <div className={`p-2.5 lg:p-3 rounded-xl lg:rounded-2xl transition-all ${
                activeTab === tab.id 
                ? `bg-${tab.color}-500 text-black shadow-lg shadow-${tab.color}-500/20` 
                : 'bg-white/5 text-slate-500 group-hover:text-white'
              }`}>
                 <tab.icon className="w-4 h-4 lg:w-5 lg:h-5" />
              </div>

              <div className="flex-1">
                 <p className={`text-[10px] lg:text-xs font-black uppercase tracking-tight ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>
                    {tab.label}
                 </p>
                 <p className="text-[8px] lg:text-[9px] font-bold text-slate-600 line-clamp-1 hidden lg:block">{tab.desc}</p>
              </div>

              {activeTab === tab.id && <ChevronRight className="w-4 h-4 text-slate-500 hidden lg:block" />}
            </button>
          ))}
        </nav>

        <div className="hidden lg:block mt-auto p-6 bg-white/[0.02] rounded-[2rem] border border-white/5">
           <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <p className="text-[10px] font-black text-white uppercase">System Status</p>
           </div>
           <p className="text-[8px] font-bold text-emerald-500 mt-2 tracking-widest uppercase">Nodes Synchronized</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'core' && (
            <motion.div 
              key="core" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
               {/* Scheduler Matrix */}
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 space-y-6 lg:y-8">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">Scheduler Matrix</h3>
                        <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Delivery Windows</p>
                     </div>
                     <div className="p-3 lg:p-4 bg-emerald-500/10 rounded-2xl lg:rounded-3xl">
                        <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
                     </div>
                  </div>
                  
                  <HourMatrix />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 flex items-center gap-4">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <div>
                           <p className="text-[9px] font-black text-slate-500 uppercase">Daily Frequency</p>
                           <p className="text-sm font-black text-white">{getValue('PUSH_SCHEDULE_HOURS').split(',').length} Cycles</p>
                        </div>
                     </div>
                     <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 flex items-center gap-4">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <div>
                           <p className="text-[9px] font-black text-slate-500 uppercase">Active Timezone</p>
                           <p className="text-sm font-black text-white">{getValue('PUSH_TIMEZONE')}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Thresholds Slider */}
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                  <div className="flex-1 space-y-6 w-full">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                           <h4 className="text-base lg:text-lg font-black text-white uppercase">Data Threshold</h4>
                           <p className="text-[9px] font-bold text-slate-500 uppercase">Max Daily Broadcasts</p>
                        </div>
                        <span className="text-3xl lg:text-4xl font-black text-emerald-500 tabular-nums">{getValue('MAX_DAILY_PUSHES')}</span>
                     </div>
                     <input 
                        type="range" min="1" max="50" step="1"
                        value={getValue('MAX_DAILY_PUSHES')}
                        onChange={(e) => updateMutation.mutate({ key: 'MAX_DAILY_PUSHES', value: e.target.value })}
                        className="w-full accent-emerald-500 h-2 bg-white/5 rounded-full appearance-none cursor-pointer"
                     />
                  </div>
                  <div className="w-full md:w-48 p-4 lg:p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl lg:rounded-3xl flex flex-col items-center gap-2">
                     <ShieldCheck className="w-6 h-6 lg:w-8 lg:h-8 text-emerald-500" />
                     <p className="text-[9px] lg:text-[10px] font-black text-white uppercase text-center tracking-tight">Congestion Protocol Active</p>
                  </div>
               </div>

               {/* Security Credentials */}
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10">
                  <div className="flex items-center gap-3 mb-6 lg:mb-8">
                     <Terminal className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
                     <h3 className="text-base lg:text-lg font-black text-white uppercase tracking-tight">Security Layer</h3>
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
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-emerald-500/30 outline-none transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                               {s.key.includes('PRIVATE') && (
                                 <button onClick={() => setShowToken(!showToken)} className="p-2 text-slate-700 hover:text-white">
                                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                 </button>
                               )}
                               <button 
                                 onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })}
                                 className="p-2 bg-white/5 hover:bg-emerald-500 text-slate-500 hover:text-black rounded-xl transition-all"
                               >
                                  <Save className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
               <div className="grid grid-cols-1 gap-6">
                  {/* Channels Card */}
                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10">
                     <div className="flex items-center justify-between mb-8 lg:mb-10">
                        <div className="space-y-1">
                           <h3 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">Delivery Channels</h3>
                           <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest">Toggle active notification streams</p>
                        </div>
                        <div className="p-3 lg:p-4 bg-blue-500/10 rounded-2xl lg:rounded-3xl">
                           <Radio className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                          { key: 'ENABLE_TELEGRAM_PUSH', label: 'Telegram', desc: 'Secure bot messaging', icon: MessageSquare, color: 'emerald' },
                          { key: 'ENABLE_WEB_PUSH', label: 'Chrome', desc: 'Direct browser layer', icon: Globe, color: 'blue' }
                        ].map(sw => {
                           const active = getValue(sw.key) === 'true';
                           return (
                             <div key={sw.key} 
                               onClick={() => updateMutation.mutate({ key: sw.key, value: active ? 'false' : 'true' })}
                               className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all flex flex-col gap-6 ${active ? `bg-${sw.color}-500/5 border-${sw.color}-500/20 shadow-xl shadow-${sw.color}-500/5` : 'bg-white/5 border-white/5 opacity-50'}`}
                             >
                                <div className="flex items-center justify-between">
                                   <div className={`p-4 rounded-2xl ${active ? `bg-${sw.color}-500 text-black` : 'bg-slate-800 text-slate-500'}`}>
                                      <sw.icon className="w-6 h-6" />
                                   </div>
                                   <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? `bg-${sw.color}-500` : 'bg-slate-700'}`}>
                                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                                   </div>
                                </div>
                                <div>
                                   <p className="text-lg font-black text-white uppercase leading-none">{sw.label}</p>
                                   <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">{active ? 'Protocol Active' : 'Offline'}</p>
                                </div>
                             </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* Universal Test Card */}
                   <div className="bg-gradient-to-br from-blue-600/10 via-white/[0.01] to-emerald-500/5 border border-white/5 rounded-2xl lg:rounded-[3rem] p-8 lg:p-12 relative overflow-hidden group">
                     <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-48 lg:w-64 h-48 lg:h-64 -translate-y-8 lg:-translate-y-12 translate-x-8 lg:translate-x-12" />
                     </div>
                     <div className="relative z-10 max-w-lg space-y-6">
                        <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter">Universal Broadcast Test</h3>
                        <p className="text-[11px] lg:text-sm text-slate-400 font-medium leading-relaxed">Execute a full-stack diagnostic pulse. The system will select a knowledge fragment and attempt transmission through all active notification layers simultaneously.</p>
                        <button 
                           onClick={executeBroadcastTest}
                           disabled={broadcastLoading}
                           className="w-full sm:w-auto px-8 lg:px-10 py-4 lg:py-5 bg-white text-black rounded-xl lg:rounded-[2rem] text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-black hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-30"
                        >
                           {broadcastLoading ? 'Broadcasting Pulsar...' : 'Transmit Test Pulse'}
                        </button>
                     </div>
                   </div>

                  {/* Bot Credentials */}
                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10">
                     <div className="flex items-center gap-3 mb-6 lg:mb-8">
                        <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                        <h3 className="text-base lg:text-lg font-black text-white uppercase tracking-tight">Telegram Infrastructure</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {settings?.filter((s: any) => s.category === 'bot').map((s: any) => (
                           <div key={s.key} className="space-y-1">
                              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">{s.description}</label>
                              <div className="relative group">
                                 <input 
                                   type={s.key.includes('TOKEN') && !showToken ? 'password' : 'text'}
                                   value={getEditValue(s.key)}
                                   onChange={(e) => setEditValue(s.key, e.target.value)}
                                   className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-blue-500/30 outline-none transition-all"
                                 />
                                 <button onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-700 hover:text-blue-500">
                                    <Save className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'sso' && (
            <motion.div 
              key="sso" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SSO Switch */}
                   <div 
                    onClick={() => {
                      const active = getValue('ENABLE_SSO') === 'true';
                      updateMutation.mutate({ key: 'ENABLE_SSO', value: active ? 'false' : 'true' });
                    }}
                    className={`md:col-span-1 p-6 lg:p-10 rounded-2xl lg:rounded-[3rem] border cursor-pointer transition-all flex flex-col justify-between group h-full ${getValue('ENABLE_SSO') === 'true' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}
                  >
                     <div className="flex items-center justify-between mb-8 lg:mb-0">
                        <div className={`p-4 lg:p-6 rounded-2xl lg:rounded-3xl ${getValue('ENABLE_SSO') === 'true' ? 'bg-indigo-500 text-black shadow-xl shadow-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
                           <Key className="w-6 h-6 lg:w-10 lg:h-10" />
                        </div>
                        <div className={`w-12 lg:w-14 h-6 lg:h-7 rounded-full p-1 transition-colors ${getValue('ENABLE_SSO') === 'true' ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                           <div className={`w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-white transition-transform ${getValue('ENABLE_SSO') === 'true' ? 'translate-x-6 lg:translate-x-7' : 'translate-x-0'}`} />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter">Central Auth</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{getValue('ENABLE_SSO') === 'true' ? 'Authentication Online' : 'Service Silenced'}</p>
                     </div>
                   </div>

                  {/* SSO Configuration */}
                   <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl lg:rounded-[3rem] p-6 lg:p-10 space-y-8 lg:space-y-10">
                      <div className="grid grid-cols-1 gap-6">
                         {settings?.filter((s: any) => s.category === 'sso' && s.key !== 'ENABLE_SSO').map((s: any) => (
                           <div key={s.key} className="space-y-1">
                              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">{s.description}</label>
                              <div className="relative">
                                 <input 
                                   type={s.key.includes('SECRET') && !showToken ? 'password' : 'text'}
                                   value={getEditValue(s.key)}
                                   onChange={(e) => setEditValue(s.key, e.target.value)}
                                   className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-[13px] lg:text-sm font-bold text-white focus:border-indigo-500/30 outline-none transition-all"
                                 />
                                 <button onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-700 hover:text-indigo-500 transition-colors">
                                    <Save className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                         ))}
                      </div>
                      
                      <div className="pt-8 lg:pt-10 border-t border-white/5">
                         <button 
                           onClick={executeSsoTest}
                           disabled={ssoTestLoading}
                           className="w-full py-5 lg:py-6 bg-white/5 border border-white/10 rounded-2xl lg:rounded-[2.5rem] text-[10px] lg:text-xs font-black uppercase tracking-widest hover:bg-indigo-500/10 hover:text-indigo-400 transition-all active:scale-95 flex items-center justify-center gap-4"
                         >
                           {ssoTestLoading ? <Layers className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Wifi className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />}
                           {ssoTestLoading ? 'Handshaking...' : 'Verify Link'}
                         </button>
                         
                         <AnimatePresence>
                           {ssoTestResult && (
                             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 lg:mt-6 p-4 lg:p-6 rounded-2xl border flex items-center gap-4 ${ssoTestResult.success ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-red-500/5 border-red-500/10 text-red-400'}`}>
                                <Activity className="w-5 h-5 lg:w-6 lg:h-6" />
                                <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-tight">{ssoTestResult.message || ssoTestResult.error}</span>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </div>
                   </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* STICKY BROADCAST TOAST */}
      <AnimatePresence>
        {broadcastResult && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 lg:bottom-10 right-4 lg:right-10 w-[calc(100%-2rem)] max-w-sm z-[100]"
          >
             <div className="bg-[#1e293b]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 lg:p-3 bg-emerald-500 rounded-xl lg:rounded-2xl shadow-lg shadow-emerald-500/40"><Activity className="w-4 h-4 lg:w-5 lg:h-5 text-black" /></div>
                      <h4 className="text-[10px] lg:text-[11px] font-black uppercase text-white tracking-widest">Diagnostic Report</h4>
                   </div>
                   <button onClick={() => setBroadcastResult(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-4 h-4 text-slate-500" />
                   </button>
                </div>
                <div className="space-y-3 lg:space-y-4">
                   <div className="bg-black/40 p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/5 flex justify-between items-center">
                      <p className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase">Telegram</p>
                      <p className="text-[11px] lg:text-xs font-black text-emerald-400 uppercase">{broadcastResult.telegram}</p>
                   </div>
                   <div className="bg-black/40 p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-white/5 flex justify-between items-center">
                      <p className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase">Chrome</p>
                      <p className="text-[11px] lg:text-xs font-black text-blue-400 uppercase">{broadcastResult.web_push}</p>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
