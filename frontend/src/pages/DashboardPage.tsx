import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Cpu, Loader2 } from 'lucide-react'
import api from '@/api/client'
import ReminderCard from '@/components/ReminderCard'

interface DashboardContext {
  search: string
  selectedTag: string
  showArchived: boolean
}

export default function DashboardPage() {
  const { search, selectedTag, showArchived } = useOutletContext<DashboardContext>()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['reminders-infinite', showArchived, selectedTag, search],
    queryFn: async ({ pageParam = 0 }) => {
      const params: Record<string, any> = { 
        archived: showArchived,
        offset: pageParam,
        limit: 20
      }
      if (selectedTag) params.tag = selectedTag
      if (search) params.search = search
      const { data } = await api.get('/api/reminders', { params })
      return data
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentCount = allPages.reduce((acc, page) => acc + page.items.length, 0)
      return currentCount < lastPage.total ? currentCount : undefined
    },
    initialPageParam: 0
  })

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { threshold: 0.1 })
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allReminders = data?.pages.flatMap(page => page.items) || []

  return (
    <div className="animate-fade-in space-y-4">
      {/* Page Title - Ultra Compact */}
      <div className="px-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight uppercase italic leading-none">
            {showArchived ? (
              <>Neural <span className="text-emerald-500 not-italic">Vault</span></>
            ) : (
              <>Active <span className="text-emerald-500 not-italic">Feed</span></>
            )}
          </h2>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 backdrop-blur-xl">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">
               {data?.pages[0]?.total || 0} Nodes
             </span>
          </div>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
        {isLoading && allReminders.length === 0 ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[270px] bg-white/5 rounded-[2.5rem] border border-white/5 animate-pulse" />
          ))
        ) : allReminders.length === 0 ? (
          <div className="col-span-full py-40 text-center opacity-20">
             <Cpu className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
             <p className="text-[10px] font-bold uppercase tracking-widest">Sector Empty</p>
          </div>
        ) : (
          allReminders.map((r: any, idx: number) => (
            <ReminderCard key={r.id} reminder={r} rank={idx + 1} />
          ))
        )}
      </div>

      <div ref={loadMoreRef} className="py-10 flex justify-center">
        {isFetchingNextPage && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
      </div>
    </div>
  )
}
