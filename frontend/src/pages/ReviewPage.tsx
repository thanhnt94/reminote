import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Brain, Check, Zap, RotateCcw, Cpu, Sparkles, Heart, X as CloseIcon, Maximize2 } from 'lucide-react'
import api from '@/api/client'
import MemoryBadge from '@/components/MemoryBadge'
import MarkdownRenderer from '@/components/MarkdownRenderer'

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { data: initialData, isLoading, refetch } = useQuery({
    queryKey: ['reminders-review-queue'],
    queryFn: async () => (await api.get('/api/reminders/review-queue')).data,
  })

  useEffect(() => {
    if (initialData) {
      if (currentIndex === 0) {
        setQueue(initialData)
      } else {
        setQueue(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          const newItems = initialData.filter((i: Reminder) => !existingIds.has(i.id))
          return [...prev, ...newItems]
        })
      }
    }
  }, [initialData])

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
      action: direction === 'right' ? 'got_it' : 'again' 
    })
    setCurrentIndex(prev => prev + 1)
    setIsExpanded(false)
  }

  if (isLoading && queue.length === 0) return <div className="h-full flex-1 flex items-center justify-center text-emerald-500"><Cpu className="w-10 h-10 animate-spin" /></div>

  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-12 space-y-8 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
          <div className="relative w-28 h-28 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-slate-500 shadow-2xl border border-white/10">
            <Zap className="w-14 h-14" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tighter">No Knowledge</h2>
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.4em]">Submit assets to begin reinforcement.</p>
        </div>
      </div>
    )
  }

  const currentItem = queue[currentIndex]

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative p-4 pb-24 md:pb-4 overflow-hidden bg-black/20 min-h-0">
      
      <div className="w-full flex-1 relative perspective-1000 min-h-0">
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
               className="absolute inset-0 bg-[#0f172a] rounded-[2.5rem] shadow-2xl flex flex-col z-50 overflow-hidden border border-white/10"
             >
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  <div className="flex items-center justify-between">
                    <MemoryBadge level={currentItem.memory_level} size="sm" />
                    <button onClick={() => setIsExpanded(false)} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{currentItem.title || 'Knowledge Fragment'}</h2>
                    <div className="w-12 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                  
                  {/* ATTACHMENT THUMBNAIL */}
                  {currentItem.attachments?.length > 0 && (
                    <div className="group relative inline-block max-w-[200px]">
                      <div 
                        onClick={() => setSelectedImage(`/api/attachments/${currentItem.attachments[0].id}/file`)}
                        className="cursor-pointer rounded-[1.5rem] overflow-hidden border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all shadow-xl"
                      >
                        <img src={`/api/attachments/${currentItem.attachments[0].id}/file`} className="w-full h-auto max-h-[150px] object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pb-10">
                    <MarkdownRenderer content={currentItem.content_text || ''} />
                  </div>
                </div>
                
                <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5 flex gap-3">
                   <button 
                    onClick={() => handleSwipe(currentItem.id, 'left')}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-[1.2rem] text-red-400 font-bold text-lg active:scale-95 transition-all flex items-center justify-center"
                  >
                    <CloseIcon className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleSwipe(currentItem.id, 'right')}
                    className="flex-1 py-4 bg-emerald-600 text-[#020617] rounded-[1.2rem] font-bold text-lg shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Heart className="w-6 h-6 fill-current" />
                  </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GLOBAL ATTACHMENT LIGHTBOX */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="relative max-w-full max-h-full"
               onClick={e => e.stopPropagation()}
             >
                <img 
                  src={selectedImage} 
                  className="max-w-full max-h-[90vh] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                >
                   <CloseIcon className="w-6 h-6" />
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SwipeCard({ item, onSwipe, onTap }: { item: Reminder, onSwipe: (dir: 'left' | 'right') => void, onTap: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-10, 10])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  
  const likeOpacity = useTransform(x, [50, 150], [0, 1])
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1])

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 80) onSwipe('right')
    else if (info.offset.x < -80) onSwipe('left')
  }

  const handleButtonClick = (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? 600 : -600
    animate(x, targetX, { 
      duration: 0.4, 
      ease: "easeOut" 
    }).then(() => {
      onSwipe(direction)
    })
  }

  const hasImage = item.attachments && item.attachments.length > 0

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      className="absolute inset-0 bg-[#0f172a] rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing overflow-hidden border border-white/5"
    >
      <div className="absolute inset-0 z-0 bg-slate-900">
        {hasImage ? (
          <img 
            src={`/api/attachments/${item.attachments[0].id}/file`} 
            className="w-full h-full object-cover opacity-60" 
            alt="" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center opacity-10">
            <Sparkles className="w-40 h-40 text-emerald-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/10 to-transparent" />
      </div>

      <motion.div 
        style={{ opacity: likeOpacity }}
        className="absolute top-10 left-6 border border-emerald-500/50 rounded-lg px-3 py-1 -rotate-12 z-20 pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/10 backdrop-blur-sm"
      >
        <span className="text-xl font-extrabold text-emerald-500 uppercase tracking-tighter">TÔI ỔN</span>
      </motion.div>
      <motion.div 
        style={{ opacity: nopeOpacity }}
        className="absolute top-10 right-6 border border-red-500/50 rounded-lg px-3 py-1 rotate-12 z-20 pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-500/10 backdrop-blur-sm"
      >
        <span className="text-xl font-extrabold text-red-500 uppercase tracking-tighter">NHẮC LẠI</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-8 z-10 space-y-5">
        <div className="flex items-center gap-3">
           <MemoryBadge level={item.memory_level} size="sm" />
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[8px] font-extrabold text-white/30 uppercase tracking-widest italic">Neural Link</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tighter leading-tight drop-shadow-2xl">
            {item.title || 'Untitled Fragment'}
          </h2>
          <div className="relative max-h-[50px] overflow-hidden">
            <MarkdownRenderer 
              content={item.content_text || ''} 
              className="!text-slate-400 !text-[11px] !leading-relaxed pointer-events-none" 
            />
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#020617] to-transparent" />
          </div>
        </div>
        
        <div className="pt-3 flex items-center justify-between gap-4 border-t border-white/5">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-0.5 bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 animate={{ x: [-40, 40] }} 
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="w-full h-full bg-emerald-500" 
               />
            </div>
            <span className="text-[8px] font-extrabold text-white/30 uppercase tracking-[0.4em]">Analyze</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleButtonClick('left'); }}
              className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-500/70 shadow-xl active:scale-90 transition-all hover:bg-red-500/10 hover:border-red-500/30"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleButtonClick('right'); }}
              className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_5px_15px_rgba(16,185,129,0.3)] active:scale-90 transition-all"
            >
              <Heart className="w-5 h-5 fill-black" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
