import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { motion } from 'framer-motion'
import { Brain, Lock, User, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Sai tên đăng nhập hoặc mật khẩu')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-200/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-amber-500/10 mb-6 border border-slate-50 rotate-6">
            <Brain className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">RemiNote</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Spaced Repetition System</p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Sparkles className="w-20 h-20 text-amber-500" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài khoản</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-300 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  placeholder="•••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg border border-red-100">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-600 shadow-xl shadow-amber-500/30 transition-all active:scale-95 group"
            >
              Đăng nhập
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        <p className="text-center mt-10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Phát triển bởi <span className="text-slate-600">Ecosystem Team</span>
        </p>
      </motion.div>
    </div>
  )
}
