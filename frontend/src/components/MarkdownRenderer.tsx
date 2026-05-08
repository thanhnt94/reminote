import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2 } from 'lucide-react'

interface Props {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = "" }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <>
      <div className={`prose prose-invert max-w-none markdown-container ${className}`}>
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]} 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-xl font-black text-white mt-4 mb-2 border-l-4 border-emerald-500 pl-3" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-lg font-black text-white mt-3 mb-1" {...props} />,
            p: ({node, ...props}) => <p className="text-sm text-slate-300 leading-relaxed mb-3" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-3 text-slate-400" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-400" {...props} />,
            code: ({node, ...props}) => (
              <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[11px] border border-white/5" {...props} />
            ),
            a: ({node, ...props}) => {
              const url = props.href || '';
              const isYouTube = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
              
              if (isYouTube) {
                const videoId = isYouTube[1];
                return (
                  <div className="my-6 aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="opacity-90 hover:opacity-100 transition-opacity"
                    ></iframe>
                  </div>
                );
              }
              return <a className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/30 transition-colors" {...props} target="_blank" rel="noopener noreferrer" />;
            },
            img: ({node, ...props}) => (
              <div className="my-4 group relative inline-block max-w-full">
                <div 
                  onClick={() => setSelectedImage(props.src || null)}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all shadow-xl max-w-fit"
                >
                    <img 
                      {...props} 
                      className="w-full h-auto max-h-[300px] object-contain opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                </div>
              </div>
            ),
            blockquote: ({node, ...props}) => (
              <blockquote className="border-l-4 border-emerald-500/30 bg-white/5 px-6 py-4 italic text-slate-400 rounded-r-2xl mb-4" {...props} />
            ),
            table: ({node, ...props}) => (
              <div className="overflow-x-auto mb-6 rounded-2xl border border-white/5">
                  <table className="w-full border-collapse text-[11px]" {...props} />
              </div>
            ),
            th: ({node, ...props}) => <th className="bg-white/5 p-3 font-black text-white text-left border-b border-white/10" {...props} />,
            td: ({node, ...props}) => <td className="p-3 text-slate-400 border-b border-white/5" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* LIGHTBOX POPUP - GLOBAL LEVEL TO ENSURE CENTERING */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed top-0 left-0 w-full h-full z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
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
                  className="absolute -top-6 -right-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 shadow-2xl"
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
