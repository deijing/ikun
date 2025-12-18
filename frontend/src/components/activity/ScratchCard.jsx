/**
 * 刮刮乐组件
 * 使用 Canvas 实现刮刮乐效果
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Ticket, Sparkles, Gift, RefreshCw, Coins, Star, AlertCircle } from 'lucide-react'
import { lotteryApi } from '../../services'
import { useToast } from '../Toast'
import { trackLottery } from '../../utils/analytics'

// 骨架屏
function ScratchCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-pulse w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div>
            <div className="animate-pulse w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
            <div className="animate-pulse w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="animate-pulse w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="animate-pulse w-full h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="animate-pulse w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  )
}

// 刮刮乐卡片 Canvas
function ScratchCanvas({ cardId, onReveal, revealed, prize }) {
  const canvasRef = useRef(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchPercent, setScratchPercent] = useState(0)
  const [autoRevealed, setAutoRevealed] = useState(false)

  // 使用 ref 防止重复触发 reveal
  const revealedRef = useRef(false)
  const lastCalcTime = useRef(0)
  const rafRef = useRef(null)

  // 初始化 canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || revealed || autoRevealed) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // 绘制刮刮乐涂层
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#f59e0b')
    gradient.addColorStop(0.5, '#f97316')
    gradient.addColorStop(1, '#ef4444')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 添加文字
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('刮一刮', rect.width / 2, rect.height / 2 - 10)
    ctx.font = '12px sans-serif'
    ctx.fillText('试试手气', rect.width / 2, rect.height / 2 + 10)

    // 添加装饰
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * rect.width
      const y = Math.random() * rect.height
      const size = Math.random() * 8 + 2
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // 重置状态
    revealedRef.current = false
  }, [revealed, autoRevealed])

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // 计算刮开百分比（采样优化）
  const calculateScratchPercent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return 0

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparentPixels = 0
    const totalPixels = pixels.length / 4
    const step = 4 // 减小采样步长，提高精度

    for (let i = 3; i < pixels.length; i += 4 * step) {
      if (pixels[i] < 128) { // alpha < 128 视为透明
        transparentPixels++
      }
    }

    const percent = (transparentPixels / (totalPixels / step)) * 100
    return percent
  }, [])

  // 刮开效果
  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas || revealedRef.current) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(
      (x - rect.left) * scaleX / 2,
      (y - rect.top) * scaleY / 2,
      20,
      0,
      Math.PI * 2
    )
    ctx.fill()

    // 节流计算百分比（每 50ms 计算一次）
    const now = Date.now()
    if (now - lastCalcTime.current > 50) {
      lastCalcTime.current = now

      const percent = calculateScratchPercent()
      setScratchPercent(percent)

      // 刮开超过 40% 自动揭晓（使用 ref 防止重复触发）
      if (percent > 40 && !revealedRef.current) {
        revealedRef.current = true
        setAutoRevealed(true)
        onReveal()
      }
    }
  }, [calculateScratchPercent, onReveal])

  // 强制检查并揭晓
  const forceCheckAndReveal = useCallback(() => {
    if (revealedRef.current) return

    const percent = calculateScratchPercent()
    setScratchPercent(percent)

    // 降低到 40%
    if (percent > 40 && !revealedRef.current) {
      revealedRef.current = true
      setAutoRevealed(true)
      onReveal()
    }
  }, [calculateScratchPercent, onReveal])

  // 鼠标/触摸事件
  const handleStart = (e) => {
    if (revealed || autoRevealed || revealedRef.current) return
    setIsScratching(true)
    const point = e.touches ? e.touches[0] : e
    scratch(point.clientX, point.clientY)
  }

  const handleMove = (e) => {
    if (!isScratching || revealed || autoRevealed || revealedRef.current) return
    e.preventDefault()
    const point = e.touches ? e.touches[0] : e
    scratch(point.clientX, point.clientY)
  }

  const handleEnd = () => {
    setIsScratching(false)
    // 松开时强制检查一次是否达到揭晓条件
    if (!revealedRef.current) {
      forceCheckAndReveal()
    }
  }

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
      {/* 底层奖品显示 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {revealed || autoRevealed ? (
          prize ? (
            <>
              <Gift className={`w-10 h-10 mb-2 ${prize.is_rare ? 'text-yellow-500' : 'text-purple-500'}`} />
              <p className={`font-bold text-lg ${prize.is_rare ? 'text-yellow-600' : 'text-purple-600'}`}>
                {prize.prize_name}
              </p>
              {prize.is_rare && (
                <div className="flex items-center gap-1 mt-1 text-yellow-500">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">稀有奖品</span>
                </div>
              )}
            </>
          ) : (
            <>
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-2" />
              <p className="text-slate-500">揭晓中...</p>
            </>
          )
        ) : (
          <div className="text-center text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">刮开查看奖品</p>
          </div>
        )}
      </div>

      {/* 刮刮乐涂层 */}
      {!revealed && !autoRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      )}

      {/* 进度提示 */}
      {!revealed && !autoRevealed && scratchPercent > 0 && scratchPercent < 40 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
          {Math.round(scratchPercent)}% - 继续刮
        </div>
      )}
    </div>
  )
}

// 主组件
export default function ScratchCard({ onBalanceUpdate }) {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scratchInfo, setScratchInfo] = useState(null)
  const [buying, setBuying] = useState(false)
  const [currentCard, setCurrentCard] = useState(null)
  const [prize, setPrize] = useState(null)

  // 加载刮刮乐信息
  const loadScratchInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await lotteryApi.getScratchInfo()
      setScratchInfo(data)
    } catch (err) {
      console.error('加载刮刮乐信息失败:', err)
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadScratchInfo()
  }, [loadScratchInfo])

  // 购买刮刮乐
  const handleBuy = async () => {
    if (buying || !scratchInfo?.can_draw) return
    setBuying(true)
    setPrize(null)
    try {
      const result = await lotteryApi.buyScratchCard()
      setCurrentCard({ id: result.card_id, revealed: false })
      setScratchInfo((prev) => ({
        ...prev,
        today_count: (prev?.today_count || 0) + 1,
        balance: result.remaining_balance,
        can_draw: result.remaining_balance >= prev?.cost_points && (
          prev?.daily_limit === null || (prev?.today_count || 0) + 1 < prev?.daily_limit
        ),
      }))
      onBalanceUpdate?.(result.remaining_balance)
      toast.success('刮刮乐已购买，快来刮一刮！')
    } catch (err) {
      toast.error(err.response?.data?.detail || '购买失败')
    } finally {
      setBuying(false)
    }
  }

  // 揭晓奖品
  const handleReveal = async () => {
    if (!currentCard || currentCard.revealed) return
    try {
      const result = await lotteryApi.revealScratchCard(currentCard.id)
      setPrize(result)
      setCurrentCard((prev) => ({ ...prev, revealed: true }))

      if (result.is_rare) {
        toast.success(`恭喜获得稀有奖品：${result.prize_name}`, {
          title: '大奖来袭',
          duration: 5000,
        })
      } else if (result.prize_type !== 'EMPTY') {
        toast.success(`获得：${result.prize_name}`)
      }
      trackLottery('scratch', status?.cost || 30, result.prize_name)
    } catch (err) {
      toast.error(err.response?.data?.detail || '揭晓失败')
    }
  }

  // 重新开始
  const handleReset = () => {
    setCurrentCard(null)
    setPrize(null)
  }

  if (loading) {
    return <ScratchCardSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="font-medium text-slate-900 dark:text-white mb-1">刮刮乐加载失败</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadScratchInfo}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!scratchInfo?.active) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘刮刮乐</h3>
            <p className="text-sm text-slate-500">刮出神秘兑换码</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Ticket className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">暂无进行中的刮刮乐活动</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">敬请期待...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">神秘刮刮乐</h3>
            <p className="text-sm text-slate-500">{scratchInfo?.cost_points || 30}积分/张</p>
          </div>
        </div>
        {scratchInfo?.daily_limit && (
          <div className="text-sm text-slate-500">
            今日: {scratchInfo?.today_count || 0}/{scratchInfo?.daily_limit}
          </div>
        )}
      </div>

      {/* 刮刮乐区域 */}
      {currentCard ? (
        <>
          <ScratchCanvas
            cardId={currentCard.id}
            onReveal={handleReveal}
            revealed={currentCard.revealed}
            prize={prize}
          />

          {/* 已揭晓后的操作 */}
          {currentCard.revealed && (
            <button
              onClick={handleReset}
              disabled={!scratchInfo?.can_draw}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-lg transition-all ${
                !scratchInfo?.can_draw
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30'
              }`}
            >
              {!scratchInfo?.can_draw ? (
                scratchInfo?.balance < scratchInfo?.cost_points ? '积分不足' : '今日次数已用完'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Ticket className="w-5 h-5" />
                  再来一张
                </span>
              )}
            </button>
          )}
        </>
      ) : (
        <>
          {/* 购买提示 */}
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex flex-col items-center justify-center">
            <Ticket className="w-12 h-12 text-orange-500 mb-2" />
            <p className="text-orange-600 dark:text-orange-400 font-medium">购买刮刮乐试试手气</p>
            <p className="text-sm text-orange-500/70 mt-1">有机会获得神秘兑换码</p>
          </div>

          {/* 购买按钮 */}
          <button
            onClick={handleBuy}
            disabled={buying || !scratchInfo?.can_draw}
            className={`w-full mt-4 py-3 rounded-xl font-bold text-lg transition-all ${
              !scratchInfo?.can_draw
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30'
            }`}
          >
            {buying ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            ) : !scratchInfo?.can_draw ? (
              scratchInfo?.balance < scratchInfo?.cost_points ? '积分不足' : '今日次数已用完'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Coins className="w-5 h-5" />
                购买刮刮乐 ({scratchInfo?.cost_points}积分)
              </span>
            )}
          </button>
        </>
      )}

      <p className="text-center text-xs text-slate-400 mt-3">
        刮开涂层揭晓奖品，有机会获得神秘兑换码
      </p>
    </div>
  )
}
