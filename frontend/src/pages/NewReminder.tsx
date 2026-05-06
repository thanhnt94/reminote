import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Upload, X, Send, Tag, Check, Brain, Sparkles, BookOpen, FileText } from 'lucide-react'
import api from '@/api/client'

export default function NewReminder() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: reminder } = await api.post('/api/reminders', {
        title: title || null,
        content_text: text || null,
        tags: tags || null,
      })
      if (files.length > 0) {
        const formData = new FormData()
        files.forEach((f) => formData.append('files', f))
        await api.post(`/api/reminders/${reminder.id}/attachments`, formData)
      }
      return reminder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      navigate('/dashboard')
    },
  })

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    setFiles((prev) => [...prev, ...arr])
    arr.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  const toggleTag = (tagName: string) => {
    const currentTags = tags.split(/[\s,#]+/).filter(Boolean)
    if (currentTags.includes(tagName)) {
      setTags(currentTags.filter(t => t !== tagName).map(t => `#${t}`).join(' '))
    } else {
      setTags([...currentTags, tagName].map(t => `#${t}`).join(' '))
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Knowledge Note</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Professional Reinforcement System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 card-shadow space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FileText className="w-3 h-3 text-emerald-500" /> Note Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                placeholder="E.g. Quantum Physics Basics..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Body</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 text-sm font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none leading-relaxed"
                placeholder="Describe the core concept..."
              />
            </div>

            <div className="pt-2">
               <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-100 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-50/30 transition-all group"
              >
                <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2 group-hover:text-emerald-500 transition-all" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Attach Media Assets</p>
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {previews.map((src, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-square border border-slate-100">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => {
                         setFiles(prev => prev.filter((_, idx) => idx !== i))
                         setPreviews(prev => prev.filter((_, idx) => idx !== i))
                      }} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 card-shadow space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Tag className="w-3 h-3 text-emerald-500" /> Taxonomy
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-900 text-[11px] font-bold placeholder-slate-300 focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="#Tag1 #Tag2..."
              />
              
              <div className="flex flex-wrap gap-1 pt-1">
                {existingTags?.map((t: any) => {
                  const isActive = tags.toLowerCase().includes(t.name.toLowerCase())
                  return (
                    <button
                      key={t.name}
                      onClick={() => toggleTag(t.name)}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border transition-all flex items-center gap-1 ${
                        isActive 
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {isActive && <Check className="w-2.5 h-2.5" />}
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || (!title && !text)}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-40"
            >
              {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Commit Note</>}
            </button>
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Reinforcement</h4>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Notes are pushed for review using professional spaced-repetition intervals to ensure long-term mastery.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
