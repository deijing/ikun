import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  Coins,
  Clock,
  ChevronRight,
  TrendingUp,
  Flame,
  RefreshCw,
  Zap,
  Trophy,
  LayoutList,
} from 'lucide-react'
import { predictionApi } from '../../services'

// 热度边框颜色常量
const BORDER_COLORS = [
  'border-yellow-400 hover:border-yellow-500',
  'border-orange-400 hover:border-orange-500',
  'border-red-400 hover:border-red-500',
]

/**
 * 格式化数字（大数字缩写）
 */
function formatNumber(num) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toLocaleString()
}

/**
 * 格式化剩余时间
 */
function formatTimeLeft(minutes) {
  if (minutes <= 0) return '即将截止'
  if (minutes < 60) return `${minutes}分钟`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`
  return `${Math.floor(minutes / 1440)}天`
}

/**
 * 竞猜卡片组件
 */
function BettingCard({ market, index }) {
  const totalPool = market.total_pool || 0

  // 计算截止时间
  const closesAt = market.closes_at ? new Date(market.closes_at) : null
  const now = new Date()
  const timeLeft = closesAt ? Math.max(0, Math.floor((closesAt - now) / 1000 / 60)) : null

  // 卡片边框颜色
  const borderColor = BORDER_COLORS[index] || 'border-purple-400 hover:border-purple-500'

  return (
    <Link
      to={`/prediction/${market.id}`}
      className={`
        block bg-white dark:bg-slate-900 rounded-2xl border-2 ${borderColor}
        p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        group relative overflow-hidden
      `}
    >
      {/* 热度标识 */}
      {index < 3 && (
        <div className="absolute top-3 right-3">
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
            ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              index === 1 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
          `}>
            <Flame className="w-3 h-3" />
            HOT
          </div>
        </div>
      )}

      {/* 标题 */}
      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-3 pr-16 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
        {market.title}
      </h4>

      {/* 统计信息 */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold text-yellow-700 dark:text-yellow-400">{formatNumber(totalPool)}</span>
          <span className="text-yellow-600/70 dark:text-yellow-500/70">奖池</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <LayoutList className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-blue-700 dark:text-blue-400">{market.options?.length || 0}</span>
          <span className="text-blue-600/70 dark:text-blue-500/70">选项</span>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
            timeLeft < 60 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
          }`}>
            <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-red-600' : 'text-green-600'}`} />
            <span className={`font-bold ${timeLeft < 60 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* 选项预览 - 显示前2个选项 */}
      <div className="space-y-2 mb-4">
        {market.options?.slice(0, 2).map((opt) => {
          const stake = opt.total_stake || 0
          const percentage = totalPool > 0 ? Math.round((stake / totalPool) * 100) : 0
          return (
            <div key={opt.id} className="relative overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
              {/* 进度条背景 - 使用绝对定位但不使用 inset-0 */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-purple-100 dark:bg-purple-900/30 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
              <div className="flex items-center justify-between relative z-10 px-3 py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                  {opt.label}
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-slate-500">{percentage}%</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {opt.odds ? `${opt.odds.toFixed(2)}x` : '-'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        {market.options?.length > 2 && (
          <div className="text-center text-xs text-slate-400 pt-1">
            还有 {market.options.length - 2} 个选项...
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Zap className="w-4 h-4 text-purple-500" />
          <span>最低 {market.min_bet} 积分下注</span>
        </div>
        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
          参与竞猜
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <Target className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
        暂无进行中的竞猜
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
        管理员正在筹备精彩的竞猜活动，敬请期待...
      </p>
    </div>
  )
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-4" />
          <div className="flex gap-3 mb-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-16" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * 热门竞猜区块 - 首页组件
 */
export default function HotBettingSection() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 加载开放的竞猜市场（统一逻辑）
  const loadMarkets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await predictionApi.getOpenMarkets()
      // 使用展开运算符创建新数组，避免原地修改
      const sortedMarkets = [...(data || [])]
        .sort((a, b) => (b.total_pool || 0) - (a.total_pool || 0))
        .slice(0, 6)
      setMarkets(sortedMarkets)
    } catch (err) {
      console.error('加载竞猜市场失败:', err)
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载，带卸载保护
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await predictionApi.getOpenMarkets()
        if (cancelled) return
        const sortedMarkets = [...(data || [])]
          .sort((a, b) => (b.total_pool || 0) - (a.total_pool || 0))
          .slice(0, 6)
        setMarkets(sortedMarkets)
      } catch (err) {
        if (cancelled) return
        console.error('加载竞猜市场失败:', err)
        setError('加载失败，请稍后重试')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="py-12 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题区 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                热门竞猜
                <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">
                  <Trophy className="w-3 h-3 mr-1" />
                  积分赢取
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                用积分预测结果，猜中赢取更多奖励
              </p>
            </div>
          </div>

          <Link
            to="/activity"
            className="hidden sm:flex items-center gap-1 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 内容区 */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadMarkets}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        ) : markets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market, index) => (
              <BettingCard key={market.id} market={market} index={index} />
            ))}
          </div>
        )}

        {/* 移动端查看全部按钮 */}
        {!loading && markets.length > 0 && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/activity"
              className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium"
            >
              查看更多竞猜
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
