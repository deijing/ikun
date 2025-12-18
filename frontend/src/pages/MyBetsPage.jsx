import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Target,
  Coins,
  RefreshCw,
  ChevronRight,
  Trophy,
  Clock,
  Check,
  X,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { predictionApi, pointsApi } from '../services'

export default function MyBetsPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [loading, setLoading] = useState(true)
  const [bets, setBets] = useState([])
  const [balance, setBalance] = useState(0)
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, pending: 0, totalStake: 0, totalPayout: 0 })

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token, navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const [betsData, balanceData] = await Promise.all([
        predictionApi.getMyBets({ limit: 50 }),
        pointsApi.getBalance(),
      ])
      setBets(betsData)
      setBalance(balanceData.balance)

      // 计算统计
      const newStats = {
        total: betsData.length,
        won: 0,
        lost: 0,
        pending: 0,
        totalStake: 0,
        totalPayout: 0,
      }
      betsData.forEach((bet) => {
        newStats.totalStake += bet.stake_points
        if (bet.status === 'WON') {
          newStats.won++
          newStats.totalPayout += bet.payout_points || 0
        } else if (bet.status === 'LOST') {
          newStats.lost++
        } else if (bet.status === 'PLACED') {
          newStats.pending++
        }
      })
      setStats(newStats)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 返回按钮 */}
        <Link
          to="/activity"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回活动中心
        </Link>

        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">我的竞猜</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">共 {stats.total} 次下注</p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-slate-500">当前余额</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{balance}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-slate-500">累计下注</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStake}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-500">累计获得</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.totalPayout}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-slate-500">胜率</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.won + stats.lost > 0
                ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* 下注记录列表 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {bets.length === 0 ? (
            <div className="text-center py-16">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">还没有参与过竞猜</p>
              <Link
                to="/activity"
                className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 mt-4 hover:underline"
              >
                去参与竞猜
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {bets.map((bet) => (
                <Link
                  key={bet.id}
                  to={`/prediction/${bet.market_id}`}
                  className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          bet.status === 'WON'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : bet.status === 'LOST'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : bet.status === 'REFUNDED'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                          {bet.status === 'WON' && <Check className="w-3 h-3 text-green-600" />}
                          {bet.status === 'LOST' && <X className="w-3 h-3 text-red-500" />}
                          {bet.status === 'PLACED' && <Clock className="w-3 h-3 text-yellow-600" />}
                          {bet.status === 'REFUNDED' && <RefreshCw className="w-3 h-3 text-blue-500" />}
                        </span>
                        <h4 className="font-medium text-slate-900 dark:text-white truncate">
                          {bet.market_title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span>选择: {bet.option_label}</span>
                        <span>下注: {bet.stake_points}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {bet.status === 'WON' && (
                        <p className="text-green-600 font-bold">+{bet.payout_points}</p>
                      )}
                      {bet.status === 'LOST' && (
                        <p className="text-red-500 text-sm">-{bet.stake_points}</p>
                      )}
                      {bet.status === 'PLACED' && (
                        <p className="text-yellow-600 text-sm">等待结算</p>
                      )}
                      {bet.status === 'REFUNDED' && (
                        <p className="text-blue-500 text-sm">已退款</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(bet.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
