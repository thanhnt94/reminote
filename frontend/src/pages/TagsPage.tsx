import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Edit3, Trash2, Check, X, ArrowLeft, Brain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/api/client'

export default function TagsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editingName, setEditingName] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
  })

  const renameMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string, newName: string }) => {
      return (await api.put(`/api/reminders/tags/${oldName}`, { new_name: newName })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['reminders'] })
      setEditingName(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (tagName: string) => {
      return (await api.delete(`/api/reminders/tags/${tagName}`)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  return (
    <div className="max-w-3xl mx-auto pb-20 px-4">
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-white transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-white">Quản lý Tag</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Hệ thống phân loại kiến thức</p>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-8 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center animate-pulse">
              <Brain className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Đang tải dữ liệu...</p>
            </div>
          ) : tags?.length === 0 ? (
            <div className="py-20 text-center text-slate-600 italic">Chưa có tag nào được sử dụng.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {tags?.map((t: any) => (
                <div key={t.name} className="py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                      <Tag className="w-5 h-5" />
                    </div>
                    
                    {editingName === t.name ? (
                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-2 text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => renameMutation.mutate({ oldName: t.name, newName })} className="p-2 bg-emerald-500 text-white rounded-xl">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingName(null)} className="p-2 bg-white/5 text-slate-500 rounded-xl">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-slate-200">#{t.name}</h3>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Sử dụng trong {t.count} thẻ</p>
                      </div>
                    )}
                  </div>

                  {!editingName && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingName(t.name); setNewName(t.name) }}
                        className="p-3 bg-white/5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if(confirm(`Xóa tag #${t.name}? Hành động này sẽ gỡ tag khỏi tất cả các thẻ.`)) deleteMutation.mutate(t.name) }}
                        className="p-3 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
