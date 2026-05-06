import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose prose-invert max-w-none markdown-container ${className}`}>
      <ReactMarkdown 
        rehypePlugins={[rehypeRaw]} 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for markdown elements to match our Obsidian theme
          h1: ({node, ...props}) => <h1 className="text-xl font-black text-white mt-4 mb-2 border-l-4 border-emerald-500 pl-3" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-black text-white mt-3 mb-1" {...props} />,
          p: ({node, ...props}) => <p className="text-sm text-slate-300 leading-relaxed mb-3" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-3 text-slate-400" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-400" {...props} />,
          code: ({node, ...props}) => (
            <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[11px] border border-white/5" {...props} />
          ),
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-slate-700 pl-4 py-1 italic text-slate-500 mb-3" {...props} />
          ),
          table: ({node, ...props}) => (
             <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-white/5 text-[11px]" {...props} />
             </div>
          ),
          th: ({node, ...props}) => <th className="border border-white/10 bg-white/5 p-2 font-black text-white" {...props} />,
          td: ({node, ...props}) => <td className="border border-white/5 p-2 text-slate-400" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
