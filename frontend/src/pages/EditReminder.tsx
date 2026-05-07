import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Save, X, Send, Tag, Check, Brain, Sparkles, 
  BookOpen, FileText, Image as ImageIcon, Loader2,
  Zap, Info, Plus, Trash2, Bold, Italic, Code, Link as LinkIcon, Heading, List,
  AlertCircle, Search, ArrowRight
} from 'lucide-react'
import api from '@/api/client'

export default function EditReminder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [isPasting, setIsPasting] = useState(false)
  const [pastedFiles, setPastedFiles] = useState<{url: string, filename: string, id?: number}[]>([])
  
  const [similarNotes, setSimilarNotes] = useState<any[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const { data: r, isLoading } = useQuery({
    queryKey: ['reminders', id],
    queryFn: async () => (await api.get(`/api/reminders/${id}`)).data,
  })

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
  })

  useEffect(() => {
    if (r) {
      setTitle(r.title || '')
      setText(r.content_text || '')
      setTags(r.tags?.map((t: string) => `#${t}`).join(' ') || '')
      setPastedFiles(r.attachments.map((a: any) => ({
         url: `/api/attachments/${a.id}/file`,
         filename: a.file_path,
         id: a.id
      })))
    }
  }, [r])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.length >= 3) {
        try {
          const { data } = await api.get(`/api/reminders/search/similar-titles?q=${encodeURIComponent(title)}`)
          setSimilarNotes(data.filter((n: any) => n.id !== Number(id)))
        } catch (e) { console.error(e) }
      } else {
        setSimilarNotes([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [title, id])

  useEffect(() => {
    const lastWord = tags.split(/[\s,]+/).pop() || ''
    const prefix = lastWord.startsWith('#') ? lastWord.slice(1) : lastWord
    const timer = setTimeout(async () => {
      if (prefix.length >= 1) {
        try {
          const { data } = await api.get(`/api/reminders/tags/suggestions?q=${encodeURIComponent(prefix)}`)
          setTagSuggestions(data)
          setShowTagSuggestions(data.length > 0)
        } catch (e) { console.error(e) }
      } else {
        setTagSuggestions([])
        setShowTagSuggestions(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [tags])

  const selectSuggestion = (tagName: string) => {
    const parts = tags.split(/([\s,]+)/)
    parts[parts.length - 1] = `#${tagName} `
    setTags(parts.join(''))
    setShowTagSuggestions(false)
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/api/reminders/${id}`, {
        title: title || null,
        content_text: text || null,
        tags: tags || null,
      })
      const newFiles = pastedFiles.filter(f => !f.id)
      if (newFiles.length > 0) {
        await api.put(`/api/reminders/${id}/link-attachments`, {
           filenames: newFiles.map(f => f.filename)
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      navigate(`/reminders/${id}`)
    },
  })

  const insertMarkdown = (before: string, after: string = '') => {
    if (!textAreaRef.current) return
    const start = textAreaRef.current.selectionStart
    const end = textAreaRef.current.selectionEnd
    const selectedText = text.substring(start, end)
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
    setText(newText)
    setTimeout(() => {
      textAreaRef.current?.focus()
      textAreaRef.current?.setSelectionRange(start + before.length, end + before.length)
    }, 10)
  }

  const uploadAndAdd = async (file: File) => {
    setIsPasting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/api/attachments/upload', formData);
      setPastedFiles(prev => [...prev, { url: data.url, filename: data.filename }]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsPasting(false);
    }
  }

  const toggleTag = (tagName: string) => {
    const currentTags = tags.split(/[\s,#]+/).filter(Boolean)
    if (currentTags.includes(tagName)) {
      setTags(currentTags.filter(t => t !== tagName).map(t => `#${t}`).join(' '))
    } else {
      setTags([...currentTags, tagName].map(t => `#${t}`).join(' '))
    }
  }

  if (isLoading) return <div className="p-20 text-center animate-pulse text-emerald-500"><Brain className="w-12 h-12 mx-auto mb-4" /></div>

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pb-32 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        
        {/* MAIN EDITOR */}
        <div className="flex-1 space-y-8 w-full">
          <div className="space-y-2 mb-10">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full" />
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Modification</p>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Refine <span className="text-emerald-500 not-italic">Knowledge</span></h1>
          </div>

          <div className="bg-[#0f172a] border border-white/5 rounded-[3.5rem] p-8 lg:p-16 shadow-2xl space-y-12 relative overflow-hidden">
             {/* Title */}
             <div className="space-y-4 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6">Node Descriptor</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-[2.5rem] px-10 py-7 text-2xl font-black text-white placeholder-slate-800 focus:outline-none focus:border-emerald-500/30 transition-all shadow-inner"
                  placeholder="Enter node title..."
                />
                <AnimatePresence>
                  {similarNotes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-6 z-[60] p-8 bg-[#0f172a]/95 border border-amber-500/20 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl"
                    >
                       <div className="flex items-center gap-3 mb-6">
                          <AlertCircle className="w-6 h-6 text-amber-500" />
                          <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Conflicting Nodes Detected</p>
                       </div>
                       <div className="space-y-3">
                          {similarNotes.map(n => (
                             <Link key={n.id} to={`/reminders/${n.id}`} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                                <p className="text-sm font-bold text-white truncate max-w-[85%]">{n.title}</p>
                                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                             </Link>
                          ))}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             {/* Content */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-6">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synthesis Engine</label>
                   <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-5 py-2 border border-white/5">
                      <button onClick={() => insertMarkdown('**', '**')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('*', '*')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('~~', '~~')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Strikethrough"><X className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('# ')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Heading"><Heading className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-white/10 mx-2" />
                      <button onClick={() => insertMarkdown('```\n', '\n```')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Code"><Code className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('> ')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Quote"><Sparkles className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('[', '](url)')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                      <button onClick={() => insertMarkdown('- ')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="List"><List className="w-4 h-4" /></button>
                   </div>
                </div>
                <textarea
                  ref={textAreaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={20}
                  className="w-full bg-black/40 border border-white/5 rounded-[3rem] px-10 py-10 text-lg font-medium text-slate-300 focus:outline-none focus:border-emerald-500/30 transition-all resize-none shadow-inner scrollbar-hide leading-relaxed"
                />
             </div>

             {/* Media */}
             <div className="space-y-6 pt-6 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 flex items-center gap-2">
                   <ImageIcon className="w-4 h-4 text-emerald-500" /> Neural Assets ({pastedFiles.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 px-4">
                   <AnimatePresence>
                      {pastedFiles.map((file, idx) => (
                         <motion.div 
                           key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                           className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 group shadow-2xl"
                         >
                            <img src={file.url} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                               <button onClick={() => setPastedFiles(prev => prev.filter((_, i) => i !== idx))} className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform shadow-xl shadow-red-500/20">
                                  <Trash2 className="w-5 h-5" />
                               </button>
                            </div>
                         </motion.div>
                      ))}
                   </AnimatePresence>
                   <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600 hover:text-emerald-500 hover:border-emerald-500/20 transition-all group bg-white/[0.02]">
                      <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Inject Media</span>
                      <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files && uploadAndAdd(e.target.files[0])} />
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* SIDEBAR: NEURAL CONTROLS */}
        <div className="w-full lg:w-96 space-y-8 lg:sticky lg:top-8">
           <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <Tag className="w-4 h-4 text-emerald-500" />
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Taxonomy</label>
                </div>
                
                <div className="relative group">
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-emerald-500 placeholder-slate-800 focus:outline-none focus:border-emerald-500/30 transition-all"
                  />
                  
                  <AnimatePresence>
                     {showTagSuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 right-0 mb-4 bg-[#1e293b]/95 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-[100] backdrop-blur-xl"
                        >
                           <div className="p-2 space-y-1">
                              {tagSuggestions.map((s) => (
                                 <button 
                                   key={s} onClick={() => selectSuggestion(s)}
                                   className="w-full text-left px-5 py-4 text-xs font-bold text-slate-400 hover:text-emerald-500 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between group"
                                 >
                                    <span>#{s}</span>
                                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </button>
                              ))}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                   {allTags?.slice(0, 15).map((t: any) => {
                      const isActive = tags.toLowerCase().includes(t.name.toLowerCase())
                      return (
                        <button
                          key={t.name} onClick={() => toggleTag(t.name)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${
                            isActive ? 'bg-emerald-500 text-black border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {t.name}
                        </button>
                      )
                   })}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                 <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="w-full py-7 rounded-[2.5rem] bg-emerald-500 text-[#020617] font-black text-sm uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-emerald-400 shadow-[0_20px_60px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-20"
                >
                  {updateMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /> Commit Modifications</>}
                </button>
                <button onClick={() => navigate(-1)} className="w-full py-5 rounded-[2.5rem] bg-white/5 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                   Discard Changes
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
