import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, User, Lock, ArrowRight, Brain, Zap, Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Access denied.')
    } finally {
      setLoading(false)
    }
  }

  const handleSSO = () => {
    window.location.href = '/auth-center/login'
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] space-y-10 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-5 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl relative group">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <Brain className="w-12 h-12 text-emerald-500 relative z-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              Remi<span className="text-emerald-500 not-italic">Note</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Aggressive Knowledge OS</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f172a]/50 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-10 shadow-2xl space-y-8">
           {/* SSO Quick Link */}
           <button 
            onClick={handleSSO}
            className="w-full flex items-center justify-between p-5 bg-emerald-500 text-[#020617] rounded-3xl hover:bg-emerald-400 transition-all active:scale-95 group shadow-xl shadow-emerald-500/20"
           >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-sm font-black uppercase tracking-tight">SSO Authorization</span>
              </div>
              <ArrowRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
           </button>

           <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Internal Protocol</span>
              <div className="h-px flex-1 bg-white/5" />
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                 <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Node Operator ID"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm font-bold text-white focus:border-emerald-500/30 outline-none transition-all placeholder:text-slate-800"
                      required
                    />
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="Access Cipher"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-sm font-bold text-white focus:border-emerald-500/30 outline-none transition-all placeholder:text-slate-800"
                      required
                    />
                 </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl animate-shake">
                   <Zap className="w-4 h-4 text-red-500" />
                   <p className="text-[10px] font-black text-red-400 uppercase leading-tight">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-30"
              >
                {loading ? 'Decrypting Access...' : 'Initiate Secure Login'}
              </button>
           </form>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-8 opacity-20 hover:opacity-40 transition-opacity">
           <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">v1.2.0-core</span>
           </div>
           <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
           <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Protected Environment</span>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
