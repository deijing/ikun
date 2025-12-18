import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  Settings,
  Coins,
  Gift,
  Ticket,
  Sparkles,
  Target,
  Package,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Save,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  ArrowLeft,
  ShoppingBag,
  Dice1,
  Dice5,
  Star,
  Percent,
  Egg,
  Key,
  Award,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CircleDot,
  Cherry,
  Crown,
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/Toast'
import { adminApi2 } from '../services'

// Tab 组件
function Tab({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
        active
          ? 'text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-md shadow-purple-500/20'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

// 统计卡片
function StatCard({ title, value, subtitle, icon: Icon, color = 'purple' }) {
  const colorMap = {
    purple: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-200/50 dark:border-purple-500/20', icon: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
    pink: { bg: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-200/50 dark:border-pink-500/20', icon: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/20' },
    blue: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-200/50 dark:border-blue-500/20', icon: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
    green: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-200/50 dark:border-emerald-500/20', icon: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    orange: { bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-200/50 dark:border-orange-500/20', icon: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
    cyan: { bg: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-200/50 dark:border-cyan-500/20', icon: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20' },
  }
  const theme = colorMap[color] || colorMap.purple

  return (
    <div className={`relative overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl border ${theme.border} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${theme.shadow} group backdrop-blur-sm`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-50`} />
      <div className="relative flex items-center justify-between z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3.5 rounded-xl bg-gradient-to-br ${theme.icon} shadow-lg ${theme.shadow} transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// 活动概览面板
function OverviewPanel() {
  const toast = useToast()
  const [viewMode, setViewMode] = useState('total') // 'total' | 'daily'
  const [stats, setStats] = useState(null)
  const [dailyStats, setDailyStats] = useState(null)
  const [rangeStats, setRangeStats] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [chartDays, setChartDays] = useState(7) // 图表显示天数
  const [loading, setLoading] = useState(true)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    loadStats()
    loadRangeStats(7)
  }, [])

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailyStats(selectedDate)
    }
  }, [viewMode, selectedDate])

  const loadStats = async () => {
    try {
      const data = await adminApi2.getActivityStats()
      setStats(data)
    } catch (error) {
      console.error('加载统计失败:', error)
      setStats({
        total_points_issued: 0,
        total_points_spent: 0,
        total_signins: 0,
        total_lottery_draws: 0,
        total_scratch_cards: 0,
        total_gacha_draws: 0,
        total_slot_plays: 0,
        total_exchanges: 0,
        active_users_today: 0,
        points_issued_today: 0,
        points_spent_today: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDailyStats = async (date) => {
    setDailyLoading(true)
    try {
      const data = await adminApi2.getDailyStats(date)
      setDailyStats(data)
    } catch (error) {
      console.error('加载每日统计失败:', error)
      toast.error('加载每日统计失败')
    } finally {
      setDailyLoading(false)
    }
  }

  const loadRangeStats = async (days) => {
    setChartLoading(true)
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days + 1)
      const data = await adminApi2.getRangeStats(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      )
      setRangeStats(data)
    } catch (error) {
      console.error('加载趋势数据失败:', error)
    } finally {
      setChartLoading(false)
    }
  }

  const handleChartDaysChange = (days) => {
    setChartDays(days)
    loadRangeStats(days)
  }

  const changeDate = (days) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    const today = new Date()
    if (date <= today) {
      setSelectedDate(date.toISOString().split('T')[0])
    }
  }

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天'
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // 积分趋势图表配置
  const pointsChartOption = useMemo(() => {
    if (!rangeStats?.days) return {}
    const days = rangeStats.days
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' },
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#999' }
        }
      },
      legend: {
        data: ['发放积分', '消耗积分', '净流入'],
        textStyle: { color: '#94a3b8' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days.map(d => {
          const date = new Date(d.date)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(71, 85, 105, 0.3)' } }
      },
      series: [
        {
          name: '发放积分',
          type: 'bar',
          data: days.map(d => d.points_issued),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#10b981' },
                { offset: 1, color: '#059669' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: '消耗积分',
          type: 'bar',
          data: days.map(d => d.points_spent),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#f97316' },
                { offset: 1, color: '#ea580c' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: '净流入',
          type: 'line',
          data: days.map(d => d.points_issued - d.points_spent),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#8b5cf6' },
                { offset: 1, color: '#a855f7' }
              ]
            }
          },
          itemStyle: { color: '#8b5cf6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.3)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0)' }
              ]
            }
          }
        }
      ]
    }
  }, [rangeStats])

  // 活动参与趋势图表配置
  const activityChartOption = useMemo(() => {
    if (!rangeStats?.days) return {}
    const days = rangeStats.days
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(236, 72, 153, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' }
      },
      legend: {
        data: ['签到', '抽奖', '刮刮乐', '兑换'],
        textStyle: { color: '#94a3b8' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days.map(d => {
          const date = new Date(d.date)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(71, 85, 105, 0.3)' } }
      },
      series: [
        {
          name: '签到',
          type: 'line',
          data: days.map(d => d.signins),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#06b6d4' },
          itemStyle: { color: '#06b6d4' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(6, 182, 212, 0.2)' },
                { offset: 1, color: 'rgba(6, 182, 212, 0)' }
              ]
            }
          }
        },
        {
          name: '抽奖',
          type: 'line',
          data: days.map(d => d.lottery_draws),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#ec4899' },
          itemStyle: { color: '#ec4899' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(236, 72, 153, 0.2)' },
                { offset: 1, color: 'rgba(236, 72, 153, 0)' }
              ]
            }
          }
        },
        {
          name: '刮刮乐',
          type: 'line',
          data: days.map(d => d.scratch_cards),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#f97316' },
          itemStyle: { color: '#f97316' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(249, 115, 22, 0.2)' },
                { offset: 1, color: 'rgba(249, 115, 22, 0)' }
              ]
            }
          }
        },
        {
          name: '兑换',
          type: 'line',
          data: days.map(d => d.exchanges),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0)' }
              ]
            }
          }
        }
      ]
    }
  }, [rangeStats])

  // 活跃用户趋势图表配置
  const userChartOption = useMemo(() => {
    if (!rangeStats?.days) return {}
    const days = rangeStats.days
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days.map(d => {
          const date = new Date(d.date)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(71, 85, 105, 0.3)' } }
      },
      series: [
        {
          name: '活跃用户',
          type: 'line',
          data: days.map(d => d.active_users),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 0.5, color: '#8b5cf6' },
                { offset: 1, color: '#ec4899' }
              ]
            }
          },
          itemStyle: {
            color: '#8b5cf6',
            borderColor: '#fff',
            borderWidth: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
                { offset: 0.5, color: 'rgba(139, 92, 246, 0.1)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0)' }
              ]
            }
          }
        }
      ]
    }
  }, [rangeStats])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 视图切换 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('total')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'total'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            全部统计
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            每日统计
          </button>
        </div>

        {viewMode === 'daily' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
              />
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className={`p-2 rounded-lg transition-colors ${
                isToday
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            if (viewMode === 'total') {
              loadStats()
              loadRangeStats(chartDays)
            } else {
              loadDailyStats(selectedDate)
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${(loading || dailyLoading || chartLoading) ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {viewMode === 'total' ? (
        <>
          {/* 积分总览 - 全部统计 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              积分总览
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="累计发放积分"
                value={stats?.total_points_issued?.toLocaleString() || 0}
                subtitle={`今日 +${stats?.points_issued_today?.toLocaleString() || 0}`}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                title="累计消耗积分"
                value={stats?.total_points_spent?.toLocaleString() || 0}
                subtitle={`今日 -${stats?.points_spent_today?.toLocaleString() || 0}`}
                icon={Zap}
                color="orange"
              />
              <StatCard
                title="流通积分"
                value={((stats?.total_points_issued || 0) - (stats?.total_points_spent || 0)).toLocaleString()}
                icon={Coins}
                color="purple"
              />
              <StatCard
                title="今日活跃用户"
                value={stats?.active_users_today || 0}
                icon={Users}
                color="blue"
              />
            </div>
          </div>

          {/* 积分趋势图表 */}
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                积分趋势
              </h3>
              <div className="flex items-center gap-2">
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => handleChartDaysChange(days)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      chartDays === days
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : rangeStats?.days?.length > 0 ? (
              <ReactECharts option={pointsChartOption} style={{ height: '320px' }} />
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">暂无数据</div>
            )}
          </div>

          {/* 活动参与统计 - 全部统计 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              活动参与统计（累计）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="签到次数"
                value={stats?.total_signins?.toLocaleString() || 0}
                icon={Calendar}
                color="cyan"
              />
              <StatCard
                title="抽奖次数"
                value={stats?.total_lottery_draws?.toLocaleString() || 0}
                icon={Gift}
                color="pink"
              />
              <StatCard
                title="刮刮乐次数"
                value={stats?.total_scratch_cards?.toLocaleString() || 0}
                icon={Ticket}
                color="orange"
              />
              <StatCard
                title="扭蛋机次数"
                value={stats?.total_gacha_draws?.toLocaleString() || 0}
                icon={Sparkles}
                color="purple"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <StatCard
                title="老虎机次数"
                value={stats?.total_slot_plays?.toLocaleString() || 0}
                icon={Dice1}
                color="green"
              />
              <StatCard
                title="兑换次数"
                value={stats?.total_exchanges?.toLocaleString() || 0}
                icon={ShoppingBag}
                color="blue"
              />
            </div>
          </div>

          {/* 活动参与趋势图表 */}
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              活动参与趋势
            </h3>
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
              </div>
            ) : rangeStats?.days?.length > 0 ? (
              <ReactECharts option={activityChartOption} style={{ height: '320px' }} />
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">暂无数据</div>
            )}
          </div>

          {/* 活跃用户趋势图表 */}
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              活跃用户趋势
            </h3>
            {chartLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : rangeStats?.days?.length > 0 ? (
              <ReactECharts option={userChartOption} style={{ height: '260px' }} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">暂无数据</div>
            )}
          </div>
        </>
      ) : (
        <>
          {dailyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : dailyStats ? (
            <>
              {/* 积分总览 - 每日统计 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  {formatDateDisplay(selectedDate)} 积分统计
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="发放积分"
                    value={dailyStats.points_issued?.toLocaleString() || 0}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatCard
                    title="消耗积分"
                    value={dailyStats.points_spent?.toLocaleString() || 0}
                    icon={Zap}
                    color="orange"
                  />
                  <StatCard
                    title="净流入"
                    value={((dailyStats.points_issued || 0) - (dailyStats.points_spent || 0)).toLocaleString()}
                    icon={Coins}
                    color="purple"
                  />
                  <StatCard
                    title="活跃用户"
                    value={dailyStats.active_users || 0}
                    icon={Users}
                    color="blue"
                  />
                </div>
              </div>

              {/* 活动参与统计 - 每日统计 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500" />
                  {formatDateDisplay(selectedDate)} 活动参与
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="签到人数"
                    value={dailyStats.signins?.toLocaleString() || 0}
                    icon={Calendar}
                    color="cyan"
                  />
                  <StatCard
                    title="抽奖次数"
                    value={dailyStats.lottery_draws?.toLocaleString() || 0}
                    icon={Gift}
                    color="pink"
                  />
                  <StatCard
                    title="刮刮乐次数"
                    value={dailyStats.scratch_cards?.toLocaleString() || 0}
                    icon={Ticket}
                    color="orange"
                  />
                  <StatCard
                    title="扭蛋机次数"
                    value={dailyStats.gacha_draws?.toLocaleString() || 0}
                    icon={Sparkles}
                    color="purple"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <StatCard
                    title="老虎机次数"
                    value={dailyStats.slot_plays?.toLocaleString() || 0}
                    icon={Dice1}
                    color="green"
                  />
                  <StatCard
                    title="兑换次数"
                    value={dailyStats.exchanges?.toLocaleString() || 0}
                    icon={ShoppingBag}
                    color="blue"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">暂无数据</div>
          )}
        </>
      )}
    </div>
  )
}

// 签到配置面板
function SigninConfigPanel() {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [newMilestone, setNewMilestone] = useState({ days: '', bonus: '' })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const data = await adminApi2.getSigninConfig()
      // API 返回 {base_points: ..., milestones: [...]} 格式
      setConfig({
        base_points: data.base_points || 100,
        streak_bonus: 2,
        max_streak_bonus: 20,
      })
      setMilestones(data.milestones || [])
    } catch (error) {
      console.error('加载签到配置失败:', error)
      toast.error('加载签到配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestone = async () => {
    if (!newMilestone.days || !newMilestone.bonus) {
      toast.error('请填写完整信息')
      return
    }
    try {
      await adminApi2.createMilestone({
        days: parseInt(newMilestone.days),
        bonus_points: parseInt(newMilestone.bonus),
      })
      toast.success('里程碑添加成功')
      setNewMilestone({ days: '', bonus: '' })
      loadConfig()
    } catch (error) {
      toast.error('添加失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteMilestone = async (id) => {
    if (!confirm('确定删除这个里程碑？')) return
    try {
      await adminApi2.deleteMilestone(id)
      toast.success('删除成功')
      loadConfig()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 基础配置 */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-500" />
          基础配置
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">基础签到积分</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{config?.base_points || 10}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">连续签到加成</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{config?.streak_bonus || 2} 积分/天</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">最大连续加成</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{config?.max_streak_bonus || 20} 积分</p>
          </div>
        </div>
      </div>

      {/* 里程碑奖励 */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          里程碑奖励
        </h3>

        {/* 添加新里程碑 */}
        <div className="flex gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <input
            type="number"
            placeholder="连续天数"
            value={newMilestone.days}
            onChange={(e) => setNewMilestone({ ...newMilestone, days: e.target.value })}
            className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
          />
          <input
            type="number"
            placeholder="奖励积分"
            value={newMilestone.bonus}
            onChange={(e) => setNewMilestone({ ...newMilestone, bonus: e.target.value })}
            className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
          />
          <button
            onClick={handleAddMilestone}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>

        {/* 里程碑列表 */}
        <div className="space-y-2">
          {milestones.sort((a, b) => (a.day || a.days) - (b.day || b.days)).map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                  {m.day || m.days}
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">连续签到 {m.day || m.days} 天</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">奖励 {m.bonus_points} 积分</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteMilestone(m.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {milestones.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8">暂无里程碑配置</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 抽奖配置面板
function LotteryConfigPanel() {
  const toast = useToast()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPrize, setEditingPrize] = useState(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await adminApi2.getLotteryConfigs()
      // API 返回 {items: [...]} 格式
      setConfigs(data.items || data || [])
    } catch (error) {
      console.error('加载抽奖配置失败:', error)
      toast.error('加载抽奖配置失败')
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateConfig = async (id, updates) => {
    try {
      await adminApi2.updateLotteryConfig(id, updates)
      toast.success('更新成功')
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleUpdatePrize = async (id, updates) => {
    try {
      await adminApi2.updatePrize(id, updates)
      toast.success('更新成功')
      setEditingPrize(null)
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const PRIZE_TYPE_MAP = {
    POINTS: '积分',
    ITEM: '道具',
    API_KEY: 'API Key',
    NOTHING: '谢谢参与',
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  // 确保 configs 是数组
  const configList = Array.isArray(configs) ? configs : []

  return (
    <div className="space-y-6">
      {configList.length === 0 && (
        <div className="text-center py-12 text-slate-400">暂无抽奖配置</div>
      )}
      {configList.map((config) => (
        <div key={config.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              {config.name}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              config.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {config.is_active ? '已启用' : '已禁用'}
            </span>
          </div>

          {/* 基础配置 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">消耗积分</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{config.cost_points}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">每日限制</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{config.daily_limit || '无限制'}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">总抽奖次数</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{config.total_draws || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">奖品种类</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{config.prizes?.length || 0}</p>
            </div>
          </div>

          {/* 奖品列表 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">奖品池</p>
            {config.prizes?.map((prize) => (
              <div key={prize.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    prize.is_rare ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {prize.is_rare ? <Star className="w-5 h-5 text-white" /> : <Gift className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{prize.prize_name || prize.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {PRIZE_TYPE_MAP[prize.prize_type] || prize.prize_type || prize.type} | 权重: {prize.weight} | 库存: {prize.stock ?? '无限'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingPrize === prize.id ? (
                    <>
                      <input
                        type="number"
                        defaultValue={prize.weight}
                        className="w-20 px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                        id={`weight-${prize.id}`}
                      />
                      <button
                        onClick={() => handleUpdatePrize(prize.id, { weight: parseInt(document.getElementById(`weight-${prize.id}`).value) })}
                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPrize(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingPrize(prize.id)}
                      className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 兑换商城管理面板
function ExchangeManagePanel() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const data = await adminApi2.getExchangeItemsAdmin()
      setItems(data.items || data || [])
    } catch (error) {
      console.error('加载商品失败:', error)
      toast.error('加载商品失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item.id)
    setEditForm({
      price: item.price,
      stock: item.stock,
      daily_limit: item.daily_limit,
      total_limit: item.total_limit,
      is_active: item.is_active,
    })
  }

  const handleSave = async (id) => {
    try {
      await adminApi2.updateExchangeItem(id, editForm)
      toast.success('更新成功')
      setEditingItem(null)
      loadItems()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const ITEM_TYPE_MAP = {
    LOTTERY_TICKET: { name: '抽奖券', icon: Gift, color: 'pink' },
    SCRATCH_TICKET: { name: '刮刮乐券', icon: Ticket, color: 'orange' },
    GACHA_TICKET: { name: '扭蛋券', icon: Sparkles, color: 'purple' },
    API_KEY: { name: 'API Key', icon: Zap, color: 'blue' },
    ITEM: { name: '道具', icon: Package, color: 'green' },
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-500" />
          兑换商品管理
        </h3>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const typeInfo = ITEM_TYPE_MAP[item.item_type] || { name: item.item_type, icon: Package, color: 'slate' }
          const TypeIcon = typeInfo.icon
          const isEditing = editingItem === item.id

          return (
            <div key={item.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-${typeInfo.color}-400 to-${typeInfo.color}-600 flex items-center justify-center`}>
                    <TypeIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 dark:text-white">{item.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.is_active ? '上架' : '下架'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{typeInfo.name}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(item.id)}
                      className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">价格</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <p className="font-bold text-yellow-600 dark:text-yellow-400">{item.price} 积分</p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">库存</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.stock || ''}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="无限"
                      className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-white">{item.stock ?? '无限'}</p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">每日限购</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.daily_limit || ''}
                      onChange={(e) => setEditForm({ ...editForm, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="无限"
                      className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-white">{item.daily_limit || '无限'}</p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">总限购</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.total_limit || ''}
                      onChange={(e) => setEditForm({ ...editForm, total_limit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="无限"
                      className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-white">{item.total_limit || '无限'}</p>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">已兑换</p>
                  <p className="font-bold text-slate-800 dark:text-white">{item.exchange_count || 0}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 彩蛋管理面板
const REWARD_TYPES = [
  { value: 'points', label: '积分', icon: Coins, color: 'text-yellow-500' },
  { value: 'item', label: '道具', icon: Package, color: 'text-blue-500' },
  { value: 'badge', label: '徽章', icon: Award, color: 'text-purple-500' },
  { value: 'api_key', label: 'API Key', icon: Key, color: 'text-green-500' },
]

const ITEM_TYPES = [
  { value: 'cheer', label: '爱心打气' },
  { value: 'coffee', label: '咖啡' },
  { value: 'energy', label: '能量' },
  { value: 'pizza', label: '披萨' },
  { value: 'star', label: '星星' },
]

function getStatusStyle(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'claimed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'disabled':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    case 'expired':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusText(status) {
  switch (status) {
    case 'active': return '可用'
    case 'claimed': return '已领取'
    case 'disabled': return '已禁用'
    case 'expired': return '已过期'
    default: return status
  }
}

function formatReward(type, value) {
  if (!value) return '-'
  switch (type) {
    case 'points':
      return `${value.amount || 0} 积分`
    case 'item':
      const itemLabel = ITEM_TYPES.find(i => i.value === value.item_type)?.label || value.item_type
      return `${value.amount || 1}x ${itemLabel}`
    case 'badge':
      return value.badge_name || value.badge_key
    case 'api_key':
      return 'API Key'
    default:
      return JSON.stringify(value)
  }
}

function EasterEggPanel() {
  const toast = useToast()
  const [codes, setCodes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  const [newCode, setNewCode] = useState({
    code: '',
    reward_type: 'points',
    reward_value: { amount: 100 },
    description: '',
    hint: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [codesRes, statsRes] = await Promise.all([
        api.get('/easter-egg/admin/list'),
        api.get('/easter-egg/admin/stats'),
      ])
      setCodes(codesRes.items || [])
      setStats(statsRes)
    } catch (err) {
      toast.error(err.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCode.code.trim()) return

    setCreating(true)
    try {
      await api.post('/easter-egg/admin/create', {
        code: newCode.code.trim().toUpperCase(),
        reward_type: newCode.reward_type,
        reward_value: newCode.reward_value,
        description: newCode.description || null,
        hint: newCode.hint || null,
      })
      setNewCode({
        code: '',
        reward_type: 'points',
        reward_value: { amount: 100 },
        description: '',
        hint: '',
      })
      setShowCreateForm(false)
      toast.success('彩蛋码创建成功')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDisable = async (codeId) => {
    if (!confirm('确定要禁用这个彩蛋码吗？')) return
    try {
      await api.put(`/easter-egg/admin/${codeId}/disable`)
      toast.success('已禁用')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || '禁用失败')
    }
  }

  const updateRewardValue = (type, field, value) => {
    if (type === 'points') {
      setNewCode(prev => ({ ...prev, reward_value: { amount: parseInt(value) || 0 } }))
    } else if (type === 'item') {
      setNewCode(prev => ({
        ...prev,
        reward_value: { ...prev.reward_value, [field]: field === 'amount' ? (parseInt(value) || 1) : value }
      }))
    } else if (type === 'badge') {
      setNewCode(prev => ({ ...prev, reward_value: { ...prev.reward_value, [field]: value } }))
    }
  }

  const handleRewardTypeChange = (type) => {
    let defaultValue = {}
    switch (type) {
      case 'points': defaultValue = { amount: 100 }; break
      case 'item': defaultValue = { item_type: 'cheer', amount: 1 }; break
      case 'badge': defaultValue = { badge_key: '', badge_name: '' }; break
      case 'api_key': defaultValue = {}; break
    }
    setNewCode(prev => ({ ...prev, reward_type: type, reward_value: defaultValue }))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="总彩蛋码" value={stats.total_codes || 0} icon={Egg} color="purple" />
          <StatCard title="可用" value={stats.active_codes || 0} icon={Check} color="green" />
          <StatCard title="已领取" value={stats.claimed_codes || 0} icon={Gift} color="blue" />
          <StatCard title="已禁用/过期" value={(stats.disabled_codes || 0) + (stats.expired_codes || 0)} icon={Ban} color="orange" />
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增彩蛋码
        </button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Egg className="w-5 h-5 text-purple-500" />
            创建新彩蛋码
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">兑换码 *</label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="如: IKUN-EGG-XXXX"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">奖励类型</label>
                <select
                  value={newCode.reward_type}
                  onChange={(e) => handleRewardTypeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  {REWARD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 奖励配置 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">奖励配置</label>
              {newCode.reward_type === 'points' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newCode.reward_value.amount || ''}
                    onChange={(e) => updateRewardValue('points', 'amount', e.target.value)}
                    placeholder="积分数量"
                    min="1"
                    className="w-32 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                  <span className="text-slate-500">积分</span>
                </div>
              )}
              {newCode.reward_type === 'item' && (
                <div className="flex items-center gap-4">
                  <select
                    value={newCode.reward_value.item_type || 'cheer'}
                    onChange={(e) => updateRewardValue('item', 'item_type', e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  >
                    {ITEM_TYPES.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newCode.reward_value.amount || ''}
                    onChange={(e) => updateRewardValue('item', 'amount', e.target.value)}
                    placeholder="数量"
                    min="1"
                    className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                  <span className="text-slate-500">个</span>
                </div>
              )}
              {newCode.reward_type === 'badge' && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newCode.reward_value.badge_key || ''}
                    onChange={(e) => updateRewardValue('badge', 'badge_key', e.target.value)}
                    placeholder="徽章标识"
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newCode.reward_value.badge_name || ''}
                    onChange={(e) => updateRewardValue('badge', 'badge_name', e.target.value)}
                    placeholder="徽章名称"
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
              )}
              {newCode.reward_type === 'api_key' && (
                <p className="text-sm text-slate-500">API Key 将从库存中自动分配</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述（管理员可见）</label>
                <input
                  type="text"
                  value={newCode.description}
                  onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="内部备注"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">兑换成功提示</label>
                <input
                  type="text"
                  value={newCode.hint}
                  onChange={(e) => setNewCode(prev => ({ ...prev, hint: e.target.value }))}
                  placeholder="兑换成功后显示给用户"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={creating || !newCode.code.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 彩蛋码列表 */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-500" />
          彩蛋码列表
        </h3>

        {codes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">暂无彩蛋码</div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => {
              const typeInfo = REWARD_TYPES.find(t => t.value === code.reward_type) || {}
              const TypeIcon = typeInfo.icon || Gift
              return (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 border border-transparent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-700 ${typeInfo.color || 'text-slate-500'}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold text-slate-800 dark:text-white">{code.code}</code>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(code.status)}`}>
                          {getStatusText(code.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatReward(code.reward_type, code.reward_value)}
                        {code.description && <span className="ml-2">· {code.description}</span>}
                      </div>
                      {code.status === 'claimed' && code.claimer_username && (
                        <div className="text-xs text-blue-500 mt-1">已被 {code.claimer_username} 领取</div>
                      )}
                    </div>
                  </div>
                  {code.status === 'active' && (
                    <button
                      onClick={() => handleDisable(code.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="禁用"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// 用户积分调整面板
function UserPointsPanel() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [adjustingUser, setAdjustingUser] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' })

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return
    setLoading(true)
    try {
      const data = await adminApi2.getUsers({ keyword: searchKeyword, limit: 20 })
      setUsers(data.items || data)
    } catch (error) {
      toast.error('搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async (userId) => {
    if (!adjustForm.amount || !adjustForm.reason) {
      toast.error('请填写完整信息')
      return
    }
    try {
      await adminApi2.adjustPoints(userId, {
        amount: parseInt(adjustForm.amount),
        reason: adjustForm.reason,
      })
      toast.success('积分调整成功')
      setAdjustingUser(null)
      setAdjustForm({ amount: '', reason: '' })
      handleSearch()
    } catch (error) {
      toast.error('调整失败：' + (error.response?.data?.detail || error.message))
    }
  }

  return (
    <div className="space-y-6">
      {/* 搜索 */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          用户积分调整
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="搜索用户名或ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            搜索
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      {users.length > 0 && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{user.display_name || user.username}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username} | 积分: {user.points_balance || 0}</p>
                  </div>
                </div>

                {adjustingUser === user.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="积分数量(+/-)"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                      className="w-28 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                    <input
                      type="text"
                      placeholder="调整原因"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="w-40 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      onClick={() => handleAdjust(user.id)}
                      className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setAdjustingUser(null); setAdjustForm({ amount: '', reason: '' }) }}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdjustingUser(user.id)}
                    className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    调整积分
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 刮刮乐/彩票管理面板
function ScratchManagePanel() {
  const toast = useToast()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPrize, setEditingPrize] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateConfig, setShowCreateConfig] = useState(false)
  const [newConfig, setNewConfig] = useState({
    name: '刮刮乐活动',
    cost_points: 30,
    daily_limit: 10,
  })
  const [newPrize, setNewPrize] = useState({
    prize_name: '',
    prize_type: 'POINTS',
    prize_value: '',
    weight: 100,
    stock: null,
    is_rare: false,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await adminApi2.getLotteryConfigs()
      // 筛选刮刮乐配置
      const scratchConfigs = (data.items || data || []).filter(
        c => c.name?.includes('刮刮乐') || c.name?.includes('彩票')
      )
      setConfigs(scratchConfigs)
    } catch (error) {
      console.error('加载刮刮乐配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfig = async () => {
    if (!newConfig.name) {
      toast.error('请填写配置名称')
      return
    }
    try {
      await adminApi2.createLotteryConfig(newConfig)
      toast.success('创建成功')
      setShowCreateConfig(false)
      setNewConfig({ name: '刮刮乐活动', cost_points: 30, daily_limit: 10 })
      loadConfigs()
    } catch (error) {
      toast.error('创建失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleUpdateConfig = async (id, updates) => {
    try {
      await adminApi2.updateLotteryConfig(id, updates)
      toast.success('更新成功')
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleAddPrize = async (configId) => {
    if (!newPrize.prize_name) {
      toast.error('请填写奖品名称')
      return
    }
    try {
      await adminApi2.createPrize({
        config_id: configId,
        ...newPrize,
        stock: newPrize.stock || null,
      })
      toast.success('奖品添加成功')
      setNewPrize({
        prize_name: '',
        prize_type: 'POINTS',
        prize_value: '',
        weight: 100,
        stock: null,
        is_rare: false,
      })
      setShowCreateForm(false)
      loadConfigs()
    } catch (error) {
      toast.error('添加失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleUpdatePrize = async (id, updates) => {
    try {
      await adminApi2.updatePrize(id, updates)
      toast.success('更新成功')
      setEditingPrize(null)
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeletePrize = async (id) => {
    if (!confirm('确定删除这个奖品？')) return
    try {
      await adminApi2.deletePrize(id)
      toast.success('删除成功')
      loadConfigs()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const PRIZE_TYPE_MAP = {
    POINTS: { name: '积分', icon: Coins, color: 'yellow' },
    ITEM: { name: '道具', icon: Package, color: 'blue' },
    API_KEY: { name: 'API Key', icon: Key, color: 'green' },
    EMPTY: { name: '谢谢参与', icon: X, color: 'gray' },
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 页面说明 */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl p-6 border border-orange-200/50 dark:border-orange-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">刮刮乐/彩票管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">管理刮刮乐奖品和概率配置</p>
          </div>
        </div>
      </div>

      {/* 创建配置按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateConfig(!showCreateConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          创建刮刮乐配置
        </button>
      </div>

      {/* 创建配置表单 */}
      {showCreateConfig && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-orange-200 dark:border-orange-800/30 p-6">
          <h4 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-orange-500" />
            创建刮刮乐配置
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">配置名称 *</label>
              <input
                type="text"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                placeholder="如：刮刮乐活动、彩票抽奖"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">名称需包含"刮刮乐"或"彩票"</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">消耗积分</label>
              <input
                type="number"
                value={newConfig.cost_points}
                onChange={(e) => setNewConfig({ ...newConfig, cost_points: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">每日限制</label>
              <input
                type="number"
                value={newConfig.daily_limit || ''}
                onChange={(e) => setNewConfig({ ...newConfig, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="空为无限制"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreateConfig(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleCreateConfig}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              创建配置
            </button>
          </div>
        </div>
      )}

      {configs.length === 0 && !showCreateConfig ? (
        <div className="text-center py-12 text-slate-400">
          <Ticket className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无刮刮乐配置</p>
          <p className="text-sm mt-2">点击上方按钮创建刮刮乐配置</p>
        </div>
      ) : (
        configs.map((config) => (
          <div key={config.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-500" />
                {config.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {config.is_active ? '已启用' : '已禁用'}
                </span>
                <button
                  onClick={() => handleUpdateConfig(config.id, { is_active: !config.is_active })}
                  className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                >
                  {config.is_active ? '禁用' : '启用'}
                </button>
              </div>
            </div>

            {/* 基础配置 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">消耗积分</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{config.cost_points}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">每日限制</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.daily_limit || '无限制'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">总抽奖次数</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.total_draws || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">奖品种类</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.prizes?.length || 0}</p>
              </div>
            </div>

            {/* 添加奖品按钮 */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateForm(showCreateForm === config.id ? false : config.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                添加奖品
              </button>
            </div>

            {/* 创建奖品表单 */}
            {showCreateForm === config.id && (
              <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30">
                <h4 className="font-medium text-slate-800 dark:text-white mb-3">添加新奖品</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="奖品名称 *"
                    value={newPrize.prize_name}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <select
                    value={newPrize.prize_type}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_type: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="POINTS">积分</option>
                    <option value="ITEM">道具</option>
                    <option value="API_KEY">API Key</option>
                    <option value="EMPTY">谢谢参与</option>
                  </select>
                  <input
                    type="text"
                    placeholder="奖品值（积分数/道具名）"
                    value={newPrize.prize_value}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_value: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="权重"
                    value={newPrize.weight}
                    onChange={(e) => setNewPrize({ ...newPrize, weight: parseInt(e.target.value) || 100 })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="库存（空=无限）"
                    value={newPrize.stock || ''}
                    onChange={(e) => setNewPrize({ ...newPrize, stock: e.target.value ? parseInt(e.target.value) : null })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={newPrize.is_rare}
                      onChange={(e) => setNewPrize({ ...newPrize, is_rare: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">稀有奖品</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleAddPrize(config.id)}
                    className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* 奖品列表 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">奖品池</p>
              {config.prizes?.map((prize) => {
                const typeInfo = PRIZE_TYPE_MAP[prize.prize_type] || PRIZE_TYPE_MAP.EMPTY
                const TypeIcon = typeInfo.icon
                return (
                  <div key={prize.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        prize.is_rare ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {prize.is_rare ? <Star className="w-5 h-5 text-white" /> : <TypeIcon className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{prize.prize_name || prize.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeInfo.name} | 权重: {prize.weight} | 库存: {prize.stock ?? '无限'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeletePrize(prize.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// 老虎机管理面板
function SlotMachineManagePanel() {
  const toast = useToast()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateConfig, setShowCreateConfig] = useState(false)
  const [newConfig, setNewConfig] = useState({
    name: '老虎机游戏',
    cost_points: 20,
    daily_limit: 20,
  })
  const [newPrize, setNewPrize] = useState({
    prize_name: '',
    prize_type: 'POINTS',
    prize_value: '',
    weight: 100,
    stock: null,
    is_rare: false,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await adminApi2.getLotteryConfigs()
      // 筛选老虎机配置
      const slotConfigs = (data.items || data || []).filter(
        c => c.name?.includes('老虎机') || c.name?.includes('水果机')
      )
      setConfigs(slotConfigs)
    } catch (error) {
      console.error('加载老虎机配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfig = async () => {
    if (!newConfig.name) {
      toast.error('请填写配置名称')
      return
    }
    try {
      await adminApi2.createLotteryConfig(newConfig)
      toast.success('创建成功')
      setShowCreateConfig(false)
      setNewConfig({ name: '老虎机游戏', cost_points: 20, daily_limit: 20 })
      loadConfigs()
    } catch (error) {
      toast.error('创建失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleUpdateConfig = async (id, updates) => {
    try {
      await adminApi2.updateLotteryConfig(id, updates)
      toast.success('更新成功')
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleAddPrize = async (configId) => {
    if (!newPrize.prize_name) {
      toast.error('请填写奖品名称')
      return
    }
    try {
      await adminApi2.createPrize({
        config_id: configId,
        ...newPrize,
        stock: newPrize.stock || null,
      })
      toast.success('奖品添加成功')
      setNewPrize({
        prize_name: '',
        prize_type: 'POINTS',
        prize_value: '',
        weight: 100,
        stock: null,
        is_rare: false,
      })
      setShowCreateForm(false)
      loadConfigs()
    } catch (error) {
      toast.error('添加失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeletePrize = async (id) => {
    if (!confirm('确定删除这个奖品？')) return
    try {
      await adminApi2.deletePrize(id)
      toast.success('删除成功')
      loadConfigs()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const PRIZE_TYPE_MAP = {
    POINTS: { name: '积分', icon: Coins, color: 'yellow' },
    ITEM: { name: '道具', icon: Package, color: 'blue' },
    API_KEY: { name: 'API Key', icon: Key, color: 'green' },
    EMPTY: { name: '谢谢参与', icon: X, color: 'gray' },
  }

  // 老虎机符号列表
  const SLOT_SYMBOLS = [
    { icon: Cherry, name: '樱桃', color: 'text-red-500' },
    { icon: Star, name: '星星', color: 'text-yellow-500' },
    { icon: Crown, name: '皇冠', color: 'text-purple-500' },
    { icon: Dice5, name: '骰子', color: 'text-blue-500' },
    { icon: Coins, name: '金币', color: 'text-amber-500' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-green-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 页面说明 */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-200/50 dark:border-green-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
            <Dice1 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">老虎机管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">管理老虎机/水果机奖品和概率配置</p>
          </div>
        </div>
        {/* 老虎机符号展示 */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">游戏符号：</span>
          <div className="flex items-center gap-2">
            {SLOT_SYMBOLS.map((symbol, i) => (
              <div key={i} className={`p-2 bg-white dark:bg-slate-800 rounded-lg ${symbol.color}`}>
                <symbol.icon className="w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 创建配置按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateConfig(!showCreateConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          创建老虎机配置
        </button>
      </div>

      {/* 创建配置表单 */}
      {showCreateConfig && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-green-200 dark:border-green-800/30 p-6">
          <h4 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Dice1 className="w-5 h-5 text-green-500" />
            创建老虎机配置
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">配置名称 *</label>
              <input
                type="text"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                placeholder="如：老虎机游戏、水果机"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">名称需包含"老虎机"或"水果机"</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">消耗积分</label>
              <input
                type="number"
                value={newConfig.cost_points}
                onChange={(e) => setNewConfig({ ...newConfig, cost_points: parseInt(e.target.value) || 20 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">每日限制</label>
              <input
                type="number"
                value={newConfig.daily_limit || ''}
                onChange={(e) => setNewConfig({ ...newConfig, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="空为无限制"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreateConfig(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleCreateConfig}
              className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              创建配置
            </button>
          </div>
        </div>
      )}

      {configs.length === 0 && !showCreateConfig ? (
        <div className="text-center py-12 text-slate-400">
          <Dice1 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无老虎机配置</p>
          <p className="text-sm mt-2">点击上方按钮创建老虎机配置</p>
        </div>
      ) : (
        configs.map((config) => (
          <div key={config.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Dice1 className="w-5 h-5 text-green-500" />
                {config.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {config.is_active ? '已启用' : '已禁用'}
                </span>
                <button
                  onClick={() => handleUpdateConfig(config.id, { is_active: !config.is_active })}
                  className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                >
                  {config.is_active ? '禁用' : '启用'}
                </button>
              </div>
            </div>

            {/* 基础配置 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">消耗积分</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{config.cost_points}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">每日限制</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.daily_limit || '无限制'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">总游玩次数</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.total_draws || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">奖品种类</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.prizes?.length || 0}</p>
              </div>
            </div>

            {/* 添加奖品按钮 */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateForm(showCreateForm === config.id ? false : config.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                添加奖品
              </button>
            </div>

            {/* 创建奖品表单 */}
            {showCreateForm === config.id && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30">
                <h4 className="font-medium text-slate-800 dark:text-white mb-3">添加新奖品</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="奖品名称 *"
                    value={newPrize.prize_name}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <select
                    value={newPrize.prize_type}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_type: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="POINTS">积分</option>
                    <option value="ITEM">道具</option>
                    <option value="API_KEY">API Key</option>
                    <option value="EMPTY">谢谢参与</option>
                  </select>
                  <input
                    type="text"
                    placeholder="奖品值（积分数/道具名）"
                    value={newPrize.prize_value}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_value: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="权重"
                    value={newPrize.weight}
                    onChange={(e) => setNewPrize({ ...newPrize, weight: parseInt(e.target.value) || 100 })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="库存（空=无限）"
                    value={newPrize.stock || ''}
                    onChange={(e) => setNewPrize({ ...newPrize, stock: e.target.value ? parseInt(e.target.value) : null })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={newPrize.is_rare}
                      onChange={(e) => setNewPrize({ ...newPrize, is_rare: e.target.checked })}
                      className="w-4 h-4 rounded text-green-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">稀有奖品</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleAddPrize(config.id)}
                    className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* 奖品列表 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">奖品池</p>
              {config.prizes?.map((prize) => {
                const typeInfo = PRIZE_TYPE_MAP[prize.prize_type] || PRIZE_TYPE_MAP.EMPTY
                const TypeIcon = typeInfo.icon
                return (
                  <div key={prize.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        prize.is_rare ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {prize.is_rare ? <Star className="w-5 h-5 text-white" /> : <TypeIcon className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{prize.prize_name || prize.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeInfo.name} | 权重: {prize.weight} | 库存: {prize.stock ?? '无限'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeletePrize(prize.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// 扭蛋机管理面板
function GachaManagePanel() {
  const toast = useToast()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateConfig, setShowCreateConfig] = useState(false)
  const [newConfig, setNewConfig] = useState({
    name: '扭蛋机抽卡',
    cost_points: 50,
    daily_limit: 10,
  })
  const [newPrize, setNewPrize] = useState({
    prize_name: '',
    prize_type: 'POINTS',
    prize_value: '',
    weight: 100,
    stock: null,
    is_rare: false,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const data = await adminApi2.getLotteryConfigs()
      // 筛选扭蛋机配置
      const gachaConfigs = (data.items || data || []).filter(
        c => c.name?.includes('扭蛋') || c.name?.includes('盲盒')
      )
      setConfigs(gachaConfigs)
    } catch (error) {
      console.error('加载扭蛋机配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfig = async () => {
    if (!newConfig.name) {
      toast.error('请填写配置名称')
      return
    }
    try {
      await adminApi2.createLotteryConfig(newConfig)
      toast.success('创建成功')
      setShowCreateConfig(false)
      setNewConfig({ name: '扭蛋机抽卡', cost_points: 50, daily_limit: 10 })
      loadConfigs()
    } catch (error) {
      toast.error('创建失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleUpdateConfig = async (id, updates) => {
    try {
      await adminApi2.updateLotteryConfig(id, updates)
      toast.success('更新成功')
      loadConfigs()
    } catch (error) {
      toast.error('更新失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleAddPrize = async (configId) => {
    if (!newPrize.prize_name) {
      toast.error('请填写奖品名称')
      return
    }
    try {
      await adminApi2.createPrize({
        config_id: configId,
        ...newPrize,
        stock: newPrize.stock || null,
      })
      toast.success('奖品添加成功')
      setNewPrize({
        prize_name: '',
        prize_type: 'POINTS',
        prize_value: '',
        weight: 100,
        stock: null,
        is_rare: false,
      })
      setShowCreateForm(false)
      loadConfigs()
    } catch (error) {
      toast.error('添加失败：' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeletePrize = async (id) => {
    if (!confirm('确定删除这个奖品？')) return
    try {
      await adminApi2.deletePrize(id)
      toast.success('删除成功')
      loadConfigs()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const PRIZE_TYPE_MAP = {
    POINTS: { name: '积分', icon: Coins, color: 'yellow' },
    ITEM: { name: '道具', icon: Package, color: 'blue' },
    API_KEY: { name: 'API Key', icon: Key, color: 'green' },
    EMPTY: { name: '谢谢参与', icon: X, color: 'gray' },
  }

  // 扭蛋稀有度配色
  const RARITY_COLORS = [
    { name: 'N (普通)', color: 'bg-gray-400' },
    { name: 'R (稀有)', color: 'bg-blue-500' },
    { name: 'SR (超稀有)', color: 'bg-purple-500' },
    { name: 'SSR (极稀有)', color: 'bg-gradient-to-r from-yellow-400 to-orange-500' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 页面说明 */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
            <CircleDot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">扭蛋机/盲盒管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">管理扭蛋机奖品和稀有度配置</p>
          </div>
        </div>
        {/* 稀有度展示 */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <span className="text-sm text-slate-500 dark:text-slate-400">稀有度：</span>
          <div className="flex items-center gap-2 flex-wrap">
            {RARITY_COLORS.map((rarity, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${rarity.color}`} />
                <span className="text-sm text-slate-600 dark:text-slate-300">{rarity.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 创建配置按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateConfig(!showCreateConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          创建扭蛋机配置
        </button>
      </div>

      {/* 创建配置表单 */}
      {showCreateConfig && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-purple-200 dark:border-purple-800/30 p-6">
          <h4 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-purple-500" />
            创建扭蛋机配置
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">配置名称 *</label>
              <input
                type="text"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                placeholder="如：扭蛋机抽卡、盲盒活动"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">名称需包含"扭蛋"或"盲盒"</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">消耗积分</label>
              <input
                type="number"
                value={newConfig.cost_points}
                onChange={(e) => setNewConfig({ ...newConfig, cost_points: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">每日限制</label>
              <input
                type="number"
                value={newConfig.daily_limit || ''}
                onChange={(e) => setNewConfig({ ...newConfig, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="空为无限制"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreateConfig(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleCreateConfig}
              className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              创建配置
            </button>
          </div>
        </div>
      )}

      {configs.length === 0 && !showCreateConfig ? (
        <div className="text-center py-12 text-slate-400">
          <CircleDot className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无扭蛋机配置</p>
          <p className="text-sm mt-2">点击上方按钮创建扭蛋机配置</p>
        </div>
      ) : (
        configs.map((config) => (
          <div key={config.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-purple-500" />
                {config.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {config.is_active ? '已启用' : '已禁用'}
                </span>
                <button
                  onClick={() => handleUpdateConfig(config.id, { is_active: !config.is_active })}
                  className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                >
                  {config.is_active ? '禁用' : '启用'}
                </button>
              </div>
            </div>

            {/* 基础配置 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">消耗积分</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{config.cost_points}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">每日限制</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.daily_limit || '无限制'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">总抽卡次数</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.total_draws || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">奖品种类</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{config.prizes?.length || 0}</p>
              </div>
            </div>

            {/* 添加奖品按钮 */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateForm(showCreateForm === config.id ? false : config.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                添加奖品
              </button>
            </div>

            {/* 创建奖品表单 */}
            {showCreateForm === config.id && (
              <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800/30">
                <h4 className="font-medium text-slate-800 dark:text-white mb-3">添加新奖品</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="奖品名称 *"
                    value={newPrize.prize_name}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <select
                    value={newPrize.prize_type}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_type: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="POINTS">积分</option>
                    <option value="ITEM">道具</option>
                    <option value="API_KEY">API Key</option>
                    <option value="EMPTY">谢谢参与</option>
                  </select>
                  <input
                    type="text"
                    placeholder="奖品值（积分数/道具名）"
                    value={newPrize.prize_value}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_value: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="权重"
                    value={newPrize.weight}
                    onChange={(e) => setNewPrize({ ...newPrize, weight: parseInt(e.target.value) || 100 })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="库存（空=无限）"
                    value={newPrize.stock || ''}
                    onChange={(e) => setNewPrize({ ...newPrize, stock: e.target.value ? parseInt(e.target.value) : null })}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={newPrize.is_rare}
                      onChange={(e) => setNewPrize({ ...newPrize, is_rare: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">稀有奖品 (SSR)</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleAddPrize(config.id)}
                    className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {/* 奖品列表 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">奖品池</p>
              {config.prizes?.map((prize) => {
                const typeInfo = PRIZE_TYPE_MAP[prize.prize_type] || PRIZE_TYPE_MAP.EMPTY
                const TypeIcon = typeInfo.icon
                return (
                  <div key={prize.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        prize.is_rare ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {prize.is_rare ? <Sparkles className="w-5 h-5 text-white" /> : <TypeIcon className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-white">{prize.prize_name || prize.name}</p>
                          {prize.is_rare && (
                            <span className="px-1.5 py-0.5 text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded font-bold">SSR</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeInfo.name} | 权重: {prize.weight} | 库存: {prize.stock ?? '无限'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeletePrize(prize.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// 主页面组件
export default function ActivityManagePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState('overview')

  // 权限检查
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">无权访问</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">此页面仅限管理员访问</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: '活动概览', icon: TrendingUp },
    { id: 'signin', name: '签到配置', icon: Calendar },
    { id: 'lottery', name: '抽奖配置', icon: Gift },
    { id: 'scratch', name: '刮刮乐管理', icon: Ticket },
    { id: 'slot', name: '老虎机管理', icon: Dice1 },
    { id: 'gacha', name: '扭蛋机管理', icon: CircleDot },
    { id: 'exchange', name: '兑换商城', icon: ShoppingBag },
    { id: 'easter-egg', name: '彩蛋管理', icon: Egg },
    { id: 'users', name: '用户积分', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-slate-950 dark:via-purple-950/20 dark:to-pink-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                活动管理中心
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">管理积分、抽奖、签到等活动配置</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              管理后台
            </button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
            >
              {tab.name}
            </Tab>
          ))}
        </div>

        {/* 内容区 */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'signin' && <SigninConfigPanel />}
          {activeTab === 'lottery' && <LotteryConfigPanel />}
          {activeTab === 'scratch' && <ScratchManagePanel />}
          {activeTab === 'slot' && <SlotMachineManagePanel />}
          {activeTab === 'gacha' && <GachaManagePanel />}
          {activeTab === 'exchange' && <ExchangeManagePanel />}
          {activeTab === 'easter-egg' && <EasterEggPanel />}
          {activeTab === 'users' && <UserPointsPanel />}
        </div>
      </div>
    </div>
  )
}
