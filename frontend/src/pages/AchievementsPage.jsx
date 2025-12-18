import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  Heart,
  Coffee,
  Zap,
  Pizza,
  Star,
  Gift,
  MessageCircle,
  Flame,
  Compass,
  Rocket,
  Trophy,
  Check,
  Lock,
  Sparkles,
  RefreshCw,
  Egg,
  Search,
  Gem,
  Crown,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { achievementApi } from '../services'

// 成就图标映射
const BADGE_ICONS = {
  heart: Heart,
  coffee: Coffee,
  energy: Zap,
  pizza: Pizza,
  star: Star,
  gift: Gift,
  message: MessageCircle,
  fire: Flame,
  compass: Compass,
  rocket: Rocket,
  // 彩蛋徽章图标
  egg: Egg,
  search: Search,
  gem: Gem,
  crown: Crown,
}

// 稀有度颜色
const TIER_COLORS = {
  bronze: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  silver: {
    bg: 'bg-slate-100 dark:bg-slate-700/50',
    border: 'border-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
    glow: 'shadow-slate-400/20',
  },
  gold: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-yellow-500/30',
  },
  platinum: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/30',
  },
  diamond: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    border: 'border-cyan-400',
    text: 'text-cyan-600 dark:text-cyan-400',
    glow: 'shadow-cyan-500/40',
  },
}

// 分类名称
const CATEGORY_NAMES = {
  cheers: '打气成就',
  social: '社交成就',
  retention: '坚持成就',
  explorer: '探索成就',
  easter_egg: '彩蛋徽章',
}

// 分类图标
const CATEGORY_ICONS = {
  cheers: Heart,
  social: MessageCircle,
  retention: Flame,
  explorer: Compass,
  easter_egg: Egg,
}

function AchievementCard({ achievement, onClaim }) {
  const [claiming, setClaiming] = useState(false)
  const IconComponent = BADGE_ICONS[achievement.badge_icon] || Award
  const tierColors = TIER_COLORS[achievement.badge_tier] || TIER_COLORS.bronze
  const isUnlocked = achievement.status === 'unlocked' || achievement.status === 'claimed'
  const canClaim = achievement.status === 'unlocked'

  const handleClaim = async () => {
    if (!canClaim || claiming) return
    setClaiming(true)
    try {
      await onClaim(achievement.achievement_key)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all ${
        isUnlocked
          ? `${tierColors.bg} ${tierColors.border} shadow-lg ${tierColors.glow}`
          : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
      }`}
    >
      {/* 已领取标记 */}
      {achievement.status === 'claimed' && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
          <Check className="w-3 h-3" />
        </div>
      )}

      {/* 可领取标记 */}
      {canClaim && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1 animate-pulse">
          <Sparkles className="w-3 h-3" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div
          className={`p-3 rounded-xl ${
            isUnlocked ? tierColors.bg : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          {isUnlocked ? (
            <IconComponent className={`w-6 h-6 ${tierColors.text}`} />
          ) : (
            <Lock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            {achievement.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {achievement.description}
          </p>

          {/* 进度条 */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">
                {achievement.progress_value} / {achievement.target_value}
              </span>
              <span className={tierColors.text}>+{achievement.points}分</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isUnlocked ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-slate-400'
                }`}
                style={{ width: `${achievement.progress_percent}%` }}
              />
            </div>
          </div>

          {/* 领取按钮 */}
          {canClaim && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="mt-3 w-full py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {claiming ? '领取中...' : '领取奖励'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsCard({ stats }) {
  if (!stats) return null

  const statItems = [
    { label: '总打气次数', value: stats.total_cheers_given ?? 0, icon: Heart, color: 'text-red-500' },
    { label: '累计积分', value: stats.total_points ?? 0, icon: Trophy, color: 'text-yellow-500' },
    { label: '解锁成就', value: stats.achievements_unlocked ?? 0, icon: Award, color: 'text-purple-500' },
    { label: '最长连续', value: `${stats.max_consecutive_days ?? 0}天`, icon: Flame, color: 'text-orange-500' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 mb-2">
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-sm text-slate-500">{item.label}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function AchievementsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState(null)
  const [byCategory, setByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token, navigate])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [achData, statsData] = await Promise.all([
        achievementApi.getMyAchievements(),
        achievementApi.getMyStats(),
      ])
      setAchievements(achData.items || [])
      setByCategory(achData.by_category || {})
      setStats(statsData)
    } catch (err) {
      console.error('加载成就数据失败:', err)
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (key) => {
    try {
      await achievementApi.claimAchievement(key)
      await loadData() // 刷新数据
    } catch (error) {
      console.error('领取成就失败:', error)
      alert(error.response?.data?.detail || '领取失败')
    }
  }

  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : byCategory[activeCategory] || []

  const unlockedCount = achievements.filter(a => a.status === 'unlocked' || a.status === 'claimed').length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex flex-col items-center justify-center">
        <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">我的成就</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                已解锁 {unlockedCount} / {achievements.length} 个成就
              </p>
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
        <StatsCard stats={stats} />

        {/* 分类筛选 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            全部
          </button>
          {Object.entries(CATEGORY_NAMES).map(([key, name]) => {
            const Icon = CATEGORY_ICONS[key]
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === key
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {name}
              </button>
            )
          })}
        </div>

        {/* 成就列表 */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.achievement_key}
              achievement={achievement}
              onClaim={handleClaim}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">暂无成就</p>
          </div>
        )}
      </div>
    </div>
  )
}
