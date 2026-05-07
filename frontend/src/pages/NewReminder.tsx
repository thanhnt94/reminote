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
    <div className="h-[100dvh] flex flex-col bg-[#020617] text-slate-100 overflow-hidden">
      
      {/* FIXED HEADER */}
      <header className="flex-none bg-[#020617] px-4 h-16 flex items-center justify-between gap-4 border-b border-white/5 z-50">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Neural Draft</span>
          </div>
      </header>

      {/* SCROLLABLE BODY */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-3xl font-black text-white placeholder-white/10 focus:outline-none focus:ring-0 transition-all italic"
            placeholder="Fragment Title..."
          />
          <div className="h-0.5 w-12 bg-emerald-500/50" />
          
          <AnimatePresence>
            {similarNotes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                   <div className="flex items-center gap-2 mb-3">
                     <AlertCircle className="w-3 h-3 text-amber-500" />
                     <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Similarity Detected</p>
                   </div>
                   <div className="flex gap-2 overflow-x-auto no-scrollbar">
                     {similarNotes.slice(0, 3).map(n => (
                         <Link key={n.id} to={`/reminders/${n.id}`} className="flex-shrink-0 px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                           {n.title}
                         </Link>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area */}
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
          className="w-full bg-transparent border-none p-0 text-lg font-medium text-slate-300 placeholder-white/5 focus:outline-none focus:ring-0 transition-all resize-none leading-relaxed min-h-[300px]"
          placeholder="Synthesize knowledge fragment..."
        />
      </main>

      {/* FIXED FOOTER - ACTIONS & TAGS */}
      <footer className="flex-none border-t border-white/5 bg-[#020617]/80 backdrop-blur-xl pb-safe">
        
        {/* Image Preview - Horizontal Scroll */}
        <AnimatePresence>
          {pastedFiles.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 overflow-x-auto no-scrollbar p-4 border-b border-white/5"
            >
              {pastedFiles.map((file, idx) => (
                <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
                   <img src={file.url} className="w-full h-full object-cover" alt="" />
                   <button onClick={() => setPastedFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg">
                      <X className="w-3 h-3" />
                   </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar & Tags */}
        <div className="p-4 space-y-4">
           {/* Tag Input */}
           <div className="relative">
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2">
                 <Tag className="w-3.5 h-3.5 text-emerald-500" />
                 <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  className="flex-1 bg-transparent border-none p-0 text-xs font-bold text-emerald-400 placeholder-slate-700 focus:outline-none focus:ring-0"
                  placeholder="Tags: #Science #Code..."
                />
              </div>
              
              <AnimatePresence>
                 {showTagSuggestions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-2xl p-1 max-h-40 overflow-y-auto no-scrollbar"
                    >
                          {tagSuggestions.map((s) => (
                             <button 
                               key={s} onClick={() => selectSuggestion(s)}
                               className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-emerald-500 hover:bg-white/5 rounded-lg transition-all"
                             >
                                #{s}
                             </button>
                          ))}
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>

           {/* Actions Row */}
           <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                 <button onClick={() => insertMarkdown('**', '**')} className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-slate-400"><Bold className="w-4 h-4" /></button>
                 <button onClick={() => insertMarkdown('*', '*')} className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-slate-400"><Italic className="w-4 h-4" /></button>
                 <button onClick={() => insertMarkdown('```\n', '\n```')} className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-slate-400"><Code className="w-4 h-4" /></button>
                 <div className="w-px h-6 bg-white/5 mx-1" />
                 <button onClick={() => fileRef.current?.click()} className="p-2.5 bg-white/5 rounded-lg border border-emerald-500/20 text-emerald-500">
                    <ImageIcon className="w-4 h-4" />
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files && uploadAndAdd(e.target.files[0])} />
                 </button>
              </div>

              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || (!title && !text)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-black rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-20"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Inject</span>
                  </>
                )}
              </button>
           </div>
        </div>
      </footer>
    </div>
  )
}
