/**
 * 彩蛋管理弹窗组件（管理员专用）
 * 用于查看、创建、管理彩蛋兑换码
 */
import { useState, useEffect } from 'react'
import { X, Gift, Plus, Trash2, Loader2, RefreshCw, Check, Ban, Coins, Package, Award, Key } from 'lucide-react'
import api from '../../services/api'

// 奖励类型配置
const REWARD_TYPES = [
  { value: 'points', label: '积分', icon: Coins, color: 'text-yellow-500' },
  { value: 'item', label: '道具', icon: Package, color: 'text-blue-500' },
  { value: 'badge', label: '徽章', icon: Award, color: 'text-purple-500' },
  { value: 'api_key', label: 'API Key', icon: Key, color: 'text-green-500' },
]

// 道具类型
const ITEM_TYPES = [
  { value: 'cheer', label: '爱心打气' },
  { value: 'coffee', label: '咖啡' },
  { value: 'energy', label: '能量' },
  { value: 'pizza', label: '披萨' },
  { value: 'star', label: '星星' },
]

/**
 * 获取状态标签样式
 */
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

/**
 * 获取状态显示文本
 */
function getStatusText(status) {
  switch (status) {
    case 'active': return '可用'
    case 'claimed': return '已领取'
    case 'disabled': return '已禁用'
    case 'expired': return '已过期'
    default: return status
  }
}

/**
 * 格式化奖励显示
 */
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

export default function EasterEggAdminModal({ isOpen, onClose }) {
  const [codes, setCodes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // 创建表单状态
  const [newCode, setNewCode] = useState({
    code: '',
    reward_type: 'points',
    reward_value: { amount: 100 },
    description: '',
    hint: '',
  })

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [codesRes, statsRes] = await Promise.all([
        api.get('/easter-egg/admin/list'),
        api.get('/easter-egg/admin/stats'),
      ])
      setCodes(codesRes.items || [])
      setStats(statsRes)
    } catch (err) {
      setError(err.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // 创建新彩蛋码
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

      // 重置表单
      setNewCode({
        code: '',
        reward_type: 'points',
        reward_value: { amount: 100 },
        description: '',
        hint: '',
      })
      setShowCreateForm(false)

      // 刷新列表
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  // 禁用彩蛋码
  const handleDisable = async (codeId) => {
    if (!confirm('确定要禁用这个彩蛋码吗？')) return

    try {
      await api.put(`/easter-egg/admin/${codeId}/disable`)
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || '禁用失败')
    }
  }

  // 更新奖励值
  const updateRewardValue = (type, field, value) => {
    if (type === 'points') {
      setNewCode(prev => ({
        ...prev,
        reward_value: { amount: parseInt(value) || 0 }
      }))
    } else if (type === 'item') {
      setNewCode(prev => ({
        ...prev,
        reward_value: {
          ...prev.reward_value,
          [field]: field === 'amount' ? (parseInt(value) || 1) : value
        }
      }))
    } else if (type === 'badge') {
      setNewCode(prev => ({
        ...prev,
        reward_value: {
          ...prev.reward_value,
          [field]: value
        }
      }))
    }
  }

  // 切换奖励类型时重置奖励值
  const handleRewardTypeChange = (type) => {
    let defaultValue = {}
    switch (type) {
      case 'points':
        defaultValue = { amount: 100 }
        break
      case 'item':
        defaultValue = { item_type: 'cheer', amount: 1 }
        break
      case 'badge':
        defaultValue = { badge_key: '', badge_name: '' }
        break
      case 'api_key':
        defaultValue = {}
        break
    }
    setNewCode(prev => ({
      ...prev,
      reward_type: type,
      reward_value: defaultValue
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                彩蛋管理
              </h2>
              {stats && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  共 {stats.total_codes} 个 · 可用 {stats.active_codes} · 已领取 {stats.claimed_codes}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新增彩蛋码
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {/* 创建表单 */}
        {showCreateForm && (
          <div className="mx-6 mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">创建新彩蛋码</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 兑换码 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    兑换码 *
                  </label>
                  <input
                    type="text"
                    value={newCode.code}
                    onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="如: IKUN-EGG-XXXX"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                    required
                  />
                </div>

                {/* 奖励类型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    奖励类型
                  </label>
                  <select
                    value={newCode.reward_type}
                    onChange={(e) => handleRewardTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    {REWARD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 奖励值配置 */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  奖励配置
                </label>

                {newCode.reward_type === 'points' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newCode.reward_value.amount || ''}
                      onChange={(e) => updateRewardValue('points', 'amount', e.target.value)}
                      placeholder="积分数量"
                      min="1"
                      className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                    <span className="text-slate-500">积分</span>
                  </div>
                )}

                {newCode.reward_type === 'item' && (
                  <div className="flex items-center gap-4">
                    <select
                      value={newCode.reward_value.item_type || 'cheer'}
                      onChange={(e) => updateRewardValue('item', 'item_type', e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
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
                      className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
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
                      placeholder="徽章标识 (badge_key)"
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newCode.reward_value.badge_name || ''}
                      onChange={(e) => updateRewardValue('badge', 'badge_name', e.target.value)}
                      placeholder="徽章名称"
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                )}

                {newCode.reward_type === 'api_key' && (
                  <p className="text-sm text-slate-500">API Key 将从库存中自动分配</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    描述（仅管理员可见）
                  </label>
                  <input
                    type="text"
                    value={newCode.description}
                    onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="内部备注"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>

                {/* 提示语 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    兑换成功提示
                  </label>
                  <input
                    type="text"
                    value={newCode.hint}
                    onChange={(e) => setNewCode(prev => ({ ...prev, hint: e.target.value }))}
                    placeholder="兑换成功后显示给用户"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || !newCode.code.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      创建
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 列表 */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              暂无彩蛋码
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* 奖励类型图标 */}
                    <div className={`p-2 rounded-lg bg-white dark:bg-slate-700 ${REWARD_TYPES.find(t => t.value === code.reward_type)?.color || 'text-slate-500'}`}>
                      {(() => {
                        const TypeIcon = REWARD_TYPES.find(t => t.value === code.reward_type)?.icon || Gift
                        return <TypeIcon className="w-5 h-5" />
                      })()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold text-slate-800 dark:text-white">
                          {code.code}
                        </code>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(code.status)}`}>
                          {getStatusText(code.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatReward(code.reward_type, code.reward_value)}
                        {code.description && <span className="ml-2">· {code.description}</span>}
                      </div>
                      {code.status === 'claimed' && code.claimer_username && (
                        <div className="text-xs text-blue-500 mt-1">
                          已被 {code.claimer_username} 领取
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
