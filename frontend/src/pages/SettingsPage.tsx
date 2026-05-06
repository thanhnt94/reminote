import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Settings, Bell, Shield, LogOut, Send, 
  Smartphone, Globe, Bot, Save, Check, 
  Cpu, Moon, Clock, Zap, Layers, Link as LinkIcon, User as UserIcon, AlertCircle,
  ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/api/client'

// Utility for Web Push
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const { user, logout, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null)
  
  const [tgUsername, setTgUsername] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  
  const [pushLoading, setPushLoading] = useState(false)
  const [pushStatus, setPushStatus] = useState<string | null>(null)

  // Local state for notification settings
  const [pushInterval, setPushInterval] = useState(user?.push_interval_minutes || 60)
  const [quietStart, setQuietStart] = useState(user?.quiet_hour_start || 23)
  const [quietEnd, setQuietEnd] = useState(user?.quiet_hour_end || 7)

  useEffect(() => {
    if (user) {
      setPushInterval(user.push_interval_minutes)
      setQuietStart(user.quiet_hour_start)
      setQuietEnd(user.quiet_hour_end)
    }
  }, [user])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put('/api/auth/profile/settings', {
        push_interval_minutes: pushInterval,
        quiet_hour_start: quietStart,
        quiet_hour_end: quietEnd
      })
    },
    onSuccess: () => {
      fetchMe()
      qc.invalidateQueries({ queryKey: ['reminders-due-count'] })
    }
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      setLinkError(null)
      await api.post('/api/auth/profile/link-telegram', {
        telegram_username: tgUsername
      })
    },
    onSuccess: () => {
      fetchMe()
    },
    onError: (err: any) => {
      setLinkError(err.response?.data?.detail || "Connection failed. Did you chat with the bot?")
    }
  })

  const sendTestPush = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      await api.post('/api/reminders/test-push')
      setTestResult({ success: true, message: 'Neural Digest dispatched to Telegram.' })
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: err.response?.data?.detail || 'Failed to dispatch digest.' 
      })
    } finally {
      setTestLoading(false)
    }
  }

  const enableWebPush = async () => {
    setPushLoading(true)
    setPushStatus(null)
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        throw new Error("Permission denied by browser.")
      }

      const { data: { publicKey } } = await api.get('/api/auth/vapid-public-key')
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      await api.post('/api/auth/profile/web-push', subscription)
      setPushStatus("Browser successfully linked to Neural Core.")
    } catch (err: any) {
      setPushStatus(`Error: ${err.message}`)
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Node Operator</p>
          <h1 className="text-2xl font-black text-white tracking-tighter">System Configuration</h1>
        </div>
        <button onClick={logout} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Identity & Seamless Sync */}
      <section className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 space-y-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-500 text-[#020617] rounded-[1.5rem] flex items-center justify-center text-xl font-black shadow-xl shadow-emerald-500/10">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white tracking-tight">{user?.username}</h2>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{user?.is_admin ? 'Root Access' : 'Standard Node'}</p>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seamless Linking Interface (Telegram) */}
              <div className="p-7 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-5">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Telegram Link</h4>
                  </div>
                  {!user?.telegram_chat_id ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input 
                          type="text" 
                          placeholder="@username"
                          value={tgUsername}
                          onChange={(e) => setTgUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-[11px] font-bold text-white focus:border-emerald-500/30 outline-none transition-all placeholder:text-slate-700"
                        />
                      </div>
                      <button 
                        onClick={() => linkMutation.mutate()}
                        disabled={linkMutation.isPending || !tgUsername}
                        className="w-full py-3 bg-emerald-500 text-[#020617] rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.01] transition-all disabled:opacity-30"
                      >
                        {linkMutation.isPending ? 'Syncing...' : 'Connect'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-500/80">
                      <Check className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Connection</span>
                    </div>
                  )}
              </div>

              {/* Web Push Interface (Chrome) */}
              <div className="p-7 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-5">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400">Chrome Push</h4>
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={enableWebPush}
                      disabled={pushLoading}
                      className="w-full py-3 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.01] transition-all shadow-xl shadow-blue-500/10 disabled:opacity-30"
                    >
                      {pushLoading ? 'Initializing...' : 'Enable Chrome Link'}
                    </button>
                    {pushStatus && (
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest text-center">{pushStatus}</p>
                    )}
                  </div>
              </div>
           </div>
        </div>
      </section>

      {/* Sync Preferences */}
      <section className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Reinforcement Settings</h3>
        </div>

        <div className="p-8 space-y-10">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Digest Interval</label>
             </div>
             <div className="flex items-center gap-4">
                <input 
                  type="range" min="15" max="240" step="15"
                  value={pushInterval}
                  onChange={(e) => setPushInterval(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-sm font-black text-white w-20 text-right">{pushInterval}m</span>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
             <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Quiet Start (HR)</label>
                <input 
                  type="number" min="0" max="23"
                  value={quietStart}
                  onChange={(e) => setQuietStart(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all"
                />
             </div>
             <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Quiet End (HR)</label>
                <input 
                  type="number" min="0" max="23"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all"
                />
             </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
             <button 
               onClick={sendTestPush}
               disabled={testLoading || !user?.telegram_chat_id}
               className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20"
             >
               {testLoading ? 'Processing...' : 'Trigger Test Digest'}
             </button>
             <button 
               onClick={() => saveMutation.mutate()}
               disabled={saveMutation.isPending}
               className="flex-1 px-6 py-4 bg-emerald-500 text-[#020617] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all"
             >
               {saveMutation.isPending ? 'Syncing...' : 'Save Configuration'}
             </button>
          </div>

          {testResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl text-[10px] font-bold border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
            >
              {testResult.message}
            </motion.div>
          )}
        </div>
      </section>

      {/* Admin Access Portal */}
      {user?.is_admin && (
        <section className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 flex items-center justify-between group cursor-pointer hover:border-emerald-500/30 transition-all"
          onClick={() => navigate('/admin')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-[#020617] transition-all">
              <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:text-[#020617]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">System Administration</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manage nodes, users, and core protocols</p>
            </div>
          </div>
          <Zap className="w-5 h-5 text-slate-800 group-hover:text-emerald-500 transition-all" />
        </section>
      )}

      <div className="pt-10 flex flex-col items-center opacity-10">
         <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Neural Network Core v2.4.0</p>
      </div>
    </div>
  )
}
