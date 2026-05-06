import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
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
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminUsers from '@/pages/admin/AdminUsers'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
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
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>
    </Routes>
  )
}
