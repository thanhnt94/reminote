import { create } from 'zustand'
import api from '@/api/client'

interface User {
  id: number
  username: string
  email: string | null
  is_admin: boolean
  telegram_chat_id: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password })
    set({ user: data.user })
  },

  logout: async () => {
    await api.post('/api/auth/logout')
    set({ user: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      set({ user: data, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
