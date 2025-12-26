import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { getApiBaseUrl } from '../lib/apiBaseUrl'

// 统一处理 API 基地址，避免 HTTPS 页面触发 Mixed Content
const API_BASE_URL = getApiBaseUrl()

/**
 * Axios 实例
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
      if (typeof config.baseURL === 'string' && config.baseURL.startsWith('http://')) {
        config.baseURL = config.baseURL.replace('http://', 'https://')
      }
      if (typeof config.url === 'string' && config.url.startsWith('http://')) {
        config.url = config.url.replace('http://', 'https://')
      }
    }
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
