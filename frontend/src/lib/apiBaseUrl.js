/**
 * 统一处理 API 基地址，避免 HTTPS 页面触发 Mixed Content。
 */
export function getApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL || '/api/v1').trim()
  if (typeof window === 'undefined') return raw

  if (raw.startsWith('https://')) return raw
  if (raw.startsWith('http://')) {
    if (window.location.protocol === 'https:') return raw.replace('http://', 'https://')
    return raw
  }
  if (raw.startsWith('//')) return `${window.location.protocol}${raw}`
  if (raw.startsWith('/')) return raw
  return `/${raw}`
}
