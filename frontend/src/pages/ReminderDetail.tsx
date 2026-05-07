import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Brain, Trash2, Archive, Clock, 
  Tag, Sparkles, BookOpen, CheckCircle2, 
  Calendar, RotateCcw, ShieldAlert, Pencil
} from 'lucide-react'
import api from '@/api/client'
import MemoryBadge from '@/components/MemoryBadge'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function ReminderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: r, isLoading } = useQuery({
    queryKey: ['reminders', id],
    queryFn: async () => (await api.get(`/api/reminders/${id}`)).data,
  })

  const interactMutation = useMutation({
    mutationFn: async (action: string) => await api.post(`/api/reminders/${id}/interact`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      navigate('/dashboard')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => await api.delete(`/api/reminders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      navigate('/dashboard')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => await api.post(`/api/reminders/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  if (isLoading) return <div className="p-20 text-center animate-pulse text-emerald-500"><Brain className="w-12 h-12 mx-auto mb-4" /></div>
  if (!r) return <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest">Knowledge Lost</div>

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8 animate-fade-in">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(`/reminders/${id}/edit`)} 
            className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 border border-white/5 transition-all active:scale-90"
            title="Edit Knowledge Node"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button 
            onClick={() => archiveMutation.mutate()} 
            className={`p-4 rounded-2xl border transition-all active:scale-90 ${r.is_archived ? 'bg-emerald-500 text-black border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
          >
            {r.is_archived ? <RotateCcw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => { if(confirm('Permanently delete this knowledge?')) deleteMutation.mutate() }} 
            className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-white/5 transition-all active:scale-90"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Core Content Node */}
        <div className="bg-[#0f172a] rounded-[3rem] p-8 md:p-16 border border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Sparkles className="w-48 h-48 text-emerald-500" />
          </div>

          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-4">
              <MemoryBadge level={r.memory_level} size="lg" />
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Neural Fragment</span>
            </div>
            
            <h1 className="text-3xl md:text-6xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">
              {r.title || 'Untitled Knowledge Node'}
            </h1>

            <div className="w-20 h-2 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

            {/* Markdown Integrated Renderer */}
            <div className="pt-4">
              <MarkdownRenderer content={r.content_text || ''} className="!text-lg !leading-relaxed" />
            </div>
          </div>

          {/* Media Assets */}
          {r.attachments && r.attachments.length > 0 && (
            <div className="grid grid-cols-1 gap-8 pt-8 relative z-10 border-t border-white/5">
              {r.attachments.map((a: any) => (
                <div key={a.id} className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group">
                  <img 
                    src={`/api/attachments/${a.id}/file`} 
                    className="w-full h-auto opacity-90 transition-transform duration-1000 group-hover:scale-105" 
                    alt="Knowledge Asset" 
                  />
                </div>
              ))}
            </div>
          )}

          {/* Metadata Tags */}
          <div className="flex flex-wrap gap-2 pt-6 relative z-10">
            {r.tags && r.tags.map((tag: string) => (
              <span key={tag} className="px-5 py-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-default">
                <Tag className="w-3.5 h-3.5 text-emerald-500" /> {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tactical Reinforcement Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => interactMutation.mutate('understand')}
            className="group flex items-center justify-between p-8 bg-white/5 border border-white/5 rounded-[2.5rem] hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all active:scale-95"
          >
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-all">
                  <BookOpen className="w-7 h-7" />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-white uppercase tracking-tight">Understood</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Strength +1</p>
               </div>
            </div>
          </button>

          <button 
            onClick={() => interactMutation.mutate('mastered')}
            className="group flex items-center justify-between p-8 bg-emerald-600 border border-emerald-500 rounded-[2.5rem] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95"
          >
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle2 className="w-7 h-7" />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-white uppercase tracking-tight">Mastered</p>
                  <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Strength +2</p>
               </div>
            </div>
          </button>
        </div>

        {/* Telemetry Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Node Integrated</p>
              <p className="text-xs font-bold text-slate-300">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Next Reinforcement</p>
              <p className="text-xs font-bold text-slate-300">{new Date(r.next_push_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
