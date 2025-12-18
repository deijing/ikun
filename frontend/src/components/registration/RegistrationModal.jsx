import { useEffect, useMemo, useState } from 'react'
import { useRegistrationStore } from '@/stores/registrationStore'
import { useAuthStore } from '@/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  Rocket,
  FileText,
  Code2,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  Github,
} from 'lucide-react'
import PlanEditor from './PlanEditor'

/**
 * 信任等级徽章变体映射
 */
const TRUST_LEVEL_VARIANTS = {
  0: 'secondary',
  1: 'default',
  2: 'default',
  3: 'outline',
  4: 'destructive',
}

/**
 * 空表单初始值
 */
const emptyForm = {
  title: '',
  summary: '',
  description: '',
  plan: '',
  techStackText: '',
  repo_url: '',
  contact_email: '',
  contact_wechat: '',
  api_key: '',
}

/**
 * 邮箱验证
 */
const validateEmail = (value) => {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * 分区标题组件
 */
function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5 border-b pb-3 border-border/50">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

/**
 * 表单区块组件
 */
function FormSection({ children, className }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card text-card-foreground p-6 shadow-sm",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * 报名弹窗表单组件
 */
export default function RegistrationModal({ contestId = 1 }) {
  // 登录用户信息
  const user = useAuthStore((s) => s.user)

  // Store 状态
  const modalOpen = useRegistrationStore((s) => s.modalOpen)
  const closeModal = useRegistrationStore((s) => s.closeModal)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const saving = useRegistrationStore((s) => s.saving)
  const storeError = useRegistrationStore((s) => s.error)
  const clearError = useRegistrationStore((s) => s.clearError)
  const createRegistration = useRegistrationStore((s) => s.create)
  const updateRegistration = useRegistrationStore((s) => s.update)

  // 是否是编辑模式
  const isEditing = useMemo(() => {
    return !!registration && status !== 'withdrawn'
  }, [registration, status])

  // 用户显示名称
  const displayName = useMemo(() => {
    if (!user) return ''
    return user.display_name?.trim() || user.username || ''
  }, [user])

  // 信任等级
  const trustLevel = useMemo(() => {
    const level = Math.min(4, Math.max(0, Number(user?.trust_level) || 0))
    return {
      level,
      variant: TRUST_LEVEL_VARIANTS[level] || 'secondary',
    }
  }, [user])

  // 头像首字母
  const avatarFallback = useMemo(() => {
    const text = displayName || user?.username || ''
    return text ? text.slice(0, 1).toUpperCase() : '?'
  }, [displayName, user])

  // 表单状态
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')

  // 弹窗打开时初始化表单
  useEffect(() => {
    if (!modalOpen) return

    clearError()
    setFieldErrors({})
    setSuccessMsg('')

    if (registration && status !== 'withdrawn') {
      let techText = ''
      if (registration.tech_stack) {
        if (typeof registration.tech_stack === 'string') {
          techText = registration.tech_stack
        } else if (registration.tech_stack.content) {
          techText = registration.tech_stack.content
        } else {
          techText = Object.entries(registration.tech_stack)
            .filter(([, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => `${k}: ${v.join(', ')}`)
            .join('\n')
        }
      }

      setForm({
        title: registration.title || '',
        summary: registration.summary || '',
        description: registration.description || '',
        plan: registration.plan || '',
        techStackText: techText,
        repo_url: registration.repo_url || '',
        contact_email: registration.contact_email || '',
        contact_wechat: registration.contact_wechat || '',
        api_key: registration.api_key || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [modalOpen, registration, status, clearError])

  // 字段顺序（用于滚动到第一个错误）
  const fieldOrder = ['title', 'summary', 'description', 'plan', 'techStackText', 'contact_email', 'api_key']

  // 字段变更处理
  const handleChange = (key) => (e) => {
    setSuccessMsg('')
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  // 滚动到第一个错误字段
  const scrollToFirstError = (errors) => {
    // 字段名到 DOM id 的映射
    const fieldToId = {
      techStackText: 'techStack',
      api_key: 'apikey',
    }
    for (const field of fieldOrder) {
      if (errors[field]) {
        const element = document.getElementById(fieldToId[field] || field)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
        break
      }
    }
  }

  // 表单验证
  const validate = () => {
    const errors = {}

    if (!form.title.trim()) {
      errors.title = '请填写项目名称'
    } else if (form.title.length > 200) {
      errors.title = '项目名称不能超过 200 字'
    } else if (form.title.trim().length < 2) {
      errors.title = '项目名称至少 2 个字符'
    }

    if (!form.summary.trim()) {
      errors.summary = '请填写一句话简介'
    } else if (form.summary.length > 500) {
      errors.summary = '一句话简介不能超过 500 字'
    } else if (form.summary.trim().length < 10) {
      errors.summary = '一句话简介至少 10 个字符'
    }

    if (!form.description.trim()) {
      errors.description = '请填写项目介绍'
    } else if (form.description.trim().length < 50) {
      errors.description = '项目介绍至少 50 个字符'
    }

    if (!form.plan.trim()) {
      errors.plan = '请添加至少一条实现计划'
    } else {
      // 统计有效任务数量（非空行）
      const taskCount = form.plan
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .length
      if (taskCount < 1) {
        errors.plan = '请添加至少一条实现计划'
      }
    }

    if (!form.contact_email.trim()) {
      errors.contact_email = '请填写联系邮箱'
    } else if (!validateEmail(form.contact_email.trim())) {
      errors.contact_email = '邮箱格式不正确'
    }

    if (!form.techStackText.trim()) {
      errors.techStackText = '请填写技术栈'
    }

    if (!form.api_key.trim()) {
      errors.api_key = '请填写 API Key'
    } else if (!form.api_key.trim().startsWith('sk-')) {
      errors.api_key = 'API Key 格式不正确，应以 sk- 开头'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      // 延迟滚动，确保错误状态已更新
      setTimeout(() => scrollToFirstError(errors), 100)
      return false
    }
    return true
  }

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    clearError()

    if (!validate()) return

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      plan: form.plan.trim(),
      tech_stack: { content: form.techStackText.trim() },
      repo_url: form.repo_url.trim() || null,
      contact_email: form.contact_email.trim(),
      contact_wechat: form.contact_wechat.trim() || null,
      api_key: form.api_key.trim() || null,
    }

    try {
      if (isEditing) {
        await updateRegistration(contestId, payload)
        setSuccessMsg('报名信息已更新')
      } else {
        await createRegistration(contestId, payload)
        setSuccessMsg('报名已提交成功！')
      }
    } catch {
      // 错误由 storeError 展示
    }
  }

  // 状态徽章
  const statusBadge = useMemo(() => {
    const map = {
      submitted: { label: '已提交', variant: 'default' },
      approved: { label: '已通过', variant: 'secondary' },
      rejected: { label: '已拒绝', variant: 'destructive' },
      withdrawn: { label: '已撤回', variant: 'outline' },
    }
    return map[status] || { label: status, variant: 'secondary' }
  }, [status])

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && !saving && closeModal()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col border-none shadow-2xl">
        {/* 顶部实色横幅 */}
        <div className="relative h-24 shrink-0 bg-zinc-900 text-white flex flex-col justify-center overflow-hidden">
           {/* 微妙的纹理背景 */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
           
          {/* 标题区 */}
          <div className="relative z-10 w-full px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 shadow-inner">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white mb-1">
                  {isEditing ? '编辑报名信息' : '立即报名参赛'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-sm font-medium">
                  {isEditing ? '修改您的参赛项目信息' : '填写项目信息，开启您的参赛之旅'}
                </DialogDescription>
              </div>
            </div>

            {/* 状态徽章 */}
            {registration && (
              <Badge
                variant={statusBadge.variant}
                className="px-3 py-1 text-sm font-semibold border-none shadow-md"
              >
                {statusBadge.label}
              </Badge>
            )}
          </div>
        </div>

        {/* 用户信息卡片 */}
        {user && (
          <div className="px-6 -mt-6 relative z-20 shrink-0">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-lg shadow-zinc-500/5 dark:shadow-none">
              <Avatar className="w-12 h-12 rounded-lg border-2 border-background shadow-sm">
                <AvatarImage
                  src={user.avatar_url}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-primary">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold text-foreground truncate">
                    {displayName}
                  </span>
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs font-medium rounded-md px-1.5 py-0 h-5"
                  >
                    TL{trustLevel.level}
                  </Badge>
                </div>
                {user.username && (
                  <p className="text-xs text-muted-foreground truncate font-medium">
                    @{user.username}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                Linux.do
              </div>
            </div>
          </div>
        )}

        {/* 消息提示 */}
        {(storeError || successMsg) && (
          <div className="px-6 pt-5 shrink-0">
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm border shadow-sm',
                successMsg
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
              )}
            >
              {successMsg ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-semibold">{successMsg || storeError}</span>
            </div>
          </div>
        )}

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {/* 项目基本信息 */}
          <FormSection>
            <SectionTitle
              icon={Rocket}
              title="项目基本信息"
              subtitle="让大家快速了解你的项目"
            />

            <div className="space-y-5">
              {/* 项目名称 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  项目名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={handleChange('title')}
                  placeholder="例如：智能聊天助手"
                  maxLength={200}
                  className="h-11 rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary font-medium"
                />
                {fieldErrors.title && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* 一句话简介 */}
              <div className="space-y-2">
                <Label htmlFor="summary" className="text-sm font-semibold">
                  一句话简介 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="summary"
                  value={form.summary}
                  onChange={handleChange('summary')}
                  placeholder="用精炼的语言描述项目核心价值"
                  rows={2}
                  maxLength={500}
                  className="rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary resize-none font-medium"
                />
                {fieldErrors.summary && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.summary}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          {/* 项目详情 */}
          <FormSection>
            <SectionTitle
              icon={FileText}
              title="项目详情"
              subtitle="详细描述你的项目内容和计划"
            />

            <div className="space-y-5">
              {/* 项目介绍 */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  项目介绍 <span className="text-red-500">*</span>
                  <span className="font-normal text-muted-foreground ml-2 text-xs">支持 Markdown</span>
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={handleChange('description')}
                  placeholder={`详细介绍你的项目：
• 背景与动机
• 核心功能
• 技术架构`}
                  rows={6}
                  className="rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary resize-y min-h-[140px] font-mono text-sm"
                />
                {fieldErrors.description && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* 实现计划 - 滴答清单风格编辑器 */}
              <div id="plan" className="space-y-2">
                <PlanEditor
                  value={form.plan}
                  onChange={(newPlan) => {
                    setSuccessMsg('')
                    setFieldErrors((prev) => ({ ...prev, plan: undefined }))
                    setForm((prev) => ({ ...prev, plan: newPlan }))
                  }}
                  disabled={saving}
                />
                {fieldErrors.plan && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.plan}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          {/* 技术栈 */}
          <FormSection>
            <SectionTitle
              icon={Code2}
              title="技术栈"
              subtitle="列出你将使用的技术和工具"
            />

            <div className="space-y-2">
              <Textarea
                id="techStack"
                value={form.techStackText}
                onChange={handleChange('techStackText')}
                placeholder="React, FastAPI, MySQL..."
                rows={4}
                className="rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary resize-y min-h-[100px] font-mono text-sm"
              />
              {fieldErrors.techStackText && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.techStackText}
                </p>
              )}
            </div>
          </FormSection>

          {/* GitHub 仓库 */}
          <FormSection>
            <SectionTitle
              icon={Github}
              title="GitHub 仓库"
              subtitle="填写项目仓库地址，系统将自动追踪开发进度"
            />

            <div className="space-y-2">
              <Label htmlFor="repo_url" className="text-sm font-semibold">
                仓库地址 <span className="text-muted-foreground font-normal text-xs">可选，公开仓库</span>
              </Label>
              <Input
                id="repo_url"
                value={form.repo_url}
                onChange={handleChange('repo_url')}
                placeholder="https://github.com/username/repo"
                maxLength={500}
                className="h-11 rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                填写后可在选手页面展示每日提交数、代码量等统计数据
              </p>
            </div>
          </FormSection>

          {/* 联系方式 */}
          <FormSection>
            <SectionTitle
              icon={Mail}
              title="联系与鉴权"
              subtitle="确保我们可以联系到你"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  联系邮箱 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contact_email}
                  onChange={handleChange('contact_email')}
                  placeholder="your@email.com"
                  className="h-11 rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                />
                {fieldErrors.contact_email && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.contact_email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat" className="text-sm font-semibold">
                  微信号 <span className="text-muted-foreground font-normal text-xs">可选</span>
                </Label>
                <Input
                  id="wechat"
                  value={form.contact_wechat}
                  onChange={handleChange('contact_wechat')}
                  placeholder="WeChat ID"
                  maxLength={100}
                  className="h-11 rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apikey" className="text-sm font-semibold">
                    ikuncode API Key <span className="text-red-500">*</span>
                  </Label>
                  <a
                    href="https://api.ikuncode.cc/console/token"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-medium flex items-center"
                  >
                    获取 Key <span className="ml-1">→</span>
                  </a>
                </div>
                <Input
                  id="apikey"
                  value={form.api_key}
                  onChange={handleChange('api_key')}
                  placeholder="sk-..."
                  maxLength={255}
                  className="h-11 rounded-lg bg-background border-zinc-200 dark:border-zinc-700 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary font-mono text-sm"
                />
                {fieldErrors.api_key && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.api_key}
                  </p>
                )}
              </div>
            </div>
          </FormSection>
        </form>

        {/* 底部操作栏 */}
        <div className="border-t border-border bg-card px-6 py-4 shrink-0 flex items-center justify-end gap-3 z-10">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={saving}
              className="h-11 px-6 rounded-lg font-medium border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="h-11 px-8 rounded-lg bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : isEditing ? (
                '保存修改'
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  确认提交
                </>
              )}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
