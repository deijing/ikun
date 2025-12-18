import { create } from 'zustand'

const THEME_KEY = 'theme'
const THEME_MODES = ['light', 'dark', 'system']

/**
 * 验证主题模式是否有效
 */
function isValidThemeMode(value) {
  return THEME_MODES.includes(value)
}

/**
 * 安全读取 localStorage
 */
function safeGetItem(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * 安全写入 localStorage
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 静默失败，如 Safari 隐私模式
  }
}

/**
 * 获取系统主题偏好 (light/dark)
 */
function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 解析主题模式为实际主题 (system -> light/dark)
 */
function resolveTheme(mode) {
  return mode === 'system' ? getSystemTheme() : mode
}

/**
 * 从 localStorage 获取初始主题模式
 */
function getInitialThemeMode() {
  if (typeof window === 'undefined') return 'system'
  const saved = safeGetItem(THEME_KEY)
  return isValidThemeMode(saved) ? saved : 'system'
}

/**
 * 应用解析后的主题到 DOM
 */
function applyResolvedTheme(resolvedTheme) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', resolvedTheme === 'dark')
}

/**
 * 应用主题模式并持久化
 */
function applyThemeMode(mode) {
  if (typeof window === 'undefined') return resolveTheme(mode)
  const resolved = resolveTheme(mode)
  applyResolvedTheme(resolved)
  safeSetItem(THEME_KEY, mode)
  return resolved
}

// 初始化时立即应用主题
const initialTheme = getInitialThemeMode()
const initialResolvedTheme = applyThemeMode(initialTheme)

/**
 * 主题状态管理
 * - theme: 用户选择的主题模式 (light/dark/system)
 * - resolvedTheme: 实际应用的主题 (light/dark)
 */
export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  resolvedTheme: initialResolvedTheme,

  /**
   * 循环切换主题模式: light -> dark -> system -> light
   */
  toggleTheme: () => {
    const currentTheme = get().theme
    const currentIndex = THEME_MODES.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % THEME_MODES.length
    const newTheme = THEME_MODES[nextIndex]
    const resolved = applyThemeMode(newTheme)
    set({ theme: newTheme, resolvedTheme: resolved })
  },

  /**
   * 设置指定的主题模式
   */
  setTheme: (theme) => {
    const mode = isValidThemeMode(theme) ? theme : 'system'
    const resolved = applyThemeMode(mode)
    set({ theme: mode, resolvedTheme: resolved })
  }
}))

/**
 * 监听系统主题变化，仅在 system 模式下自动跟随
 */
let listenerAttached = false

function setupSystemThemeListener() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return
  }

  if (listenerAttached) return
  listenerAttached = true

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = (e) => {
    const { theme } = useThemeStore.getState()
    if (theme !== 'system') return
    const resolved = e.matches ? 'dark' : 'light'
    applyResolvedTheme(resolved)
    useThemeStore.setState({ resolvedTheme: resolved })
  }

  // 兼容旧版浏览器 (Safari < 14)
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange)
  }
}

setupSystemThemeListener()
