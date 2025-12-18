import { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Coins, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { pointsApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'

// 老虎机符号配置
const SYMBOLS = [
  { id: 'seven', emoji: '7️⃣', name: '幸运7', multiplier: 100 },
  { id: 'cherry', emoji: '🍒', name: '樱桃', multiplier: 50 },
  { id: 'bell', emoji: '🔔', name: '铃铛', multiplier: 20 },
  { id: 'lemon', emoji: '🍋', name: '柠檬', multiplier: 10 },
  { id: 'grape', emoji: '🍇', name: '葡萄', multiplier: 5 },
  { id: 'watermelon', emoji: '🍉', name: '西瓜', multiplier: 3 },
  { id: 'star', emoji: '⭐', name: '星星', multiplier: 2 },
  { id: 'bar', emoji: '🎰', name: 'BAR', multiplier: 1 },
]

const COST_POINTS = 30 // 每次消耗积分

// 单个滚轴组件
function Reel({ spinning, targetIndex, delay }) {
  const [displayIndex, setDisplayIndex] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (spinning) {
      // 开始滚动
      let index = 0
      intervalRef.current = setInterval(() => {
        index = (index + 1) % SYMBOLS.length
        setDisplayIndex(index)
      }, 80)

      // 延迟后停止到目标位置
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current)
        setDisplayIndex(targetIndex)
      }, 1500 + delay)
    }

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [spinning, targetIndex, delay])

  const symbol = SYMBOLS[displayIndex]

  return (
    <div className="relative w-20 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-inner">
      {/* 上方阴影 */}
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/60 to-transparent z-10" />
      {/* 下方阴影 */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent z-10" />

      {/* 符号显示 */}
      <div className="flex items-center justify-center h-full text-5xl">
        {symbol?.emoji}
      </div>

      {/* 滚动时的模糊效果 */}
      {spinning && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-pulse" />
      )}
    </div>
  )
}

// 主组件
export default function SlotMachine({ onBalanceUpdate }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [results, setResults] = useState([0, 0, 0])
  const [lastWin, setLastWin] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef(null)

  // 加载余额
  const loadBalance = useCallback(async () => {
    try {
      const data = await pointsApi.getBalance()
      setBalance(data.balance)
    } catch (error) {
      console.error('加载余额失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  // 播放音效
  const playSound = useCallback((type) => {
    if (!soundEnabled) return

    try {
      // 使用 Web Audio API 生成简单音效
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      if (type === 'spin') {
        oscillator.frequency.value = 200
        gainNode.gain.value = 0.1
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.1)
      } else if (type === 'win') {
        oscillator.frequency.value = 523 // C5
        gainNode.gain.value = 0.2
        oscillator.start()
        setTimeout(() => {
          oscillator.frequency.value = 659 // E5
        }, 100)
        setTimeout(() => {
          oscillator.frequency.value = 784 // G5
        }, 200)
        oscillator.stop(audioContext.currentTime + 0.4)
      } else if (type === 'jackpot') {
        oscillator.frequency.value = 523
        gainNode.gain.value = 0.3
        oscillator.start()
        setTimeout(() => oscillator.frequency.value = 659, 100)
        setTimeout(() => oscillator.frequency.value = 784, 200)
        setTimeout(() => oscillator.frequency.value = 1047, 300)
        oscillator.stop(audioContext.currentTime + 0.6)
      } else if (type === 'lose') {
        oscillator.frequency.value = 200
        gainNode.gain.value = 0.1
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
      }
    } catch (e) {
      // 音频播放失败时静默处理
    }
  }, [soundEnabled])

  // 计算中奖
  const calculateWin = useCallback((indices) => {
    const symbols = indices.map(i => SYMBOLS[i])

    // 三个相同
    if (symbols[0].id === symbols[1].id && symbols[1].id === symbols[2].id) {
      return {
        win: true,
        multiplier: symbols[0].multiplier,
        points: COST_POINTS * symbols[0].multiplier,
        message: `${symbols[0].emoji}${symbols[1].emoji}${symbols[2].emoji} 三连！${symbols[0].multiplier}倍奖励！`,
        isJackpot: symbols[0].id === 'seven',
      }
    }

    // 两个相同
    if (symbols[0].id === symbols[1].id || symbols[1].id === symbols[2].id || symbols[0].id === symbols[2].id) {
      return {
        win: true,
        multiplier: 1.5,
        points: Math.floor(COST_POINTS * 1.5),
        message: '两个相同！1.5倍奖励！',
        isJackpot: false,
      }
    }

    return {
      win: false,
      multiplier: 0,
      points: 0,
      message: '再接再厉！',
      isJackpot: false,
    }
  }, [])

  // 生成随机结果（带权重）
  const generateResult = useCallback(() => {
    const weights = SYMBOLS.map((_, i) => Math.max(1, 10 - i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) return i
    }
    return weights.length - 1
  }, [])

  // 拉老虎机
  const handleSpin = useCallback(async () => {
    if (spinning || balance < COST_POINTS) return

    // 生成结果
    const newResults = [generateResult(), generateResult(), generateResult()]

    // 先扣除积分
    const newBalance = balance - COST_POINTS
    setBalance(newBalance)
    onBalanceUpdate?.(newBalance)

    // 开始转动
    setSpinning(true)
    setLastWin(null)
    setResults(newResults)
    playSound('spin')

    // 等待所有滚轴停止（最后一个滚轴延迟最长）
    const totalDuration = 1500 + 600 + 300 // 基础时间 + 第三个滚轴延迟 + 缓冲

    setTimeout(() => {
      setSpinning(false)

      // 计算中奖结果
      const winResult = calculateWin(newResults)
      setLastWin(winResult)

      if (winResult.win) {
        // 中奖了，增加积分
        const finalBalance = newBalance + winResult.points
        setBalance(finalBalance)
        onBalanceUpdate?.(finalBalance)

        if (winResult.isJackpot) {
          playSound('jackpot')
          toast.success(winResult.message, { title: '大奖！', duration: 5000 })
        } else {
          playSound('win')
          toast.success(`获得 ${winResult.points} 积分`, { duration: 3000 })
        }
      } else {
        playSound('lose')
      }
      trackLottery('slot', COST_POINTS, winResult.win ? `${winResult.points}积分` : '未中奖')
    }, totalDuration)
  }, [spinning, balance, generateResult, calculateWin, onBalanceUpdate, playSound, toast])

  const canSpin = !spinning && balance >= COST_POINTS

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border border-yellow-500/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl animate-pulse" />
          <div>
            <div className="w-24 h-5 bg-yellow-500/20 rounded animate-pulse mb-1" />
            <div className="w-16 h-4 bg-yellow-500/20 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-20 h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="w-full h-12 bg-yellow-500/20 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900 via-red-900 to-pink-900 rounded-2xl border-2 border-yellow-500 p-6 shadow-2xl relative overflow-hidden">
      {/* 装饰灯光 */}
      <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              spinning
                ? i % 2 === 0
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-500 animate-pulse'
                : 'bg-yellow-600'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">幸运老虎机</h3>
            <p className="text-sm text-yellow-300">{COST_POINTS}积分/次</p>
          </div>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={soundEnabled ? '关闭音效' : '开启音效'}
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-yellow-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {/* 老虎机主体 */}
      <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl p-4 mb-4 border-4 border-yellow-600 shadow-inner">
        {/* 滚轴区域 */}
        <div className="flex justify-center gap-3 mb-4">
          <Reel spinning={spinning} targetIndex={results[0]} delay={0} />
          <Reel spinning={spinning} targetIndex={results[1]} delay={300} />
          <Reel spinning={spinning} targetIndex={results[2]} delay={600} />
        </div>

        {/* 中奖线 */}
        <div className="relative h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full" />
      </div>

      {/* 中奖提示 */}
      {lastWin && (
        <div
          className={`mb-4 p-3 rounded-xl text-center transition-all ${
            lastWin.win
              ? lastWin.isJackpot
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : 'bg-green-500/80'
              : 'bg-slate-700/80'
          }`}
        >
          <p className={`font-bold ${lastWin.win ? 'text-white' : 'text-slate-300'}`}>
            {lastWin.message}
          </p>
          {lastWin.win && (
            <p className="text-sm text-white/80 mt-1">
              获得 <span className="font-bold text-yellow-300">{lastWin.points}</span> 积分
            </p>
          )}
        </div>
      )}

      {/* 余额显示 */}
      <div className="flex items-center justify-center gap-2 mb-4 py-2 bg-black/30 rounded-lg">
        <Coins className="w-5 h-5 text-yellow-400" />
        <span className="text-xl font-bold text-yellow-400">{balance}</span>
        <span className="text-sm text-yellow-300/80">积分</span>
      </div>

      {/* 拉杆按钮 */}
      <button
        onClick={handleSpin}
        disabled={!canSpin}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden ${
          !canSpin
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {spinning ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            转动中...
          </span>
        ) : balance < COST_POINTS ? (
          '积分不足'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            拉动拉杆
          </span>
        )}

        {/* 按钮光效 */}
        {canSpin && !spinning && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        )}
      </button>

      {/* 奖励说明 */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        {SYMBOLS.slice(0, 4).map((symbol) => (
          <div key={symbol.id} className="p-2 bg-black/30 rounded-lg">
            <div className="text-2xl mb-1">{symbol.emoji}</div>
            <div className="text-yellow-400 font-bold">{symbol.multiplier}x</div>
          </div>
        ))}
      </div>

      {/* 底部装饰灯光 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              spinning
                ? i % 2 === 1
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-500 animate-pulse'
                : 'bg-yellow-600'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* 添加 shimmer 动画样式 */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
