/**
 * 彩蛋兑换弹窗组件
 * 隐藏的彩蛋入口，用户连续点击特定位置触发
 */
import { useState } from 'react'
import { X, Gift, Sparkles, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

/**
 * 获取奖励描述
 */
function getRewardDescription(reward) {
  if (!reward) return '神秘奖励'

  const { type, value } = reward

  switch (type) {
    case 'points':
      return `${value?.amount || 0} 积分`
    case 'item':
      const itemNames = {
        cheer: '爱心打气',
        coffee: '咖啡',
        energy: '能量',
        pizza: '披萨',
        star: '星星'
      }
      const itemName = itemNames[value?.item_type] || value?.item_type
      return `${value?.amount || 1}个 ${itemName}`
    case 'badge':
      return `「${value?.badge_name || '神秘徽章'}」徽章`
    case 'api_key':
      return 'API Key 兑换码'
    default:
      return '神秘奖励'
  }
}

export default function EasterEggModal({ isOpen, onClose }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { success, reward, hint, error }
  const token = useAuthStore((s) => s.token)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!code.trim()) return

    if (!token) {
      setResult({
        success: false,
        error: '请先登录后再兑换彩蛋码'
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await api.post('/easter-egg/redeem', {
        code: code.trim()
      })

      setResult({
        success: true,
        reward: response.reward,
        hint: response.hint
      })
      setCode('')
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        '兑换失败，请稍后重试'
      setResult({
        success: false,
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-purple-500/30">
        {/* 装饰性粒子效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 头部 */}
        <div className="relative px-6 pt-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg shadow-orange-500/30">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            发现彩蛋
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </h2>
          <p className="text-purple-200 text-sm">
            恭喜你发现了隐藏的彩蛋入口！
          </p>
        </div>

        {/* 表单 */}
        <div className="relative px-6 pb-8">
          {!result?.success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="输入神秘兑换码..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-center text-lg tracking-wider font-mono"
                  maxLength={64}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {result?.error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm text-center">
                  {result.error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    兑换中...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    兑换彩蛋
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 成功状态 */
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-lg shadow-green-500/30 animate-bounce">
                <Sparkles className="w-10 h-10 text-white" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  兑换成功！
                </h3>
                <p className="text-green-300 text-lg font-medium">
                  获得：{getRewardDescription(result.reward)}
                </p>
                {result.hint && (
                  <p className="text-purple-200 text-sm mt-2">
                    {result.hint}
                  </p>
                )}
              </div>

              <button
                onClick={handleClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                太棒了！
              </button>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="relative px-6 pb-6 text-center">
          <p className="text-purple-300/60 text-xs">
            彩蛋码先到先得，每个码只能使用一次
          </p>
        </div>
      </div>
    </div>
  )
}
