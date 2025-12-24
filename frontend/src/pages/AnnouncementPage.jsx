import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Trophy, Star } from 'lucide-react'
import { contestApi } from '../services'
import { cn } from '@/lib/utils'

const CONTEST_ID = 1

const PHASE_LABELS = {
  upcoming: '即将开始',
  signup: '报名中',
  submission: '提交中',
  voting: '投票中',
  ended: '已结束',
}

const MEDAL_CONFIG = {
  1: {
    label: '冠军',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    ring: 'border-amber-500/40',
    icon: 'text-amber-500',
  },
  2: {
    label: '亚军',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    ring: 'border-slate-400/40',
    icon: 'text-slate-400',
  },
  3: {
    label: '季军',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
    ring: 'border-orange-400/40',
    icon: 'text-orange-400',
  },
}

function formatScore(value) {
  if (value == null) return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num.toFixed(2)
}

export default function AnnouncementPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contest, setContest] = useState(null)
  const [ranking, setRanking] = useState({ items: [], total: 0 })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [contestRes, rankingRes] = await Promise.all([
        contestApi.get(CONTEST_ID),
        contestApi.getRanking(CONTEST_ID, { limit: 50 }),
      ])
      setContest(contestRes)
      setRanking(rankingRes || { items: [], total: 0 })
    } catch (err) {
      setError(err?.response?.data?.detail || '加载公示信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const top3 = useMemo(() => ranking.items.slice(0, 3), [ranking.items])

  return (
    <div className="min-h-screen pt-24 pb-16 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">赛事公示</span>
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">
                {contest?.title || '赛事公示'}
              </h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium whitespace-pre-wrap">
                {contest?.description || '暂无赛事说明'}
              </p>
            </div>
            <Link
              to="/ranking?tab=review"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
            >
              <Trophy className="w-4 h-4" />
              查看评审榜
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                当前阶段：{PHASE_LABELS[contest?.phase] || '未知'}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                共 {ranking.total || ranking.items.length} 个作品参与评审榜
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">加载公示信息中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-white dark:bg-zinc-900 p-10 text-center">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">加载失败</h3>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
              >
                重试
              </button>
            </div>
          ) : ranking.items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">暂无公示数据</h3>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium">评审结果尚未产生</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((item, index) => {
                  const rank = index + 1
                  const config = MEDAL_CONFIG[rank]
                  return (
                    <div
                      key={item.project_id}
                      className={cn(
                        'rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-sm',
                        config?.ring || 'border-zinc-200 dark:border-zinc-800'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('px-2 py-1 text-xs font-semibold rounded-lg', config?.badge)}>
                          #{rank} {config?.label || '上榜'}
                        </span>
                        <Star className={cn('w-4 h-4', config?.icon || 'text-zinc-400')} />
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">
                        {item.title || '未命名作品'}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        作者：{item.user?.display_name || item.user?.username || '匿名选手'}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">评审得分</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">
                          {formatScore(item.stats?.final_score)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-400">
                        评分人数 {item.stats?.review_count ?? 0}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  完整榜单
                </div>
                <div className="mt-4 space-y-3">
                  {ranking.items.map((item) => (
                    <div
                      key={item.project_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-zinc-900 dark:text-white">
                          #{item.rank}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {item.title || '未命名作品'}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            作者：{item.user?.display_name || item.user?.username || '匿名选手'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        评审得分 <span className="ml-2 text-lg font-bold text-zinc-900 dark:text-white">{formatScore(item.stats?.final_score)}</span>
                        <span className="ml-3 text-xs">评分人数 {item.stats?.review_count ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
