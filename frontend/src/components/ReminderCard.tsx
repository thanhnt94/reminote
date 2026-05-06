import { motion } from 'framer-motion'
import { ChevronRight, Box, Archive, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import MemoryBadge from './MemoryBadge'
import MarkdownRenderer from './MarkdownRenderer'

interface Attachment {
  id: number
  file_path: string
}

interface Reminder {
  id: number
  title: string | null
  content_text: string | null
  tags: string[]
  memory_level: number
  next_push_at: string
  is_archived: boolean
  attachments: Attachment[]
  created_at: string
}

export default function ReminderCard({ reminder }: { reminder: Reminder }) {
  const qc = useQueryClient()
  const isDue = new Date(reminder.next_push_at).getTime() <= Date.now()
  const hasImage = reminder.attachments && reminder.attachments.length > 0

  const archiveMutation = useMutation({
    mutationFn: async () => await api.post(`/api/reminders/${reminder.id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders-infinite'] })
      qc.invalidateQueries({ queryKey: ['reminders-due-count'] })
    },
  })

  return (
    <motion.div 
      layout
      whileHover={{ y: -6, scale: 1.01 }}
      className={`relative bg-[#0f172a] rounded-[2.5rem] border overflow-hidden transition-all group h-[270px] flex flex-col shadow-2xl ${
        isDue ? 'border-emerald-500/30 ring-1 ring-emerald-500/10 glow-emerald' : 'border-white/5'
      } ${reminder.is_archived ? 'opacity-40' : ''}`}
    >
      {/* Quick Archive Action */}
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); archiveMutation.mutate(); }}
        className={`absolute top-4 right-4 z-20 p-2 rounded-xl border backdrop-blur-md transition-all active:scale-90 ${
          reminder.is_archived 
          ? 'bg-emerald-500 text-[#020617] border-emerald-400 opacity-100' 
          : 'bg-black/20 text-white/40 border-white/10 opacity-0 group-hover:opacity-100 hover:text-emerald-400 hover:border-emerald-500/50'
        }`}
        title={reminder.is_archived ? "Restore to active nodes" : "Archive to vault"}
      >
        {reminder.is_archived ? <RefreshCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
      </button>

      <Link to={`/reminders/${reminder.id}`} className="flex flex-col h-full">
        {/* Visual Header */}
        <div className="relative h-[115px] flex-none overflow-hidden bg-black/20 border-b border-white/5">
          {hasImage ? (
            <img 
              src={`/api/attachments/${reminder.attachments[0].id}/file`} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80" 
              alt="" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <Box className="w-10 h-10 text-emerald-500" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

          <div className="absolute top-4 left-4 flex items-center pointer-events-none z-10">
            <MemoryBadge level={reminder.memory_level} size="sm" />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex-1 flex flex-col justify-between overflow-hidden relative">
          <div className="space-y-1.5">
            <h3 className="text-white text-[13px] font-black leading-tight tracking-tight line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {reminder.title || 'Knowledge Node'}
            </h3>
            <div className="relative max-h-[80px] overflow-hidden">
               <MarkdownRenderer 
                 content={reminder.content_text || 'System awaiting data integration.'} 
                 className="!prose-xs !text-[10px] pointer-events-none"
               />
               <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0f172a] to-transparent" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex gap-1.5 overflow-hidden">
              {reminder.tags.length > 0 ? (
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500/40">
                  #{reminder.tags[0]}
                </span>
              ) : (
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-700">Untagged</span>
              )}
            </div>
            {isDue && (
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
