import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Brain, Trash2, Archive, Clock, Tag, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react'
import api from '@/api/client'
import MemoryBadge from '@/components/MemoryBadge'

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
      qc.invalidateQueries({ queryKey: ['reminders-infinite'] })
    },
  })

  if (isLoading) return <div className="p-20 text-center animate-pulse text-emerald-500"><Brain className="w-12 h-12 mx-auto mb-4" /></div>
  if (!r) return <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest">Knowledge Lost</div>

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-3 -ml-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => archiveMutation.mutate()} className={`p-3 rounded-2xl transition-all border ${r.is_archived ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 shadow-sm hover:bg-slate-50'}`}>
            <Archive className="w-5 h-5" />
          </button>
          <button onClick={() => { if(confirm('Permanently delete this knowledge?')) deleteMutation.mutate() }} className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 shadow-sm transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="bg-white rounded-[3rem] p-8 md:p-14 border border-slate-100 card-shadow space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <Sparkles className="w-32 h-32 text-emerald-500" />
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <MemoryBadge level={r.memory_level} size="lg" />
              <div className="h-px flex-1 bg-slate-50" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight title-tracking">
              {r.title || 'Untitled Research Note'}
            </h1>
            <p className="text-lg md:text-xl font-medium text-slate-600 leading-relaxed whitespace-pre-wrap selection:bg-emerald-100 selection:text-emerald-900">
              {r.content_text}
            </p>
          </div>

          {r.attachments && r.attachments.length > 0 && (
            <div className="grid grid-cols-1 gap-6 pt-4 relative z-10">
              {r.attachments.map((a: any) => (
                <div key={a.id} className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl">
                  <img src={`/api/attachments/${a.id}/file`} className="w-full h-auto" alt="" />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-6 relative z-10">
            {r.tags && r.tags.map((tag: string) => (
              <span key={tag} className="px-5 py-2 bg-slate-50 text-slate-500 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                <Tag className="w-3.5 h-3.5 text-emerald-500" /> {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Assessment Controls - Large & Prominent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => interactMutation.mutate('understand')}
            className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl card-shadow hover:border-emerald-200 transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                  <BookOpen className="w-6 h-6" />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Understood</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Level +1</p>
               </div>
            </div>
          </button>

          <button 
            onClick={() => interactMutation.mutate('mastered')}
            className="group flex items-center justify-between p-6 bg-emerald-600 border border-emerald-500 rounded-3xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle2 className="w-6 h-6" />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-white uppercase tracking-tighter">Fully Mastered</p>
                  <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Level +2</p>
               </div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 card-shadow flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Integration Date</p>
              <p className="text-xs font-bold text-slate-900">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-100 card-shadow flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Reinforcement</p>
              <p className="text-xs font-bold text-slate-900">{new Date(r.next_push_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
