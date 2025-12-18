/**
 * 扭蛋机组件
 * 消耗积分随机获得彩蛋码
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Gift, Coins, Sparkles, Loader2, Star, Heart, Coffee, Zap, Pizza, Award, Key, Copy, Check } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'

// ============== 音效模块 ==============
const AudioContext = window.AudioContext || window.webkitAudioContext

/**
 * 播放扭蛋摇晃音效
 */
function playShakeSound() {
  try {
    const ctx = new AudioContext()
    const duration = 0.08

    // 创建多个音调模拟球碰撞声
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = 300 + Math.random() * 200
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + duration)
      }, i * 100)
    }
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

/**
 * 播放扭蛋掉落音效
 */
function playDropSound() {
  try {
    const ctx = new AudioContext()

    // 下降音调
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    // 落地弹跳声
    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc2.frequency.value = 150
      osc2.type = 'sine'

      gain2.gain.setValueAtTime(0.2, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      osc2.start(ctx.currentTime)
      osc2.stop(ctx.currentTime + 0.1)
    }, 300)
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

/**
 * 播放中奖音效
 */
function playWinSound() {
  try {
    const ctx = new AudioContext()

    // 上升音阶 - 欢快的中奖音效
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = freq
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      }, i * 100)
    })

    // 最后一个音符加长并添加和弦
    setTimeout(() => {
      ;[1047, 1319, 1568].forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.value = freq
        osc.type = 'sine'

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      })
    }, 400)
  } catch (e) {
    console.warn('音效播放失败:', e)
  }
}

// 扭蛋颜色配置
const GACHA_COLORS = [
  'from-pink-400 to-rose-500',
  'from-purple-400 to-indigo-500',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-500',
  'from-yellow-400 to-orange-500',
  'from-red-400 to-pink-500',
]

// 奖励类型图标映射
const rewardIcons = {
  points: Coins,
  item: Gift,
  badge: Award,
  api_key: Key,
}

// 道具图标映射
const itemIcons = {
  cheer: Heart,
  coffee: Coffee,
  energy: Zap,
  pizza: Pizza,
  star: Star,
}

/**
 * 获取奖励描述
 */
function getRewardDescription(reward) {
  if (!reward) return '神秘奖励'

  const { type, value } = reward

  switch (type) {
    case 'points':
      return `${value?.amount || 0} 积分`
    case 'item': {
      const itemNames = {
        cheer: '爱心打气',
        coffee: '咖啡',
        energy: '能量',
        pizza: '披萨',
        star: '星星',
      }
      const itemName = itemNames[value?.item_type] || value?.item_type
      return `${value?.amount || 1}个 ${itemName}`
    }
    case 'badge':
      return `「${value?.badge_name || '神秘徽章'}」徽章`
    case 'api_key':
      return 'API Key 兑换码'
    default:
      return '神秘奖励'
  }
}

/**
 * 单个扭蛋球组件
 */
function GachaBall({ colorClass, delay = 0, isSpinning = false }) {
  return (
    <div
      className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} shadow-lg transition-all duration-300 ${
        isSpinning ? 'animate-bounce' : ''
      }`}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 -2px 5px rgba(0,0,0,0.1), inset 0 2px 5px rgba(255,255,255,0.3)',
      }}
    >
      {/* 高光效果 */}
      <div className="absolute top-1 left-1.5 w-2 h-2 bg-white/40 rounded-full" />
    </div>
  )
}

/**
 * 扭蛋机主组件
 */
export default function GachaMachine({ onBalanceUpdate }) {
  const toast = useToast()
  const machineRef = useRef(null)
  const mountedRef = useRef(true)

  // 状态
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [ballsSpinning, setBallsSpinning] = useState(false)
  const [copied, setCopied] = useState(false)

  // 加载扭蛋机状态
  const loadStatus = async () => {
    try {
      const data = await api.get('/easter-egg/gacha/status')
      if (mountedRef.current) {
        setStatus(data)
      }
    } catch (error) {
      console.error('加载扭蛋机状态失败:', error)
      if (mountedRef.current) {
        toast.error('加载扭蛋机状态失败')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadStatus()
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 执行抽奖
  const handlePlay = async () => {
    if (playing || !status?.can_play) return

    setPlaying(true)
    setResult(null)
    setShowResult(false)

    // 开始动画
    setIsShaking(true)
    setBallsSpinning(true)

    // 播放摇晃音效（循环播放）
    playShakeSound()
    const shakeInterval = setInterval(() => {
      if (mountedRef.current) playShakeSound()
    }, 400)

    // 播放 2 秒动画
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 停止摇晃音效
    clearInterval(shakeInterval)

    // 组件已卸载，直接返回
    if (!mountedRef.current) return

    try {
      const data = await api.post('/easter-egg/gacha/play')

      if (!mountedRef.current) return

      setResult(data)

      // 更新状态
      setStatus((prev) => ({
        ...prev,
        available_codes: prev.available_codes - 1,
        user_balance: data.remaining_balance,
        can_play: data.remaining_balance >= prev.cost && prev.available_codes - 1 > 0,
      }))

      // 通知父组件更新余额
      if (onBalanceUpdate) {
        onBalanceUpdate(data.remaining_balance)
      }

      // 以服务端为准刷新一次，避免并发/多端导致的本地状态漂移
      loadStatus()

      // 停止摇晃，显示结果
      setIsShaking(false)
      setBallsSpinning(false)

      // 播放掉落音效
      playDropSound()

      // 延迟显示结果，配合掉落音效
      setTimeout(() => {
        if (mountedRef.current) {
          setShowResult(true)
          // 播放中奖音效
          playWinSound()
        }
      }, 400)

      // 显示成功提示
      toast.success(`恭喜获得：${getRewardDescription(data.reward)}`, {
        title: '扭蛋成功',
        duration: 5000,
      })

      // 统计事件
      trackLottery('gacha', status?.cost || 50, getRewardDescription(data.reward))
    } catch (error) {
      if (!mountedRef.current) return

      setIsShaking(false)
      setBallsSpinning(false)

      // 区分网络错误和服务器错误
      const message =
        error?.response?.data?.detail ||
        (error?.response ? '抽奖失败' : '网络错误，请稍后重试')
      toast.error(message)

      // 余额不足/已被抢完/并发冲突时刷新状态，避免按钮状态不一致
      if ([400, 404, 409].includes(error?.response?.status)) {
        loadStatus()
      }
    } finally {
      if (mountedRef.current) {
        setPlaying(false)
      }
    }
  }

  // 关闭结果弹窗
  const handleCloseResult = () => {
    setShowResult(false)
    setResult(null)
    setCopied(false)
  }

  // 复制彩蛋码
  const handleCopyCode = async () => {
    if (!result?.code) return
    try {
      await navigator.clipboard.writeText(result.code)
      setCopied(true)
      toast.success('彩蛋码已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      toast.error('复制失败，请手动复制')
    }
  }

  // 再抽一次
  const handlePlayAgain = () => {
    setShowResult(false)
    setResult(null)
    handlePlay()
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
      {/* 标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘扭蛋机</h3>
            <p className="text-sm text-slate-500">{status?.cost || 50}积分/次</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">剩余</div>
          <div className="font-bold text-purple-600 dark:text-purple-400">
            {status?.available_codes || 0} 个
          </div>
        </div>
      </div>

      {/* 扭蛋机主体 */}
      <div className="relative flex justify-center mb-6">
        <div
          ref={machineRef}
          className={`relative w-48 h-56 transition-transform ${
            isShaking ? 'animate-[shake_0.1s_ease-in-out_infinite]' : ''
          }`}
        >
          {/* 机器顶部 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-t-3xl shadow-lg">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-red-400 rounded-full" />
          </div>

          {/* 透明玻璃罩 */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-40 h-32 bg-gradient-to-b from-sky-100/80 to-sky-50/60 dark:from-slate-700/80 dark:to-slate-600/60 rounded-[40%] border-4 border-red-400 overflow-hidden">
            {/* 扭蛋球 */}
            <div className="absolute inset-0 flex flex-wrap justify-center items-end p-2 gap-1">
              {GACHA_COLORS.map((color, idx) => (
                <div
                  key={idx}
                  className="relative"
                  style={{
                    left: `${(idx % 3) * 12 - 12}px`,
                    bottom: `${Math.floor(idx / 3) * 10}px`,
                  }}
                >
                  <GachaBall colorClass={color} delay={idx * 100} isSpinning={ballsSpinning} />
                </div>
              ))}
            </div>
            {/* 玻璃高光 */}
            <div className="absolute top-2 left-3 w-8 h-16 bg-white/20 rounded-full transform -rotate-12" />
          </div>

          {/* 出口部分 */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-16 bg-gradient-to-b from-red-600 to-red-700 rounded-b-xl shadow-lg">
            {/* 出口洞 */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-10 bg-slate-900 rounded-b-2xl">
              <div className="absolute inset-1 bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-xl" />
            </div>
          </div>

          {/* 底座 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-12 bg-gradient-to-b from-red-700 to-red-800 rounded-xl shadow-lg">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-36 h-2 bg-red-600 rounded-full" />
          </div>

          {/* 摇杆 */}
          <div className="absolute right-0 top-24 w-6 h-16">
            <div className="w-3 h-12 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full mx-auto" />
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full shadow-lg -mt-1 flex items-center justify-center">
              <div className="w-2 h-2 bg-yellow-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            余额：{status?.user_balance || 0}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Gift className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            消耗：{status?.cost || 50}
          </span>
        </div>
      </div>

      {/* 抽奖按钮 */}
      <button
        onClick={handlePlay}
        disabled={playing || !status?.can_play}
        className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all ${
          !status?.can_play
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0'
        }`}
      >
        {playing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            扭蛋中...
          </span>
        ) : !status?.can_play ? (
          status?.user_balance < status?.cost ? (
            '积分不足'
          ) : status?.available_codes === 0 ? (
            '彩蛋已抽完'
          ) : (
            '暂不可用'
          )
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            开始扭蛋
          </span>
        )}
      </button>

      {/* 提示 */}
      <p className="text-center text-xs text-slate-400 mt-3">
        每次扭蛋随机获得一个彩蛋码，请到彩蛋入口兑换领取奖励
      </p>

      {/* 结果弹窗 */}
      {showResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseResult} />
          <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-purple-500/30 animate-[scaleIn_0.3s_ease-out]">
            {/* 装饰粒子 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative p-6 text-center">
              {/* 扭蛋球动画 */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-2xl animate-pulse">
                  <div className="absolute top-3 left-4 w-6 h-6 bg-white/30 rounded-full" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">获得彩蛋码！</h3>

              {/* 奖励预览 */}
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-purple-200 text-xs mb-1">奖励预览</p>
                <div className="text-yellow-300 text-lg font-bold">
                  {getRewardDescription(result.reward)}
                </div>
              </div>

              {/* 彩蛋码 */}
              <div className="bg-black/30 rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-purple-300 mb-1">你的彩蛋码</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-mono text-lg text-white tracking-wider">{result.code}</p>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    title="复制彩蛋码"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-purple-300 mt-2">
                  请复制此码，到页面底部的彩蛋入口兑换领取奖励
                </p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseResult}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  好的
                </button>
                {status?.can_play && status?.user_balance >= status?.cost && status?.available_codes > 0 && (
                  <button
                    onClick={handlePlayAgain}
                    className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
                  >
                    再来一次
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-1deg); }
          75% { transform: translateX(3px) rotate(1deg); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
