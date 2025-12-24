import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projectApi } from '../services'

function buildAccessUrl(domain) {
  if (!domain) return ''
  if (domain.startsWith('http://') || domain.startsWith('https://')) return domain
  return `//${domain}`
}

export default function ProjectAccessPage() {
  const { projectId } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    projectApi
      .getAccess(projectId)
      .then((res) => {
        if (!active) return
        setData(res)
      })
      .catch((err) => {
        if (!active) return
        const message = err?.response?.data?.detail || '获取作品访问入口失败'
        setError(message)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">访问失败</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{error}</p>
          <Link
            to="/"
            className="inline-block mt-6 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const status = data?.status || 'unknown'
  const domain = data?.domain || ''
  const accessUrl = buildAccessUrl(domain)
  const isOnline = status === 'online'

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">作品访问入口</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{data?.message || '作品状态已更新'}</p>

        <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div>作品 ID：{data?.project_id}</div>
          <div>当前状态：{status}</div>
          {domain ? <div>访问域名：{domain}</div> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isOnline && accessUrl ? (
            <a
              href={accessUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              打开作品
            </a>
          ) : (
            <span className="px-5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
              暂未上线
            </span>
          )}
          <Link
            to="/"
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
