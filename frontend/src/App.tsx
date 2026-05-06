import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
// ...
import Layout from '@/components/Layout'
import AdminLayout from '@/components/AdminLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import NewReminder from '@/pages/NewReminder'
import ReminderDetail from '@/pages/ReminderDetail'
import TagsPage from '@/pages/TagsPage'
import SettingsPage from '@/pages/SettingsPage'
import ReviewPage from '@/pages/ReviewPage'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import SSOSettings from '@/pages/admin/SSOSettings'
import TelegramSettings from '@/pages/admin/TelegramSettings'
import WebPushSettings from '@/pages/admin/WebPushSettings'
import AdminUsers from '@/pages/admin/AdminUsers'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  )
  
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  )
  
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* User Routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reminders/new" element={<NewReminder />} />
        <Route path="/reminders/:id" element={<ReminderDetail />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/sso" element={<SSOSettings />} />
        <Route path="/admin/telegram" element={<TelegramSettings />} />
        <Route path="/admin/web-push" element={<WebPushSettings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/settings" element={<Navigate to="/admin/sso" replace />} />
      </Route>
    </Routes>
  )
}
