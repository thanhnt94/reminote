import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Tag, Check, Brain, Sparkles, 
  Image as ImageIcon, Loader2,
  Zap, Plus, Trash2, Bold, Italic, Code, Link as LinkIcon, Heading, List,
  AlertCircle, ArrowRight, ArrowLeft, Send
} from 'lucide-react'
import api from '@/api/client'
import { Link } from 'react-router-dom'

export default function NewReminder() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [isPasting, setIsPasting] = useState(false)
  const [pastedFiles, setPastedFiles] = useState<{url: string, filename: string}[]>([])
  
  const [similarNotes, setSimilarNotes] = useState<any[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/api/reminders/tags')).data,
  })

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.length >= 3) {
        try {
          const { data } = await api.get(`/api/reminders/search/similar-titles?q=${encodeURIComponent(title)}`)
          setSimilarNotes(data)
        } catch (e) { console.error(e) }
      } else {
        setSimilarNotes([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [title])

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: reminder } = await api.post('/api/reminders', {
        title: title || null,
        content_text: text || null,
        tags: tags || null,
      })
      if (pastedFiles.length > 0) {
        await api.put(`/api/reminders/${reminder.id}/link-attachments`, {
           filenames: pastedFiles.map(f => f.filename)
        })
      }
      return reminder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      navigate('/dashboard')
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

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-fade-in relative">
      
      {/* FIXED ACTION HEADER */}
      <div className="sticky top-0 z-[120] bg-[#020617]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4 border-b border-white/5 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-90"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Neural Injection</span>
             </div>
             
             <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || (!title && !text)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-20"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Inject</>}
            </button>
          </div>
      </div>

      <div className="px-4 space-y-10">
        {/* Title Input */}
        <div className="space-y-4 relative">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-4xl font-extrabold text-white placeholder-white/10 focus:outline-none focus:ring-0 transition-all"
            placeholder="Fragment Title..."
          />
          <div className="h-px w-20 bg-emerald-500/50" />
          
          <AnimatePresence>
            {similarNotes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 bg-amber-500/5 border border-amber-500/20 backdrop-blur-xl rounded-3xl"
              >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Similar Knowledge Detected</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {similarNotes.slice(0, 4).map(n => (
                        <Link key={n.id} to={`/reminders/${n.id}`} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group border border-white/5">
                          <p className="text-xs font-bold text-slate-300 truncate max-w-[80%]">{n.title}</p>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-500 transition-all" />
                        </Link>
                    ))}
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
            <button onClick={() => insertMarkdown('**', '**')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertMarkdown('*', '*')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertMarkdown('```\n', '\n```')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><Code className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertMarkdown('# ')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><Heading className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertMarkdown('- ')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertMarkdown('[', '](url)')} className="px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase"><LinkIcon className="w-3.5 h-3.5" /></button>
          </div>
          
          <textarea
            ref={textAreaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) { e.preventDefault(); uploadAndAdd(blob); }
                }
              }
            }}
            rows={15}
            className="w-full bg-transparent border-none p-0 text-lg font-medium text-slate-300 placeholder-white/5 focus:outline-none focus:ring-0 transition-all resize-none leading-relaxed"
            placeholder="Synthesize knowledge fragment..."
          />
        </div>

        {/* Neural Taxonomy (Tags) */}
        <div className="space-y-4 pt-10 border-t border-white/5">
          <div className="flex items-center gap-3">
             <Tag className="w-4 h-4 text-emerald-500" />
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxonomy</label>
          </div>
          
          <div className="relative group">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-emerald-500 placeholder-slate-800 focus:outline-none focus:border-emerald-500/30 transition-all"
              placeholder="#Science #Code..."
            />
            
            <AnimatePresence>
               {showTagSuggestions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-4 bg-[#1e293b]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl p-2"
                  >
                        {tagSuggestions.map((s) => (
                           <button 
                             key={s} onClick={() => selectSuggestion(s)}
                             className="w-full text-left px-5 py-3 text-xs font-bold text-slate-400 hover:text-emerald-500 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between group"
                           >
                              <span>#{s}</span>
                              <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                        ))}
                  </motion.div>
               )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-2">
             {existingTags?.slice(0, 10).map((t: any) => {
                const isActive = tags.toLowerCase().includes(t.name.toLowerCase())
                return (
                  <button
                    key={t.name} onClick={() => toggleTag(t.name)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tight border transition-all ${
                      isActive ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white/5 text-slate-500 border-white/5'
                    }`}
                  >
                    {t.name}
                  </button>
                )
             })}
          </div>
        </div>

        {/* Media Gallery */}
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-500" /> Neural Assets ({pastedFiles.length})
             </p>
             <button onClick={() => fileRef.current?.click()} className="p-2 bg-white/5 rounded-lg border border-white/5 text-emerald-500 active:scale-90 transition-all">
                <Plus className="w-4 h-4" />
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files && uploadAndAdd(e.target.files[0])} />
             </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
             <AnimatePresence>
                {pastedFiles.map((file, idx) => (
                   <motion.div 
                     key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                     className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group"
                   >
                      <img src={file.url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setPastedFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1.5 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                   </motion.div>
                ))}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
