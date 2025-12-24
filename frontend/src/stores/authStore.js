import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getApiBaseUrl } from '../lib/apiBaseUrl'

/**
 * 认证状态管理
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      // 记录用户的原始角色（用于管理员角色切换功能）
      originalRole: null,

      setUser: (user) => {
        // 更新用户时，如果后端返回了 original_role，同步更新 originalRole
        const currentOriginalRole = get().originalRole
        const newOriginalRole = user?.original_role || currentOriginalRole
        set({ user, originalRole: newOriginalRole })
      },
      setToken: (token) => set({ token }),
      setOriginalRole: (role) => set({ originalRole: role }),

      login: (user, token) => {
        // 登录时记录原始角色（优先使用后端返回的 original_role）
        const origRole = user?.original_role || user?.role || null
        set({ user, token, originalRole: origRole })
      },

      logout: () => set({ user: null, token: null, originalRole: null }),

      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return !!state.token
      },

      /**
       * 从服务器刷新用户信息（包含最新的 role）
       */
        refreshUser: async () => {
          const { token, originalRole } = get()
          if (!token) return null

          try {
            const apiBaseUrl = getApiBaseUrl()
            const response = await fetch(
              `${apiBaseUrl}/users/me`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
            }
          )

          if (response.ok) {
            const user = await response.json()
            // 优先使用后端返回的 original_role，否则保持本地的 originalRole
            const newOrigRole = user?.original_role || originalRole || user?.role || null
            set({ user, originalRole: newOrigRole })
            return user
          } else if (response.status === 401) {
            // Token 失效，清除登录状态
            set({ user: null, token: null, originalRole: null })
          }
        } catch (error) {
          console.error('刷新用户信息失败:', error)
        }
        return null
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, originalRole: state.originalRole }),
    }
  )
)
