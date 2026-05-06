import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Brain, X, Check, Zap, RotateCcw, Cpu, Sparkles } from 'lucide-react'
import api from '@/api/client'
import MemoryBadge from '@/components/MemoryBadge'

interface Reminder {
  id: number
  title: string | null
  content_text: string | null
  memory_level: number
  next_push_at: string
  attachments: any[]
}

export default function ReviewPage() {
  const qc = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [queue, setQueue] = useState<Reminder[]>([])

  const { data: initialData, isLoading, refetch } = useQuery({
    queryKey: ['reminders-review-queue'],
    queryFn: async () => (await api.get('/api/reminders/review-queue')).data,
  })

  // Initialize and refill queue
  useEffect(() => {
    if (initialData) {
      if (currentIndex === 0) {
        setQueue(initialData)
      } else {
        // Append unique items
        setQueue(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          const newItems = initialData.filter((i: Reminder) => !existingIds.has(i.id))
          return [...prev, ...newItems]
        })
      }
    }
  }, [initialData])

  // Refetch when reaching near the end of the queue
  useEffect(() => {
    if (queue.length > 0 && currentIndex >= queue.length - 2) {
      refetch()
    }
  }, [currentIndex, queue.length])

  const interactMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number, action: string }) => 
      await api.post(`/api/reminders/${id}/interact`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders-due-count'] })
    }
  })

  const handleSwipe = (id: number, direction: 'left' | 'right') => {
    interactMutation.mutate({ 
      id, 
      action: direction === 'right' ? 'mastered' : 'review' 
    })
    setCurrentIndex(prev => prev + 1)
    setIsExpanded(false)
  }

  if (isLoading && queue.length === 0) return <div className="h-full flex items-center justify-center text-emerald-500"><Cpu className="w-10 h-10 animate-spin" /></div>

  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
          <div className="relative w-28 h-28 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-slate-500 shadow-2xl border border-white/10">
            <Zap className="w-14 h-14" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tighter">No Knowledge</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Submit assets to begin reinforcement.</p>
        </div>
      </div>
    )
  }

  const currentItem = queue[currentIndex]

  return (
    <div className="h-full flex flex-col items-center justify-start relative pt-4 pb-2 px-4 overflow-hidden">
      
      {/* Background Stack Decoration */}
      <div className="absolute top-20 w-[85%] aspect-[3/4.5] bg-white/5 rounded-[3.5rem] rotate-2 -z-10 border border-white/5" />
      <div className="absolute top-16 w-[90%] aspect-[3/4.5] bg-white/5 rounded-[3.5rem] -rotate-1 -z-10 border border-white/5" />

      <div className="w-full max-w-sm h-[75vh] relative perspective-1000">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <SwipeCard 
              key={currentItem.id} 
              item={currentItem} 
              onSwipe={(dir) => handleSwipe(currentItem.id, dir)}
              onTap={() => setIsExpanded(true)}
            />
          ) : (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 100 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 100 }}
               className="absolute inset-0 bg-[#0f172a] rounded-[3.5rem] shadow-2xl flex flex-col z-50 overflow-hidden border border-white/10"
             >
                <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                  <div className="flex items-center justify-between">
                    <MemoryBadge level={currentItem.memory_level} size="sm" />
                    <button onClick={() => setIsExpanded(false)} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{currentItem.title || 'Knowledge Fragment'}</h2>
                    <div className="w-16 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                  {currentItem.attachments?.length > 0 && (
                    <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
                      <img src={`/api/attachments/${currentItem.attachments[0].id}/file`} className="w-full h-auto opacity-90" />
                    </div>
                  )}
                  <p className="text-slate-300 text-lg font-medium leading-relaxed whitespace-pre-wrap pb-10">
                    {currentItem.content_text}
                  </p>
                </div>
                
                <div className="p-8 bg-black/40 backdrop-blur-md border-t border-white/5 flex gap-4">
                  <button 
                    onClick={() => handleSwipe(currentItem.id, 'left')}
                    className="flex-1 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-red-400 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Review
                  </button>
                  <button 
                    onClick={() => handleSwipe(currentItem.id, 'right')}
                    className="flex-1 py-5 bg-emerald-600 text-[#020617] rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
                  >
                    Mastered
                  </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col justify-center opacity-10">
         <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.6em]">Infinite Recall Enabled</p>
      </div>
    </div>
  )
}

function SwipeCard({ item, onSwipe, onTap }: { item: Reminder, onSwipe: (dir: 'left' | 'right') => void, onTap: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  
  const likeOpacity = useTransform(x, [50, 150], [0, 1])
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1])

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 120) onSwipe('right')
    else if (info.offset.x < -120) onSwipe('left')
  }

  const hasImage = item.attachments && item.attachments.length > 0

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      className="absolute inset-0 bg-[#0f172a] rounded-[3.5rem] shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden border border-white/5"
    >
      <div className="absolute inset-0 z-0 bg-slate-900">
        {hasImage ? (
          <img 
            src={`/api/attachments/${item.attachments[0].id}/file`} 
            className="w-full h-full object-cover opacity-60" 
            alt="" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center opacity-20">
            <Sparkles className="w-40 h-40 text-emerald-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
      </div>

      <motion.div 
        style={{ opacity: likeOpacity }}
        className="absolute top-20 left-10 border-4 border-emerald-500 rounded-2xl px-6 py-2 -rotate-12 z-20 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.5)]"
      >
        <span className="text-4xl font-black text-emerald-500 uppercase">MASTERED</span>
      </motion.div>
      <motion.div 
        style={{ opacity: nopeOpacity }}
        className="absolute top-20 right-10 border-4 border-red-500 rounded-xl px-6 py-2 rotate-12 z-20 pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.5)]"
      >
        <span className="text-4xl font-black text-red-500 uppercase">REVIEW</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-12 z-10 space-y-6">
        <div className="flex items-center gap-4">
           <MemoryBadge level={item.memory_level} size="sm" />
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Neural Link</span>
        </div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
            {item.title || 'Untitled Fragment'}
          </h2>
          <p className="text-slate-400 text-sm font-medium line-clamp-3 leading-relaxed">
            {item.content_text}
          </p>
        </div>
        
        <div className="pt-6 flex items-center gap-3">
          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               animate={{ x: [-50, 50] }} 
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-full h-full bg-emerald-500" 
             />
          </div>
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Analyze</span>
        </div>
      </div>
    </motion.div>
  )
}
