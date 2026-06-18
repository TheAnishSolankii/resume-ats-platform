import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),

      login: async (email, password) => {
        const { data } = await api.post('/api/auth/login', { email, password })
        set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token })
        return data.user
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/api/auth/register', { name, email, password })
        set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token })
        return data.user
      },

      logout: async () => {
        try { await api.post('/api/auth/logout') } catch {}
        set({ user: null, accessToken: null, refreshToken: null })
      },

      refreshAccess: async () => {
        const { refreshToken } = get()
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await api.post('/api/auth/refresh', { refresh_token: refreshToken })
        set({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user })
        return data.access_token
      },
    }),
    {
      name: 'resumeiq-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
)
