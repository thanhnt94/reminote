import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Brain, Trash2, Archive, Clock, 
  Tag, Sparkles, BookOpen, CheckCircle2, 
  Calendar, RotateCcw, ShieldAlert, Pencil,
  Maximize2, X, Zap, Target
} from 'lucide-react'
import api from '@/api/client'
import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function ReminderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showInteractModal, setShowInteractModal] = useState(false)

  const { data: r, isLoading } = useQuery({
    queryKey: ['reminders', id],
    queryFn: async () => (await api.get(`/api/reminders/${id}`)).data,
  })

  const interactMutation = useMutation({
    mutationFn: async (action: string) => await api.post(`/api/reminders/${id}/interact`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      setShowInteractModal(false)
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
    <>
      <div className="w-full max-w-[1400px] mx-auto pb-32 px-4 space-y-8 relative">
        
        {/* FIXED ACTION HEADER */}
        <div className="sticky top-0 z-[120] -mx-4 px-4 py-3 bg-[#020617]/80 backdrop-blur-md flex items-center justify-between gap-2 border-b border-white/5 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-90"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowInteractModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
            >
               <Target className="w-3.5 h-3.5" /> Reinforce
            </button>
            <button 
              onClick={() => navigate(`/reminders/${id}/edit`)} 
              className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 border border-white/5 transition-all active:scale-90"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={() => archiveMutation.mutate()} 
              className={`p-2.5 rounded-xl border transition-all active:scale-90 ${r.is_archived ? 'bg-emerald-500 text-black border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
            >
              {r.is_archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => { if(confirm('Permanently delete this knowledge?')) deleteMutation.mutate() }} 
              className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-white/5 transition-all active:scale-90"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Core Content Node */}
          <div className="bg-[#0f172a] rounded-[3.5rem] p-8 md:p-16 border border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Sparkles className="w-48 h-48 text-emerald-500" />
            </div>

            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Neural Fragment</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-none tracking-tight drop-shadow-2xl">
                {r.title || 'Untitled Knowledge Node'}
              </h1>

              <div className="flex items-center gap-3">
                 <div className="w-12 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                 <span className={`text-[9px] font-black uppercase tracking-widest ${r.manual_weight === 'high' ? 'text-emerald-500' : 'text-slate-500'}`}>
                    Priority: {r.manual_weight}
                 </span>
              </div>

              <div className="pt-4">
                <MarkdownRenderer content={r.content_text || ''} className="!text-lg !leading-relaxed" />
              </div>
            </div>

            {/* Media Assets (Thumbnails) */}
            {r.attachments && r.attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-8 relative z-10 border-t border-white/5">
                {r.attachments.map((a: any) => (
                  <div key={a.id} className="group relative inline-block max-w-[200px]">
                     <div 
                       onClick={() => setSelectedImage(`/api/attachments/${a.id}/file`)}
                       className="cursor-pointer rounded-[1.5rem] overflow-hidden border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all shadow-xl"
                     >
                       <img 
                         src={`/api/attachments/${a.id}/file`} 
                         className="w-full h-auto max-h-[150px] object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                         alt="Knowledge Asset" 
                       />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white" />
                       </div>
                     </div>
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

          {/* Telemetry Data */}
          <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 flex items-center gap-5">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Node Integrated</p>
              <p className="text-xs font-bold text-slate-300">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODALS RENDERED AT TOP LEVEL TO AVOID STACKING CONTEXT ISSUES */}
      <AnimatePresence>
        {showInteractModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-[#020617]/95 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setShowInteractModal(false)}
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
               className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[3.5rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] space-y-10"
               onClick={e => e.stopPropagation()}
             >
                <div className="text-center space-y-3">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <Target className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-extrabold text-white tracking-tight uppercase italic">Reinforce <span className="text-emerald-500 not-italic">Knowledge</span></h2>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Update memory tier for this fragment</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => interactMutation.mutate('understand')}
                    className="group flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-all">
                          <BookOpen className="w-7 h-7" />
                       </div>
                       <div className="text-left">
                          <p className="text-base font-bold text-white uppercase tracking-tight">Understood</p>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Strength +1</p>
                       </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => interactMutation.mutate('mastered')}
                    className="group flex items-center justify-between p-6 bg-emerald-600 border border-emerald-500 rounded-[2rem] shadow-[0_20px_40px_rgba(16,185,129,0.2)] hover:bg-emerald-500 transition-all"
                  >
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                          <CheckCircle2 className="w-7 h-7" />
                       </div>
                       <div className="text-left">
                          <p className="text-base font-bold text-white uppercase tracking-tight">Mastered</p>
                          <p className="text-[10px] text-emerald-100 font-semibold uppercase tracking-widest">Strength +2</p>
                       </div>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setShowInteractModal(false)}
                  className="w-full py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors"
                >
                  Dismiss Interaction
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
               className="relative max-w-full max-h-full flex items-center justify-center"
               onClick={e => e.stopPropagation()}
             >
                <img 
                  src={selectedImage} 
                  className="max-w-full max-h-[90vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 object-contain"
                />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-6 -right-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 shadow-2xl z-[510]"
                >
                   <X className="w-7 h-7" />
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
