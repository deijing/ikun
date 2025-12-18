import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Gift,
  TrendingUp,
  Coins,
  Check,
  Flame,
  Star,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Trophy,
  Clock,
  Users,
  Target,
  Zap,
  Heart,
  Coffee,
  Pizza,
  Award,
  AlertCircle,
  Backpack,
  X,
  Package,
  Key,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/Toast'
import { pointsApi, lotteryApi, predictionApi } from '../services'
import { trackSignin, trackLottery } from '../utils/analytics'
import GachaMachine from '../components/activity/GachaMachine'
import ScratchCard from '../components/activity/ScratchCard'
import ExchangeShop from '../components/activity/ExchangeShop'
import SlotMachine from '../components/activity/SlotMachine'

// 骨架屏组件
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  )
}

// 签到日历骨架
function SigninCalendarSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="w-20 h-5 mb-1" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
        <Skeleton className="w-16 h-6" />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {Array(35).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}

// 抽奖骨架
function LotterySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="w-20 h-5 mb-1" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
        <Skeleton className="w-16 h-5" />
      </div>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Array(10).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}

// 错误提示组件
function ErrorCard({ title, message, onRetry }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="font-medium text-slate-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        )}
      </div>
    </div>
  )
}

// 签到日历组件
function SigninCalendar({ signinStatus, onSignin, signing }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const signedDates = new Set(signinStatus?.monthly_signins || [])
  const todayStr = today.toISOString().split('T')[0]

  const days = []
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isSigned = signedDates.has(dateStr)
    const isToday = dateStr === todayStr
    const isPast = new Date(dateStr) < new Date(todayStr)

    days.push(
      <div
        key={day}
        className={`h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
          isSigned
            ? 'bg-green-500 text-white'
            : isToday
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 ring-2 ring-yellow-500'
            : isPast
            ? 'text-slate-300 dark:text-slate-600'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {isSigned ? <Check className="w-4 h-4" /> : day}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">每日签到</h3>
            <p className="text-sm text-slate-500">{monthNames[month]} {year}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{signinStatus?.streak_display || 0}</span>
            <span className="text-sm text-slate-500">天连签</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-xs text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {days}
      </div>

      {signinStatus?.milestones && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {signinStatus.milestones.map((m) => (
            <div
              key={m.day}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                m.reached
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {m.day}天 +{m.bonus}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onSignin}
        disabled={signing || signinStatus?.signed_today}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
          signinStatus?.signed_today
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30'
        }`}
      >
        {signing ? (
          <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
        ) : signinStatus?.signed_today ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            今日已签到
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            立即签到 +100积分
          </span>
        )}
      </button>

      {signinStatus?.next_milestone && !signinStatus?.signed_today && (
        <p className="text-center text-sm text-slate-500 mt-3">
          再签到 {signinStatus.days_to_milestone} 天，额外获得 {signinStatus.next_milestone_bonus} 积分
        </p>
      )}
    </div>
  )
}

// 抽奖转盘组件
function LotteryWheel({ lotteryInfo, onDraw, drawing, lastPrize }) {
  const prizes = lotteryInfo?.prizes || []

  const prizeIcons = {
    'cheer': Heart,
    'coffee': Coffee,
    'energy': Zap,
    'pizza': Pizza,
    'star': Star,
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">幸运抽奖</h3>
            <p className="text-sm text-slate-500">{lotteryInfo?.cost_points || 20}积分/次</p>
          </div>
        </div>
        {lotteryInfo?.daily_limit && (
          <div className="text-sm text-slate-500">
            今日: {lotteryInfo?.today_count || 0}/{lotteryInfo?.daily_limit}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {prizes.slice(0, 10).map((prize, idx) => {
          const Icon = prizeIcons[prize.name?.toLowerCase()] || Gift
          return (
            <div
              key={idx}
              className={`p-2 rounded-lg text-center ${
                prize.is_rare
                  ? 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 ring-1 ring-yellow-400'
                  : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${prize.is_rare ? 'text-yellow-500' : 'text-slate-400'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{prize.name}</span>
            </div>
          )
        })}
      </div>

      {lastPrize && (
        <div className={`mb-4 p-3 rounded-xl text-center ${
          lastPrize.is_rare
            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30'
            : 'bg-green-50 dark:bg-green-900/20'
        }`}>
          <p className={`font-medium ${lastPrize.is_rare ? 'text-yellow-600' : 'text-green-600'}`}>
            {lastPrize.is_rare ? '恭喜获得稀有奖品！' : '恭喜获得：'}
            <span className="font-bold ml-1">{lastPrize.prize_name}</span>
          </p>
        </div>
      )}

      <button
        onClick={onDraw}
        disabled={drawing || !lotteryInfo?.can_draw}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
          !lotteryInfo?.can_draw
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30'
        }`}
      >
        {drawing ? (
          <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
        ) : !lotteryInfo?.can_draw ? (
          lotteryInfo?.balance < lotteryInfo?.cost_points ? '积分不足' : '今日次数已用完'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Gift className="w-5 h-5" />
            立即抽奖
          </span>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">
        10%概率获得稀有API Key兑换码
      </p>
    </div>
  )
}

// 竞猜卡片组件
function PredictionCard({ market }) {
  const totalPool = market.total_pool || 0

  return (
    <Link
      to={`/prediction/${market.id}`}
      className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
          {market.title}
        </h4>
        <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded text-xs font-medium ${
          market.status === 'OPEN'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
        }`}>
          {market.status === 'OPEN' ? '进行中' : market.status === 'CLOSED' ? '已截止' : '已结算'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Coins className="w-4 h-4" />
          {totalPool} 奖池
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {market.options?.length || 0} 选项
        </span>
      </div>

      <div className="space-y-2">
        {market.options?.slice(0, 3).map((opt) => (
          <div key={opt.id} className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {opt.label}
            </span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {opt.odds ? `${opt.odds.toFixed(2)}x` : '-'}
            </span>
          </div>
        ))}
      </div>

      {market.closes_at && (
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Clock className="w-3 h-3" />
          截止: {new Date(market.closes_at).toLocaleString('zh-CN')}
        </div>
      )}
    </Link>
  )
}

// 道具图标映射
const itemIcons = {
  'cheer': Heart,
  'coffee': Coffee,
  'energy': Zap,
  'pizza': Pizza,
  'star': Star,
}

// 道具名称映射
const itemNames = {
  'cheer': '爱心打气',
  'coffee': '咖啡打气',
  'energy': '能量打气',
  'pizza': '披萨打气',
  'star': '星星打气',
}

// 道具颜色映射
const itemColors = {
  'cheer': 'text-red-500 bg-red-50 dark:bg-red-900/30',
  'coffee': 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  'energy': 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
  'pizza': 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  'star': 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
}

// 背包弹窗组件
function BackpackModal({ items, loading, onClose }) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
              <Backpack className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">我的背包</h3>
              <p className="text-sm text-slate-500">共 {totalItems} 件道具</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-24" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">背包空空如也</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">去抽奖获得道具吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const Icon = itemIcons[item.item_type] || Gift
                const name = itemNames[item.item_type] || item.item_type
                const colorClass = itemColors[item.item_type] || 'text-slate-500 bg-slate-50 dark:bg-slate-800'

                return (
                  <div
                    key={item.item_type}
                    className={`p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${colorClass.split(' ').slice(1).join(' ')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{name}</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                          x{item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 使用说明 */}
          {items.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <span className="font-medium">使用方式：</span>前往选手详情页，点击"为TA打气"按钮使用道具
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主页面
export default function ActivityCenterPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const toast = useToast()

  // 独立的加载状态
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [signinLoading, setSigninLoading] = useState(true)
  const [lotteryLoading, setLotteryLoading] = useState(true)
  const [marketsLoading, setMarketsLoading] = useState(true)

  // 独立的错误状态
  const [balanceError, setBalanceError] = useState(null)
  const [signinError, setSigninError] = useState(null)
  const [lotteryError, setLotteryError] = useState(null)
  const [marketsError, setMarketsError] = useState(null)

  // 数据状态
  const [balance, setBalance] = useState(0)
  const [signinStatus, setSigninStatus] = useState(null)
  const [lotteryInfo, setLotteryInfo] = useState(null)
  const [openMarkets, setOpenMarkets] = useState([])

  // 操作状态
  const [signing, setSigning] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [lastPrize, setLastPrize] = useState(null)

  // 背包数据
  const [itemsLoading, setItemsLoading] = useState(true)
  const [items, setItems] = useState([])
  const [showBackpack, setShowBackpack] = useState(false)

  // 加载余额
  const loadBalance = useCallback(async () => {
    setBalanceLoading(true)
    setBalanceError(null)
    try {
      const data = await pointsApi.getBalance()
      setBalance(data.balance)
    } catch (error) {
      console.error('加载余额失败:', error)
      setBalanceError('加载失败')
      setBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // 加载签到状态
  const loadSignin = useCallback(async () => {
    setSigninLoading(true)
    setSigninError(null)
    try {
      const data = await pointsApi.getSigninStatus()
      setSigninStatus(data)
    } catch (error) {
      console.error('加载签到状态失败:', error)
      setSigninError('加载失败')
    } finally {
      setSigninLoading(false)
    }
  }, [])

  // 加载抽奖信息
  const loadLottery = useCallback(async () => {
    setLotteryLoading(true)
    setLotteryError(null)
    try {
      const data = await lotteryApi.getInfo()
      setLotteryInfo(data)
    } catch (error) {
      console.error('加载抽奖信息失败:', error)
      setLotteryError('加载失败')
    } finally {
      setLotteryLoading(false)
    }
  }, [])

  // 加载竞猜市场
  const loadMarkets = useCallback(async () => {
    setMarketsLoading(true)
    setMarketsError(null)
    try {
      const data = await predictionApi.getOpenMarkets()
      setOpenMarkets(data)
    } catch (error) {
      console.error('加载竞猜市场失败:', error)
      setMarketsError('加载失败')
      setOpenMarkets([])
    } finally {
      setMarketsLoading(false)
    }
  }, [])

  // 加载背包道具
  const loadItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const data = await lotteryApi.getItems()
      setItems(data)
    } catch (error) {
      console.error('加载背包失败:', error)
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    // 并行加载所有数据
    loadBalance()
    loadSignin()
    loadLottery()
    loadMarkets()
    loadItems()
  }, [token, navigate, loadBalance, loadSignin, loadLottery, loadMarkets, loadItems])

  const handleSignin = async () => {
    if (signing || signinStatus?.signed_today) return
    setSigning(true)
    try {
      const result = await pointsApi.signin()
      setBalance(result.balance)
      setSigninStatus((prev) => ({
        ...prev,
        signed_today: true,
        streak_days: result.streak_day,
        streak_display: result.streak_day,
        monthly_signins: [...(prev?.monthly_signins || []), result.signin_date],
      }))
      toast.success(
        result.is_milestone
          ? result.milestone_message
          : `获得 ${result.total_points} 积分`,
        { title: '签到成功', duration: 4000 }
      )
      trackSignin(result.streak_day)
    } catch (error) {
      toast.error(error.response?.data?.detail || '签到失败')
    } finally {
      setSigning(false)
    }
  }

  const handleDraw = async () => {
    if (drawing || !lotteryInfo?.can_draw) return
    setDrawing(true)
    setLastPrize(null)
    try {
      const result = await lotteryApi.draw()
      setLastPrize(result)
      setBalance(result.balance)
      setLotteryInfo((prev) => ({
        ...prev,
        today_count: (prev?.today_count || 0) + 1,
        balance: result.balance,
        can_draw: result.balance >= prev?.cost_points && (
          prev?.daily_limit === null || (prev?.today_count || 0) + 1 < prev?.daily_limit
        ),
      }))
      // 显示中奖提示
      if (result.is_rare) {
        toast.success(`恭喜获得稀有奖品：${result.prize_name}`, { title: '大奖来袭', duration: 5000 })
      } else if (result.prize_type !== 'EMPTY') {
        toast.success(`获得：${result.prize_name}`, { duration: 3000 })
      }
      trackLottery('normal', lotteryInfo?.cost_points || 20, result.prize_name)
      // 刷新背包
      loadItems()
    } catch (error) {
      toast.error(error.response?.data?.detail || '抽奖失败')
    } finally {
      setDrawing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">活动中心</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">签到、抽奖、竞猜，只因你太美</p>
            </div>
          </div>

          {/* 积分和背包 */}
          <div className="flex items-center gap-3">
            {/* 背包按钮 */}
            <button
              onClick={() => setShowBackpack(true)}
              className="relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl hover:shadow-md transition-all"
            >
              <Backpack className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">背包</span>
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* 积分显示 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl">
              <Coins className="w-5 h-5 text-yellow-600" />
              {balanceLoading ? (
                <Skeleton className="w-12 h-6" />
              ) : balanceError ? (
                <span className="text-sm text-red-500">--</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-yellow-600">{balance}</span>
                  <span className="text-sm text-yellow-600/80">积分</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 主要内容区 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 签到 */}
          {signinLoading ? (
            <SigninCalendarSkeleton />
          ) : signinError ? (
            <ErrorCard
              title="签到加载失败"
              message={signinError}
              onRetry={loadSignin}
            />
          ) : (
            <SigninCalendar
              signinStatus={signinStatus}
              onSignin={handleSignin}
              signing={signing}
            />
          )}

          {/* 抽奖 */}
          {lotteryLoading ? (
            <LotterySkeleton />
          ) : lotteryError ? (
            <ErrorCard
              title="抽奖加载失败"
              message={lotteryError}
              onRetry={loadLottery}
            />
          ) : (
            <LotteryWheel
              lotteryInfo={lotteryInfo}
              onDraw={handleDraw}
              drawing={drawing}
              lastPrize={lastPrize}
            />
          )}

          {/* 扭蛋机 */}
          <GachaMachine onBalanceUpdate={setBalance} />
        </div>

        {/* 刮刮乐区域 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 刮刮乐 */}
          <ScratchCard onBalanceUpdate={setBalance} />

          {/* 刮刮乐说明 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">刮刮乐玩法</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p>使用积分购买刮刮乐卡片</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p>用鼠标或手指刮开涂层，刮开 40% 自动揭晓</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p>有机会获得神秘兑换码、积分等奖励</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                <span className="font-medium">温馨提示：</span>神秘兑换码可在个人中心查看和使用
              </p>
            </div>
          </div>
        </div>

        {/* 老虎机区域 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 老虎机 */}
          <SlotMachine onBalanceUpdate={setBalance} />

          {/* 老虎机说明 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">老虎机玩法</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p>消耗积分拉动老虎机</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p>三个图案相同即为中奖</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p>不同图案组合有不同倍率奖励</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">中奖倍率：</span>7️⃣7️⃣7️⃣ 100倍 | 🍒🍒🍒 50倍 | 🔔🔔🔔 20倍 | 🍋🍋🍋 10倍
              </p>
            </div>
          </div>
        </div>

        {/* 积分兑换商城 */}
        <div className="mb-8">
          <ExchangeShop onBalanceUpdate={setBalance} />
        </div>

        {/* 竞猜区 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">热门竞猜</h3>
                <p className="text-sm text-slate-500">用积分下注，赢取更多奖励</p>
              </div>
            </div>
            <Link
              to="/prediction"
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {marketsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <Skeleton className="w-3/4 h-5 mb-3" />
                  <Skeleton className="w-1/2 h-4 mb-3" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-full h-4" />
                </div>
              ))}
            </div>
          ) : marketsError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{marketsError}</p>
              <button
                onClick={loadMarkets}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          ) : openMarkets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">暂无进行中的竞猜</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">敬请期待...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openMarkets.slice(0, 6).map((market) => (
                <PredictionCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Link
            to="/achievements"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            <Award className="w-8 h-8 text-purple-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">我的成就</p>
              <p className="text-xs text-slate-500">查看徽章</p>
            </div>
          </Link>
          <Link
            to="/ranking"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-yellow-300 dark:hover:border-yellow-700 transition-colors"
          >
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">排行榜</p>
              <p className="text-xs text-slate-500">查看人气榜</p>
            </div>
          </Link>
          <Link
            to="/participants"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
          >
            <Heart className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">为TA打气</p>
              <p className="text-xs text-slate-500">支持选手</p>
            </div>
          </Link>
          <Link
            to="/my-bets"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">我的竞猜</p>
              <p className="text-xs text-slate-500">查看下注</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 背包弹窗 */}
      {showBackpack && (
        <BackpackModal
          items={items}
          loading={itemsLoading}
          onClose={() => setShowBackpack(false)}
        />
      )}
    </div>
  )
}
