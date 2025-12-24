import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { useAuthStore } from '@/stores/authStore'
import { useRegistrationStore } from '@/stores/registrationStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  GitCommit,
  Plus,
  Minus,
  Target,
  Flame,
  ExternalLink,
  Edit3,
  Github,
  Sparkles,
  Zap,
  FileText,
  Eye,
  Heart,
  Coffee,
  Pizza,
  Star,
  Trophy,
  Calendar,
  TrendingUp,
  Activity,
  Code2,
  RefreshCw,
  ChevronRight,
  Copy,
  Check,
  ArrowLeft,
  BarChart3,
  Users,
  Rocket,
  Cpu,
  FileDown,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { RegistrationModal } from '@/components/registration'
import ParticipantDetailModal from '@/components/participant/ParticipantDetailModal'

/**
 * 审核状态配置 - 高端版
 */
const STATUS_CONFIG = {
  submitted: {
    label: '审核中',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    gradient: 'from-amber-600/80 to-orange-600/80',
    description: '您的报名正在等待审核',
  },
  approved: {
    label: '已通过',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    gradient: 'from-emerald-600/80 to-teal-600/80',
    description: '报名已通过，加油开发吧！',
  },
  rejected: {
    label: '未通过',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    gradient: 'from-red-600/80 to-rose-600/80',
    description: '报名未通过，可修改后重新提交',
  },
  draft: {
    label: '草稿',
    icon: FileText,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    gradient: 'from-zinc-600/80 to-zinc-700/80',
    description: '报名草稿，请完善后提交',
  },
  withdrawn: {
    label: '已撤回',
    icon: AlertCircle,
    color: 'text-zinc-500',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    gradient: 'from-zinc-500/80 to-zinc-600/80',
    description: '报名已撤回',
  },
}

const CONTEST_ID = 1

/**
 * 作品状态展示文案
 */
const PROJECT_STATUS_LABELS = {
  draft: '草稿',
  submitted: '已提交',
  online: '已上线',
  offline: '已下线',
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatLocalDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 解析计划完成度
 */
function parsePlanProgress(plan) {
  if (!plan?.trim()) return { total: 0, done: 0, percent: 0 }
  const lines = plan.replace(/\r\n?/g, '\n').split('\n')
  let total = 0
  let done = 0
  const checkboxRe = /\[( |x|X)\]/
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(checkboxRe)
    if (match) {
      total++
      if (match[1].toLowerCase() === 'x') {
        done++
      }
    } else if (trimmed.match(/^[-*+]|^\d+[.)]/)) {
      total++
    }
  }
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

/**
 * 统计卡片组件 - 高对比度版
 */
function StatCard({ title, value, subValue, icon: Icon, color, trend, onClick }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900/50', icon: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50', icon: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-900/50', icon: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-900/50', icon: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900/50', icon: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  }

  const theme = colorMap[color] || colorMap.blue

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl shadow-sm", theme.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && trend !== null && trend > 0 && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
            +{trend}
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
        {value}
      </div>
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</div>
      {subValue && (
        <div className={cn("text-xs mt-2 font-semibold", theme.text)}>
          {subValue}
        </div>
      )}
    </div>
  )
}

/**
 * 月度日历热力图组件
 */
function GitHubHeatmap({ dailyData = [] }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const availableMonths = useMemo(() => [
    { year: 2025, month: 11, label: '2025年12月' },
    { year: 2026, month: 0, label: '2026年1月' },
  ], [])

  const dataMap = useMemo(() => {
    const map = {}
    dailyData.forEach(d => { if (d.date) map[d.date] = d })
    return map
  }, [dailyData])

  const calendarData = useMemo(() => {
    const { year, month } = currentMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const weeks = []
    let currentWeek = []

    for (let i = 0; i < startDayOfWeek; i++) currentWeek.push(null)

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = dataMap[dateStr]

      currentWeek.push({
        day,
        date: dateStr,
        commits: dayData?.commits_count || dayData?.commits || 0,
        additions: dayData?.additions || 0,
        deletions: dayData?.deletions || 0,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null)
      weeks.push(currentWeek)
    }

    return weeks
  }, [currentMonth, dataMap])

  // 颜色等级 - 清晰的视觉层次
  const getColorClass = (commits) => {
    if (commits === 0) return 'bg-zinc-100 dark:bg-zinc-800'
    if (commits <= 2) return 'bg-green-200 dark:bg-green-900'
    if (commits <= 5) return 'bg-green-400 dark:bg-green-700'
    if (commits <= 10) return 'bg-green-500 dark:bg-green-600'
    return 'bg-green-600 dark:bg-green-500'
  }

  const monthStats = useMemo(() => {
    let totalCommits = 0
    let activeDays = 0
    calendarData.flat().forEach(day => {
      if (day) {
        totalCommits += day.commits
        if (day.commits > 0) activeDays++
      }
    })
    return { totalCommits, activeDays }
  }, [calendarData])

  const isToday = (dateStr) => dateStr === formatLocalDate(new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-lg">
          {availableMonths.map(({ year, month, label }) => (
            <button
              key={`${year}-${month}`}
              onClick={() => setCurrentMonth({ year, month })}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                currentMonth.year === year && currentMonth.month === month
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {monthStats.totalCommits} 次提交
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            {monthStats.activeDays} 天活跃
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* 星期标题行 */}
        <div className="grid grid-cols-7 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={cn(
                "py-3 text-center text-xs font-semibold",
                i === 0 || i === 6 ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        {calendarData.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  "aspect-square border-r last:border-r-0 border-zinc-100 dark:border-zinc-800 p-1",
                  "flex flex-col items-center justify-center relative group",
                  day && isToday(day.date) && "bg-blue-50 dark:bg-blue-950/30"
                )}
              >
                {day && (
                  <>
                    {/* 日期数字 */}
                    <div className={cn(
                      "text-sm font-medium mb-0.5",
                      isToday(day.date)
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-zinc-700 dark:text-zinc-400"
                    )}>
                      {day.day}
                    </div>
                    {/* 提交指示器 */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all",
                        day.commits > 0
                          ? cn(getColorClass(day.commits), "text-white shadow-sm")
                          : "bg-transparent"
                      )}
                    >
                      {day.commits > 0 && day.commits}
                    </div>
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg transition-opacity">
                      {day.commits} 次提交
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 代码贡献趋势图组件 - 简洁柱状图
 */
function CommitTrendChart({ dailyData = [] }) {
  const chartOption = useMemo(() => {
    // 按日期排序，只取最近7天
    const sortedData = [...dailyData]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)

    const dates = sortedData.map(d => {
      const parts = d.date.split('-')
      return `${parts[1]}/${parts[2]}`
    })
    const commits = sortedData.map(d => d.commits || 0)

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 0,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params) => {
          const p = params[0]
          return `<div style="font-weight:600">${p.axisValue}</div>
                  <div style="margin-top:4px;color:#a855f7;font-size:18px;font-weight:bold">${p.value} 次提交</div>`
        }
      },
      grid: {
        top: 20,
        left: 8,
        right: 8,
        bottom: 30,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#a1a1aa',
          fontSize: 11,
          margin: 12
        },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'bar',
          data: commits.map((value, index) => ({
            value,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#a855f7' },
                  { offset: 1, color: '#7c3aed' }
                ]
              },
              borderRadius: [6, 6, 0, 0],
              shadowColor: 'rgba(168, 85, 247, 0.3)',
              shadowBlur: 8,
              shadowOffsetY: 4
            }
          })),
          barWidth: '50%',
          emphasis: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#c084fc' },
                  { offset: 1, color: '#a855f7' }
                ]
              }
            }
          }
        },
      ],
    }
  }, [dailyData])

  if (!dailyData.length) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无数据</p>
        </div>
      </div>
    )
  }

  return (
    <ReactECharts
      option={chartOption}
      style={{ height: 200 }}
      opts={{ renderer: 'svg' }}
      notMerge={true}
    />
  )
}

/**
 * 代码统计卡片组件 - 简洁数字展示
 */
function CodeStatsDisplay({ additions = 0, deletions = 0, commits = 0 }) {
  const total = additions + deletions
  const addPercent = total > 0 ? Math.round((additions / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* 主统计 */}
      <div className="text-center py-4">
        <div className="text-4xl font-black text-zinc-900 dark:text-white mb-1">
          {total.toLocaleString()}
        </div>
        <div className="text-sm text-zinc-500">总代码变更</div>
      </div>

      {/* 进度条 */}
      <div className="px-2">
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${addPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
            style={{ width: `${100 - addPercent}%` }}
          />
        </div>
      </div>

      {/* 详细数据 */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Plus className="w-4 h-4" />
            <span className="text-xl font-bold">{additions.toLocaleString()}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">新增行</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30">
          <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
            <Minus className="w-4 h-4" />
            <span className="text-xl font-bold">{deletions.toLocaleString()}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">删除行</div>
        </div>
      </div>
    </div>
  )
}

/**
 * 参赛者个人中心页面
 */
export default function ContestantCenterPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const openModal = useRegistrationStore((s) => s.openModal)

  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [githubStats, setGithubStats] = useState(null)
  const [quotaData, setQuotaData] = useState(null)
  const [cheerStats, setCheerStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [projectInfo, setProjectInfo] = useState(null)

  // 为展示页 modal 构建完整的参赛者数据
  const participantData = useMemo(() => {
    if (!registration || !user) return null
    return {
      // 报名信息
      id: registration.id,
      title: registration.title,
      summary: registration.summary,
      description: registration.description,
      plan: registration.plan,
      tech_stack: registration.tech_stack,
      repo_url: registration.repo_url,
      status: registration.status,
      submitted_at: registration.submitted_at,
      created_at: registration.created_at,
      // 用户信息 - 使用 authStore 的完整用户数据
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        trust_level: user.trust_level,
      },
    }
  }, [registration, user])

  // 页面加载时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      navigate('/login')
      return
    }
    checkStatus(CONTEST_ID).finally(() => setLoading(false))
  }, [hydrated, token, checkStatus, navigate])

  useEffect(() => {
    if (!registration?.id) return
    const loadData = async () => {
      if (registration.repo_url) {
        try {
          const stats = await api.get(`/registrations/${registration.id}/github-stats`, {
            params: { start_date: '2025-12-01', end_date: '2026-01-31' }
          })
          if (stats.daily_stats) {
            stats.daily = stats.daily_stats.map(d => ({
              date: d.date,
              commits: d.commits_count,
              additions: d.additions,
              deletions: d.deletions,
            }))
          }
          const todayStr = formatLocalDate(new Date())
          const todayData = stats.daily_stats?.find(d => d.date === todayStr)
          if (todayData) {
            stats.today = {
              commits: todayData.commits_count,
              additions: todayData.additions,
              deletions: todayData.deletions,
            }
          }
          setGithubStats(stats)
        } catch { setGithubStats(null) }
      }
      try { setQuotaData(await api.get(`/registrations/${registration.id}/quota`)) } catch { setQuotaData(null) }
      try { setCheerStats(await api.get(`/registrations/${registration.id}/cheers`)) } catch { setCheerStats(null) }
    }
    loadData()
  }, [registration?.id, registration?.repo_url])

  useEffect(() => {
    if (!token || !registration?.id) return
    let active = true

    const loadProject = async () => {
      try {
        const res = await api.get('/projects', { params: { contest_id: CONTEST_ID, mine: true } })
        const project = res?.items?.[0] || null
        if (active) setProjectInfo(project)
      } catch {
        if (active) setProjectInfo(null)
      }
    }

    loadProject()
    return () => {
      active = false
    }
  }, [token, registration?.id])

  const handleRefresh = async () => {
    if (!registration?.id) return
    setRefreshing(true)
    try {
      const [quotaRes, cheersRes] = await Promise.all([
        api.get(`/registrations/${registration.id}/quota`).catch(() => null),
        api.get(`/registrations/${registration.id}/cheers`).catch(() => null),
      ])
      if (quotaRes) setQuotaData(quotaRes)
      if (cheersRes) setCheerStats(cheersRes)
      if (registration.repo_url) {
        const githubRes = await api.get(`/registrations/${registration.id}/github-stats`, {
          params: { start_date: '2025-12-01', end_date: '2026-01-31' }
        }).catch(() => null)
        if (githubRes) {
          if (githubRes.daily_stats) {
            githubRes.daily = githubRes.daily_stats.map(d => ({
              date: d.date,
              commits: d.commits_count,
              additions: d.additions,
              deletions: d.deletions,
            }))
          }
          const todayStr = formatLocalDate(new Date())
          const todayData = githubRes.daily_stats?.find(d => d.date === todayStr)
          if (todayData) {
            githubRes.today = {
              commits: todayData.commits_count,
              additions: todayData.additions,
              deletions: todayData.deletions,
            }
          }
          setGithubStats(githubRes)
        }
      }
      toast.success('数据已刷新')
    } catch { toast.error('刷新失败') }
    finally { setRefreshing(false) }
  }

  const handleCopyApiKey = () => {
    if (registration?.api_key) {
      navigator.clipboard.writeText(registration.api_key)
      setCopied(true)
      toast.success('API Key 已复制')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 导出为 PDF 文件
  const handleExportPDF = async () => {
    if (!registration) return
    setExportingPDF(true)

    try {
      // 创建一个临时的 div 用于生成 PDF 内容
      // A4 纸张比例约为 1:1.414，宽度设为 595px 对应 210mm
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 595px;
        padding: 40px;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
      `

      // 构建 PDF 内容 HTML
      const techStackItems = registration.tech_stack?.content
        ? registration.tech_stack.content.split(/[,，、\n]/).filter(t => t.trim())
        : []

      const planItems = registration.plan
        ? registration.plan.split('\n').filter(line => line.trim()).map(line => {
            const trimmed = line.trim()
            const isCompleted = /\[x\]/i.test(trimmed)
            const taskText = trimmed
              .replace(/^[-*+]\s*/, '')
              .replace(/^\d+[.)]\s*/, '')
              .replace(/\[[ x]\]\s*/i, '')
              .trim()
            return { text: taskText, completed: isCompleted }
          }).filter(item => item.text)
        : []

      tempContainer.innerHTML = `
        <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
          <h1 style="font-size: 28px; font-weight: 800; color: #18181b; margin: 0 0 8px 0;">
            ${registration.title || '项目名称'}
          </h1>
          <p style="color: #71717a; font-size: 14px; margin: 0;">
            参赛选手: ${user?.display_name || user?.username || '未知'} (@${user?.username || ''})
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px;">
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #18181b;">${planProgress.percent}%</div>
            <div style="font-size: 12px; color: #71717a; margin-top: 4px;">开发进度 (${planProgress.done}/${planProgress.total})</div>
          </div>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #18181b;">${githubStats?.summary?.total_commits || 0}</div>
            <div style="font-size: 12px; color: #71717a; margin-top: 4px;">代码提交数</div>
          </div>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #22c55e;">+${githubStats?.summary?.total_additions || 0}</div>
            <div style="font-size: 12px; color: #71717a; margin-top: 4px;">新增代码行</div>
          </div>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px;">
            <div style="font-size: 24px; font-weight: 700; color: #ef4444;">-${githubStats?.summary?.total_deletions || 0}</div>
            <div style="font-size: 12px; color: #71717a; margin-top: 4px;">删除代码行</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">项目描述</h2>
          <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
            ${registration.description || '暂无描述'}
          </p>
        </div>

        ${registration.repo_url ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #18181b; margin: 0 0 8px 0;">GitHub 仓库</h2>
          <a href="${registration.repo_url}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${registration.repo_url}</a>
        </div>
        ` : ''}

        ${techStackItems.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">技术栈</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${techStackItems.map(tech => `
              <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 6px; font-size: 12px; color: #3f3f46;">
                ${tech.trim()}
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${planItems.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #18181b; margin: 0 0 12px 0;">开发任务</h2>
          <div>
            ${planItems.map(item => `
              <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: ${item.completed ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; margin-bottom: 6px; border: 1px solid ${item.completed ? '#bbf7d0' : '#e2e8f0'};">
                <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${item.completed ? '#22c55e' : '#cbd5e1'}; background: ${item.completed ? '#22c55e' : 'transparent'}; display: flex; align-items: center; justify-content: center;">
                  ${item.completed ? '<span style="color: white; font-size: 10px;">✓</span>' : ''}
                </div>
                <span style="font-size: 13px; color: ${item.completed ? '#71717a' : '#3f3f46'}; ${item.completed ? 'text-decoration: line-through;' : ''}">${item.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: #fdf4ff; padding: 16px; border-radius: 12px; border: 1px solid #f5d0fe;">
            <div style="font-size: 20px; font-weight: 700; color: #a21caf;">${cheerStats?.stats?.total || 0}</div>
            <div style="font-size: 12px; color: #86198f; margin-top: 4px;">社区应援数</div>
          </div>
          <div style="background: #fffbeb; padding: 16px; border-radius: 12px; border: 1px solid #fde68a;">
            <div style="font-size: 20px; font-weight: 700; color: #b45309;">$${quotaData?.quota?.used?.toFixed(2) || '0.00'}</div>
            <div style="font-size: 12px; color: #92400e; margin-top: 4px;">API 消耗</div>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
            导出时间: ${new Date().toLocaleString('zh-CN')} · 鸡王争霸赛 ikuncode
          </p>
        </div>
      `

      document.body.appendChild(tempContainer)

      // 使用 html2canvas 转换为图片
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      document.body.removeChild(tempContainer)

      // 创建 PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // 计算缩放比例，留出页边距
      const margin = 10 // 10mm 边距
      const availableWidth = pdfWidth - margin * 2
      const availableHeight = pdfHeight - margin * 2
      const ratio = Math.min(availableWidth / (imgWidth / 2), availableHeight / (imgHeight / 2))

      // 计算居中位置
      const scaledWidth = (imgWidth / 2) * ratio
      const scaledHeight = (imgHeight / 2) * ratio
      const imgX = (pdfWidth - scaledWidth) / 2
      const imgY = margin

      pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight)
      pdf.save(`${registration.title || 'project'}_info.pdf`)

      toast.success('PDF 已下载')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('PDF 导出失败')
    } finally {
      setExportingPDF(false)
    }
  }

  const planProgress = useMemo(() => parsePlanProgress(registration?.plan), [registration?.plan])
  const projectStatusLabel = projectInfo?.status ? (PROJECT_STATUS_LABELS[projectInfo.status] || '未知') : '-'
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
  const StatusIcon = statusConfig.icon

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  if (!registration || status === 'none' || status === 'unknown' || status === 'withdrawn') {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-2xl mx-auto px-4 relative z-10">
          <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl p-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/30">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
              开启您的传奇之旅
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
              加入鸡王争霸赛，展示您的才华，赢取丰厚奖励。
            </p>
            <Button onClick={openModal} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0 h-12 px-8 text-base rounded-full transition-all hover:scale-105">
              <Zap className="w-5 h-5 mr-2" />
              立即报名
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden font-sans">
      {/* 沉浸式背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '10s'}} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 顶部英雄区域 */}
        <div className="relative rounded-[2rem] overflow-hidden mb-10 shadow-2xl shadow-zinc-900/20 group">
          <div className={`absolute inset-0 bg-gradient-to-r ${statusConfig.gradient} opacity-90`} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000" />

          <div className="relative px-8 py-12 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse" />
                  <img
                    src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=random`}
                    alt={user?.display_name}
                    className="relative w-24 h-24 rounded-full border-4 border-white/20 shadow-xl object-cover"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-zinc-900 text-white text-xs px-2 py-1 rounded-full border border-white/20 shadow-lg font-mono">
                    TL{user?.trust_level || 0}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-3 py-1 rounded-full bg-black/20 text-white/90 backdrop-blur-md border border-white/10 text-sm font-medium flex items-center gap-1.5">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight drop-shadow-sm">
                    {registration.title}
                  </h1>
                  <p className="text-white/80 text-lg font-medium">
                    @{user?.username} · 开发者
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-md shadow-lg"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                  刷新数据
                </Button>
                <Button
                  onClick={openModal}
                  className="bg-white text-zinc-900 hover:bg-zinc-100 border-0 shadow-lg shadow-white/10"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  编辑项目
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-4">
              {registration.repo_url && (
                <a
                  href={registration.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition-all border border-white/5"
                >
                  <Github className="w-5 h-5" />
                  <span className="font-medium">仓库地址</span>
                  <ExternalLink className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
               <Link
                to="/ranking"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition-all border border-white/5"
              >
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">查看榜单</span>
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition-all border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className={cn("w-5 h-5 text-blue-400", exportingPDF && "animate-pulse")} />
                <span className="font-medium">{exportingPDF ? '导出中...' : '导出 PDF'}</span>
              </button>
              <button
                onClick={() => setShowDetailModal(true)}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition-all border border-white/5"
              >
                <Eye className="w-5 h-5 text-purple-400" />
                <span className="font-medium">查看我的展示页</span>
              </button>
            </div>
          </div>
        </div>

        {/* 核心数据概览 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="开发进度"
            value={`${planProgress.percent}%`}
            subValue={`${planProgress.done}/${planProgress.total} 任务完成`}
            icon={Rocket}
            color="blue"
          />
          <StatCard
            title="代码贡献"
            value={githubStats?.summary?.total_commits || 0}
            subValue={`今日提交: ${githubStats?.today?.commits || 0}`}
            icon={GitCommit}
            color="green"
            trend={githubStats?.today?.commits}
          />
          <StatCard
            title="API 消耗"
            value={`$${quotaData?.quota?.used?.toFixed(2) || '0.00'}`}
            subValue={`剩余: ${quotaData?.quota?.is_unlimited ? '无限' : `$${quotaData?.quota?.remaining?.toFixed(2) || '0.00'}`}`}
            icon={Cpu}
            color="orange"
          />
          <StatCard
            title="社区声望"
            value={cheerStats?.stats?.total || 0}
            subValue="应援总数"
            icon={Heart}
            color="pink"
          />
        </div>

        {/* 主内容网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* 左侧主要内容 */}
          <div className="lg:col-span-8 space-y-8">

            {/* API Key 面板 */}
            {registration.api_key && (
              <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap className="w-32 h-32" />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                      API 访问
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">您的专属 API 密钥，用于调用模型接口</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyApiKey}
                    className="gap-2 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制 Key'}
                  </Button>
                </div>

                <div className="relative">
                  <code className="block w-full p-4 rounded-xl bg-zinc-100 dark:bg-black/50 font-mono text-sm text-zinc-600 dark:text-zinc-400 break-all border border-zinc-200 dark:border-zinc-800/50">
                    {registration.api_key}
                  </code>
                </div>

                {quotaData?.status === 'ok' && (
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                      <div className="text-2xl font-bold text-zinc-900 dark:text-white">${quotaData.quota?.used?.toFixed(2)}</div>
                      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mt-1">已使用</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                      <div className="text-2xl font-bold text-zinc-900 dark:text-white">${quotaData.quota?.today_used?.toFixed(2)}</div>
                      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mt-1">今日</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                         {quotaData.quota?.is_unlimited ? '∞' : `$${quotaData.quota?.remaining?.toFixed(2)}`}
                      </div>
                      <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wide mt-1">剩余额度</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GitHub 贡献热力图 */}
            {registration.repo_url && (
              <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Github className="w-6 h-6" />
                      代码贡献
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">基于 GitHub 提交记录生成的贡献热力图</p>
                  </div>
                </div>

                {githubStats?.daily || githubStats?.summary ? (
                  <GitHubHeatmap dailyData={githubStats?.daily || []} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Github className="w-12 h-12 mb-3 opacity-20" />
                    <p>等待数据同步...</p>
                  </div>
                )}
              </div>
            )}

            {/* 数据可视化图表 */}
            {registration.repo_url && githubStats?.daily?.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* 代码贡献趋势图 */}
                <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">近7日提交</h3>
                    <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      commits
                    </span>
                  </div>
                  <CommitTrendChart dailyData={githubStats.daily} />
                </div>

                {/* 代码变更统计 */}
                <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">代码统计</h3>
                    <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      lines
                    </span>
                  </div>
                  <CodeStatsDisplay
                    additions={githubStats.summary?.total_additions || 0}
                    deletions={githubStats.summary?.total_deletions || 0}
                    commits={githubStats.summary?.total_commits || 0}
                  />
                </div>
              </div>
            )}

            {/* 开发计划 - 滴答清单风格 */}
            <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">开发任务</h3>
                      <p className="text-xs text-zinc-500">{planProgress.done} 已完成 · {planProgress.total - planProgress.done} 待办</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{planProgress.percent}%</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-6">
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${planProgress.percent}%` }}
                    />
                  </div>
                </div>

                {registration.plan ? (
                  <div className="space-y-2">
                    {registration.plan.split('\n').filter(line => line.trim()).map((line, i) => {
                      const trimmed = line.trim()
                      const isCompleted = /\[x\]/i.test(trimmed)
                      const isCheckbox = /\[[ x]\]/i.test(trimmed)
                      // 提取任务文本
                      const taskText = trimmed
                        .replace(/^[-*+]\s*/, '')
                        .replace(/^\d+[.)]\s*/, '')
                        .replace(/\[[ x]\]\s*/i, '')
                        .trim()

                      if (!taskText) return null

                      return (
                        <div
                          key={i}
                          className={cn(
                            "group flex items-center gap-3 p-4 rounded-xl transition-all",
                            isCompleted
                              ? "bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30"
                              : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/50"
                          )}
                        >
                          {/* 复选框 */}
                          <div className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isCompleted
                              ? "bg-green-500 border-green-500"
                              : "border-zinc-300 dark:border-zinc-600 group-hover:border-blue-400"
                          )}>
                            {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {/* 任务文本 */}
                          <span className={cn(
                            "flex-1 text-sm transition-all",
                            isCompleted
                              ? "text-zinc-400 line-through"
                              : "text-zinc-700 dark:text-zinc-300"
                          )}>
                            {taskText}
                          </span>

                          {/* 状态标签 */}
                          {isCompleted ? (
                            <span className="flex-shrink-0 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                              已完成
                            </span>
                          ) : (
                            <span className="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                              进行中
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                    <p className="text-zinc-500 mb-2">暂无开发任务</p>
                    <p className="text-xs text-zinc-400 mb-4">添加任务来跟踪您的开发进度</p>
                    <Button variant="outline" size="sm" onClick={openModal}>
                      <Plus className="w-4 h-4 mr-1" />
                      创建任务
                    </Button>
                  </div>
                )}
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <div className="lg:col-span-4 space-y-6">

            {/* 快捷菜单 */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
               <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
                快捷操作
              </h3>
              <div className="space-y-1.5">
                <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={openModal}>
                  <Edit3 className="w-4 h-4 mr-3 text-blue-500" />
                  <span className="text-sm">编辑项目信息</span>
                </Button>
                <Link to="/ranking" className="block">
                  <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Trophy className="w-4 h-4 mr-3 text-amber-500" />
                    <span className="text-sm">查看排行榜</span>
                  </Button>
                </Link>
                <Link to="/participants" className="block">
                  <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Users className="w-4 h-4 mr-3 text-purple-500" />
                    <span className="text-sm">参赛选手</span>
                  </Button>
                </Link>
                <Link to="/activity" className="block">
                  <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Activity className="w-4 h-4 mr-3 text-pink-500" />
                    <span className="text-sm">活动中心</span>
                  </Button>
                </Link>
                <Link to="/submit" className="block">
                  <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Rocket className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">提交作品</span>
                  </Button>
                </Link>
                {projectInfo?.id ? (
                  <Link to={`/projects/${projectInfo.id}/access`} className="block">
                    <Button variant="ghost" className="w-full justify-start h-11 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <Eye className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="text-sm">访问作品</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-11 rounded-xl text-zinc-400"
                    disabled
                  >
                    <Eye className="w-4 h-4 mr-3 text-zinc-400" />
                    <span className="text-sm">访问作品</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 项目信息 */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">项目信息</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">项目名称</span>
                  <span className="font-medium text-zinc-900 dark:text-white truncate max-w-[160px]">{registration.title}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">审核状态</span>
                  <Badge variant={status === 'approved' ? 'success' : status === 'submitted' ? 'warning' : 'secondary'}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">作品状态</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{projectStatusLabel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">报名时间</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {registration.created_at ? new Date(registration.created_at).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
                {registration.repo_url && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <a
                      href={registration.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Github className="w-4 h-4" />
                      <span className="truncate">{registration.repo_url.replace('https://github.com/', '')}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 技术栈 */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
               <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">技术栈</h3>
               {registration.tech_stack?.content ? (
                <div className="flex flex-wrap gap-2">
                  {registration.tech_stack.content.split(/[,，、\n]/).filter(t => t.trim()).map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm">未设置技术栈</p>
              )}
            </div>

            {/* 应援统计 */}
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border border-pink-100 dark:border-pink-900/30 p-5 shadow-sm">
               <h3 className="text-sm font-bold text-pink-700 dark:text-pink-400 mb-4">社区应援</h3>
               <div className="grid grid-cols-5 gap-2">
                 {[
                    { icon: Heart, value: cheerStats?.stats?.cheer || 0, color: 'text-red-500' },
                    { icon: Coffee, value: cheerStats?.stats?.coffee || 0, color: 'text-amber-600' },
                    { icon: Zap, value: cheerStats?.stats?.energy || 0, color: 'text-yellow-500' },
                    { icon: Pizza, value: cheerStats?.stats?.pizza || 0, color: 'text-orange-500' },
                    { icon: Star, value: cheerStats?.stats?.star || 0, color: 'text-purple-500' },
                 ].map((item, i) => (
                   <div key={i} className="text-center p-2">
                     <item.icon className={cn("w-5 h-5 mx-auto mb-1", item.color)} />
                     <span className="text-sm font-bold text-zinc-800 dark:text-white">{item.value}</span>
                   </div>
                 ))}
               </div>
               <div className="mt-3 pt-3 border-t border-pink-200/50 dark:border-pink-800/30 text-center">
                 <span className="text-2xl font-black text-pink-600 dark:text-pink-400">{cheerStats?.stats?.total || 0}</span>
                 <span className="text-sm text-pink-500/70 ml-2">总应援</span>
               </div>
            </div>

            {/* 大众呼声 - 留言墙 */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  大众呼声
                </h3>
                <span className="text-xs text-zinc-400">{cheerStats?.recent_messages?.length || 0} 条留言</span>
              </div>

              {cheerStats?.recent_messages?.length > 0 ? (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                  {cheerStats.recent_messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className="group p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={msg.user?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user?.username || 'U'}&background=random&size=32`}
                          alt=""
                          className="w-7 h-7 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                              {msg.user?.display_name || msg.user?.username || '匿名'}
                            </span>
                            {msg.cheer_type && (
                              <span className={cn(
                                "text-xs",
                                msg.cheer_type === 'cheer' && "text-red-500",
                                msg.cheer_type === 'coffee' && "text-amber-600",
                                msg.cheer_type === 'energy' && "text-yellow-500",
                                msg.cheer_type === 'pizza' && "text-orange-500",
                                msg.cheer_type === 'star' && "text-purple-500",
                              )}>
                                {msg.cheer_type === 'cheer' && <Heart className="w-3 h-3 inline" />}
                                {msg.cheer_type === 'coffee' && <Coffee className="w-3 h-3 inline" />}
                                {msg.cheer_type === 'energy' && <Zap className="w-3 h-3 inline" />}
                                {msg.cheer_type === 'pizza' && <Pizza className="w-3 h-3 inline" />}
                                {msg.cheer_type === 'star' && <Star className="w-3 h-3 inline" />}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 break-words leading-relaxed">
                            {msg.message}
                          </p>
                          {msg.created_at && (
                            <span className="text-[10px] text-zinc-400 mt-1 block">
                              {new Date(msg.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-400">还没有留言</p>
                  <p className="text-xs text-zinc-400 mt-1">快去邀请朋友来打气吧~</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* 报名/编辑弹窗 */}
      <RegistrationModal contestId={1} />

      {/* 展示页弹窗 */}
      <ParticipantDetailModal
        participant={participantData}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  )
}
