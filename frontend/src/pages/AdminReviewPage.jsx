import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Filter,
  RefreshCw,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { adminApi } from '../services'
import { Badge } from '../components/ui/badge'
import { resolveAvatarUrl } from '../utils/avatar'

const STATUS_CONFIG = {
  submitted: {
    label: '待审核',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  approved: {
    label: '已通过',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  rejected: {
    label: '已拒绝',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  withdrawn: {
    label: '已撤回',
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    icon: AlertTriangle,
  },
}

export default function AdminReviewPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // 检查管理员权限
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
    }
  }, [user, navigate])

  // 加载报名列表
  const loadRegistrations = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getAllRegistrations(1)
      setRegistrations(data.items || [])
    } catch (error) {
      console.error('加载报名列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadRegistrations()
    }
  }, [user])

  // 审核通过
  const handleApprove = async (registrationId) => {
    setActionLoading(registrationId)
    try {
      await adminApi.approveRegistration(1, registrationId)
      await loadRegistrations()
    } catch (error) {
      console.error('审核失败:', error)
      alert(error.response?.data?.detail || '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  // 拒绝报名
  const handleReject = async (registrationId) => {
    if (!confirm('确定要拒绝这个报名吗？')) return

    setActionLoading(registrationId)
    try {
      await adminApi.rejectRegistration(1, registrationId)
      await loadRegistrations()
    } catch (error) {
      console.error('拒绝失败:', error)
      alert(error.response?.data?.detail || '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  // 过滤报名列表
  const filteredRegistrations = registrations.filter((reg) => {
    if (filter === 'all') return true
    return reg.status === filter
  })

  // 统计数据
  const stats = {
    total: registrations.length,
    submitted: registrations.filter((r) => r.status === 'submitted').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">报名审核</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">管理参赛报名申请</p>
            </div>
          </div>
          <button
            onClick={loadRegistrations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-slate-500">总报名数</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
            <div className="text-sm text-slate-500">待审核</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-slate-500">已通过</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-slate-500">已拒绝</div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500 mr-2">筛选:</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'submitted', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 报名列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            暂无{filter === 'all' ? '' : STATUS_CONFIG[filter]?.label || ''}报名记录
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegistrations.map((reg) => {
              const statusConfig = STATUS_CONFIG[reg.status] || STATUS_CONFIG.submitted
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedId === reg.id

              return (
                <div
                  key={reg.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* 卡片头部 */}
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={resolveAvatarUrl(reg.user?.avatar_url)}
                          alt={reg.user?.display_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{reg.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {reg.user?.display_name || reg.user?.username} ·
                            <span className="ml-1">{new Date(reg.submitted_at).toLocaleString()}</span>
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                            {reg.summary}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                      <div className="p-4 space-y-4">
                        {/* 项目详情 */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-2">项目简介</h4>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{reg.summary}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-2">项目详情</h4>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{reg.description}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-2">实现计划</h4>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{reg.plan}</p>
                        </div>

                        {/* 技术栈 */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-2">技术栈</h4>
                          <div className="flex flex-wrap gap-2">
                            {reg.tech_stack?.content ? (
                              <span className="text-sm text-slate-600 dark:text-slate-400">{reg.tech_stack.content}</span>
                            ) : (
                              Object.entries(reg.tech_stack || {}).map(([category, techs]) =>
                                Array.isArray(techs) && techs.map((tech) => (
                                  <Badge key={`${category}-${tech}`} variant="secondary">
                                    {tech}
                                  </Badge>
                                ))
                              )
                            )}
                          </div>
                        </div>

                        {/* 仓库链接 */}
                        {reg.repo_url && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-500 mb-2">GitHub 仓库</h4>
                            <a
                              href={reg.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                            >
                              {reg.repo_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* 联系方式 */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-500 mb-2">联系方式</h4>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Mail className="w-4 h-4" />
                              {reg.contact_email}
                            </span>
                            {reg.contact_wechat && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <MessageSquare className="w-4 h-4" />
                                {reg.contact_wechat}
                              </span>
                            )}
                            {reg.contact_phone && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Phone className="w-4 h-4" />
                                {reg.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        {reg.status === 'submitted' && (
                          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => handleApprove(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionLoading === reg.id ? '处理中...' : '通过审核'}
                            </button>
                            <button
                              onClick={() => handleReject(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              拒绝
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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
