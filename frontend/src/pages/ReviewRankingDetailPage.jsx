import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Award, ExternalLink, Github, Star } from 'lucide-react'
import { contestApi, projectApi } from '../services'

const CONTEST_ID = 1

const STATUS_LABELS = {
  draft: '草稿',
  submitted: '已提交',
  online: '已上线',
  offline: '已下线',
}

function buildAccessUrl(domain) {
  if (!domain) return ''
  if (domain.startsWith('http://') || domain.startsWith('https://')) return domain
  return `//${domain}`
}

function formatScore(value) {
  if (value == null) return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num.toFixed(2)
}

export default function ReviewRankingDetailPage() {
  const { projectId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [access, setAccess] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setDetail(null)
    setAccess(null)

    contestApi
      .getRankingDetail(CONTEST_ID, projectId)
      .then(async (res) => {
        if (!active) return
        setDetail(res)
        if (res?.status === 'online') {
          try {
            const accessRes = await projectApi.getAccess(projectId)
            if (!active) return
            setAccess(accessRes)
          } catch {
            if (!active) return
            setAccess(null)
          }
        }
      })
      .catch((err) => {
        if (!active) return
        setError(err?.response?.data?.detail || '加载详情失败')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  const accessUrl = useMemo(() => buildAccessUrl(access?.domain || ''), [access?.domain])

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
          <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">详情加载失败</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{error}</p>
          <Link
            to="/ranking?tab=review"
            className="inline-block mt-6 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            返回评审榜
          </Link>
        </div>
      </div>
    )
  }

  const stats = detail?.stats || {}
  const ownerName = detail?.user?.display_name || detail?.user?.username || '匿名选手'

  return (
    <div className="min-h-screen pt-24 pb-16 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">评审榜详情</span>
              </div>
              <h1 className="mt-4 text-3xl font-black text-zinc-900 dark:text-white">
                {detail?.title || '未命名作品'}
              </h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">{detail?.summary || '暂无简介'}</p>
            </div>
            <Link
              to="/ranking?tab=review"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
            >
              返回评审榜
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">排名</div>
                <div className="text-3xl font-black text-zinc-900 dark:text-white">#{detail?.rank}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">评审得分</div>
                <div className="text-3xl font-black text-zinc-900 dark:text-white">
                  {formatScore(stats.final_score)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">评分人数</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {stats.review_count ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <Star className="w-4 h-4 text-amber-500" />
              作品信息
            </div>
            <div className="grid gap-4 sm:grid-cols-2 text-sm text-zinc-600 dark:text-zinc-300">
              <div>作者：{ownerName}</div>
              <div>状态：{STATUS_LABELS[detail?.status] || '未知'}</div>
              <div>平均分：{formatScore(stats.avg_score)}</div>
              <div>最高分：{stats.max_score ?? '-'}</div>
              <div>最低分：{stats.min_score ?? '-'}</div>
            </div>
            {detail?.description && (
              <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                {detail.description}
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-xs">
              {detail?.repo_url && (
                <a
                  href={detail.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-blue-500"
                >
                  <Github className="w-4 h-4" />
                  开源仓库
                </a>
              )}
              {detail?.demo_url && (
                <a
                  href={detail.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-blue-500"
                >
                  <ExternalLink className="w-4 h-4" />
                  演示链接
                </a>
              )}
              {detail?.readme_url && (
                <a
                  href={detail.readme_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-blue-500"
                >
                  <ExternalLink className="w-4 h-4" />
                  README
                </a>
              )}
            </div>
            {accessUrl && (
              <div>
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  在线访问
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
