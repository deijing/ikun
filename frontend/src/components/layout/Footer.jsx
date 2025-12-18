/**
 * 页脚组件
 * 隐藏彩蛋：连续点击版权文字 7 次可触发彩蛋入口
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import EasterEggModal from '../easter-egg/EasterEggModal'

// 练习时长提示语（iKun 梗）
const HINT_MESSAGES = [
  '', // 0 次不显示
  '练习时长...', // 1
  '两年...', // 2
  '半...', // 3
  '喜欢唱...', // 4
  '跳...', // 5
  'Rap...', // 6
  '🏀', // 7 触发
]

// 音效频率（模拟音阶上升）
const SOUND_FREQUENCIES = [262, 294, 330, 349, 392, 440, 494] // C4 到 B4

// 播放点击音效
const playClickSound = (count) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    // 根据点击次数选择频率
    const freqIndex = Math.min(count - 1, SOUND_FREQUENCIES.length - 1)
    oscillator.frequency.value = SOUND_FREQUENCIES[freqIndex]
    oscillator.type = 'sine'

    // 音量渐变
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.15)
  } catch {
    // 忽略音频播放错误
  }
}

// 播放成功音效（篮球弹跳音）
const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

    // 连续三个音符模拟"鸡你太美"
    const notes = [523, 659, 784] // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = freq
      osc.type = 'triangle'
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.12 + 0.2)
      osc.start(audioCtx.currentTime + i * 0.12)
      osc.stop(audioCtx.currentTime + i * 0.12 + 0.2)
    })
  } catch {
    // 忽略音频播放错误
  }
}

export default function Footer() {
  const [easterEggOpen, setEasterEggOpen] = useState(false)
  const [hint, setHint] = useState('')
  const [clickCount, setClickCount] = useState(0)
  const clickTimerRef = useRef(null)
  const hintTimerRef = useRef(null)

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [])

  // 彩蛋触发：连续点击 7 次
  const handleSecretClick = useCallback(() => {
    const newCount = clickCount + 1
    setClickCount(newCount)

    // 播放音效
    if (newCount < 7) {
      playClickSound(newCount)
    }

    // 显示提示
    if (newCount <= 7) {
      setHint(HINT_MESSAGES[newCount])
      // 提示 1.5 秒后消失
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      hintTimerRef.current = setTimeout(() => setHint(''), 1500)
    }

    // 清除之前的重置定时器
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)

    // 3秒内未继续点击则重置计数
    clickTimerRef.current = setTimeout(() => {
      setClickCount(0)
      setHint('')
    }, 3000)

    // 达到 7 次触发彩蛋
    if (newCount >= 7) {
      playSuccessSound() // 成功音效
      setClickCount(0)
      setTimeout(() => setEasterEggOpen(true), 500)
    }
  }, [clickCount])

  return (
    <>
      <footer className="bg-slate-200 dark:bg-slate-950 py-8 border-t border-slate-300 dark:border-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-600 dark:text-slate-500 text-sm">
            <span
              onClick={handleSecretClick}
              className="cursor-default select-none relative inline-block"
              title="ikuncode"
            >
              © 2025 ikuncode. All rights reserved.
              {/* 隐藏提示 - 点击时显示 */}
              {hint && (
                <span
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-xs font-bold rounded-full whitespace-nowrap animate-bounce shadow-lg"
                >
                  {hint}
                </span>
              )}
            </span>
            <br />
            本活动最终解释权归 ikuncode 运营团队所有
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-slate-500 dark:text-slate-600 text-sm">
            <span>Enterprise Stability</span>
            <span>•</span>
            <span>High Concurrency</span>
            <span>•</span>
            <span>Low Latency</span>
          </div>
        </div>
      </footer>

      {/* 彩蛋弹窗 */}
      <EasterEggModal
        isOpen={easterEggOpen}
        onClose={() => setEasterEggOpen(false)}
      />
    </>
  )
}
