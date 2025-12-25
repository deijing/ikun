/**
 * 提交作品页
 *
 * 支持5种材料（演示视频可选）：
 * 1. 项目源码 - GitHub/Gitee URL
 * 2. 演示视频（可选） - MP4/AVI, 3-5分钟
 * 3. 项目文档 - Markdown格式
 * 4. API调用证明 - 截图 + 日志文件
 * 5. 参赛报名表 - 关联已有报名记录
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  Image as ImageIcon,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import { projectApi, submissionApi } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { useRegistrationStore } from '@/stores/registrationStore'
import { useToast } from '@/components/Toast'
import { RegistrationModal } from '@/components/registration'
import { cn } from '@/lib/utils'

const CONTEST_ID = 1

const ATTACHMENT_TYPES = {
  DEMO_VIDEO: 'demo_video',
  API_SCREENSHOT: 'api_screenshot',
  API_LOG: 'api_log',
}

const MAX_BYTES = {
  [ATTACHMENT_TYPES.DEMO_VIDEO]: 1024 * 1024 * 1024, // 1GB
  [ATTACHMENT_TYPES.API_SCREENSHOT]: 10 * 1024 * 1024, // 10MB
  [ATTACHMENT_TYPES.API_LOG]: 50 * 1024 * 1024, // 50MB
}

const ACCEPTS = {
  [ATTACHMENT_TYPES.DEMO_VIDEO]: 'video/mp4,video/x-msvideo,video/avi,video/quicktime,.mp4,.avi',
  [ATTACHMENT_TYPES.API_SCREENSHOT]: 'image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp',
  [ATTACHMENT_TYPES.API_LOG]: 'text/plain,application/json,application/zip,application/x-zip-compressed,application/gzip,.txt,.log,.json,.zip,.gz',
}

const PROJECT_STATUS_LABELS = {
  draft: '草稿',
  submitted: '已提交',
  online: '已上线',
  offline: '已下线',
}

/** 格式化字节大小 */
function formatBytes(bytes) {
  const b = Number(bytes || 0)
  if (!Number.isFinite(b) || b <= 0) return '0B'
  const units = ['B', 'KB', 'MB', 'GB']
  let u = 0
  let v = b
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${v.toFixed(u === 0 ? 0 : 1)}${units[u]}`
}

/** 格式化日期时间 */
function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

/** 获取错误信息 */
function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
    if (Array.isArray(detail.errors) && detail.errors.length) {
      const first = detail.errors[0]
      if (first?.message) return String(first.message)
    }
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '请求失败，请稍后重试'
}

/** 验证仓库URL */
function validateRepoUrl(url) {
  const v = String(url || '').trim()
  if (!v) return { ok: false, message: '请输入 GitHub/Gitee 仓库地址' }
  if (!v.startsWith('https://')) return { ok: false, message: '仓库 URL 必须使用 https://' }
  if (!/^https:\/\/(github\.com|gitee\.com)\//.test(v)) {
    return { ok: false, message: '仅支持 https://github.com/ 或 https://gitee.com/' }
  }
  const parts = v.replace(/\/+$/, '').split('/')
  if (parts.length < 5) return { ok: false, message: '仓库 URL 格式应为 https://github.com/用户名/仓库名' }
  return { ok: true, message: '' }
}

/** 构建作品访问链接 */
function buildAccessUrl(domain) {
  if (!domain) return ''
  if (domain.startsWith('http://') || domain.startsWith('https://')) return domain
  return `//${domain}`
}

/** 解析截图链接 */
function parseScreenshotUrls(value) {
  return String(value || '')
    .split(/[\n,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 验证镜像引用 */
function validateImageRef(value) {
  const v = String(value || '').trim()
  if (!v) return { ok: false, message: '请输入镜像引用' }
  if (!v.includes('@sha256:')) return { ok: false, message: '镜像必须包含 @sha256 digest' }
  const [ref, digest] = v.split('@', 2)
  if (!ref || !digest) return { ok: false, message: '镜像引用格式不正确' }
  const registry = ref.split('/')[0]
  if (!registry) return { ok: false, message: '镜像引用格式不正确' }
  if (!['ghcr.io', 'docker.io'].includes(registry)) {
    return { ok: false, message: '仅支持 ghcr.io 或 docker.io' }
  }
  if (!digest.startsWith('sha256:') || digest.length !== 71) {
    return { ok: false, message: '镜像 digest 格式不正确' }
  }
  return { ok: true, message: '', value: v }
}

/** 获取指定类型的第一个附件 */
function getFirstAttachment(submission, type) {
  const list = submission?.attachments || []
  return list.find((a) => a?.type === type) || null
}

/** 判断状态是否可编辑 */
function isEditableStatus(status) {
  return status === 'draft' || status === 'rejected'
}

/** 获取视频时长（秒） */
async function getVideoDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0)
      URL.revokeObjectURL(url)
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('无法读取视频时长'))
        return
      }
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取视频信息'))
    }
  })
}

/** 验证演示视频 */
async function validateDemoVideo(file) {
  if (!file) return '请选择演示视频文件'
  if (file.size > MAX_BYTES[ATTACHMENT_TYPES.DEMO_VIDEO]) return '视频文件过大（最大 1GB）'

  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const isAllowed =
    type === 'video/mp4' ||
    type === 'video/x-msvideo' ||
    type === 'video/avi' ||
    type === 'video/quicktime' ||
    type === 'application/octet-stream' ||
    name.endsWith('.mp4') ||
    name.endsWith('.avi')
  if (!isAllowed) return '仅支持 MP4/AVI（或兼容格式）'

  try {
    const duration = await getVideoDurationSeconds(file)
    if (duration < 180 || duration > 300) {
      return `视频时长需 3-5 分钟（当前约 ${Math.round(duration)} 秒）`
    }
  } catch {
    // 无法读取时长时允许继续上传，由后端校验
  }
  return null
}

/** 验证截图 */
function validateScreenshot(file) {
  if (!file) return '请选择截图文件'
  if (file.size > MAX_BYTES[ATTACHMENT_TYPES.API_SCREENSHOT]) return '截图过大（最大 10MB）'
  const type = String(file.type || '').toLowerCase()
  if (!type.startsWith('image/')) return '截图仅支持 PNG/JPG/WebP'
  return null
}

/** 验证日志文件 */
function validateApiLog(file) {
  if (!file) return '请选择日志文件'
  if (file.size > MAX_BYTES[ATTACHMENT_TYPES.API_LOG]) return '日志文件过大（最大 50MB）'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const ok =
    type === 'text/plain' ||
    type === 'application/json' ||
    type === 'application/zip' ||
    type === 'application/x-zip-compressed' ||
    type === 'application/gzip' ||
    name.endsWith('.txt') ||
    name.endsWith('.log') ||
    name.endsWith('.json') ||
    name.endsWith('.zip') ||
    name.endsWith('.gz')
  if (!ok) return '日志支持 TXT/LOG/JSON/ZIP/GZ'
  return null
}

/** 状态徽章 */
function StatusBadge({ status }) {
  const map = {
    draft: { label: '草稿', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    validating: { label: '校验中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    submitted: { label: '已提交', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    rejected: { label: '被拒绝', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  }
  const item = map[status] || map.draft
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', item.className)}>
      {item.label}
    </span>
  )
}

/** 部署状态徽章 */
function DeployStatusBadge({ status }) {
  const map = {
    created: { label: '已创建', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    queued: { label: '排队中', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    pulling: { label: '拉取镜像', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    deploying: { label: '部署中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    healthchecking: { label: '健康检查', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    online: { label: '已上线', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    failed: { label: '失败', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
    stopped: { label: '已停止', className: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  }
  const item = map[status] || { label: '未知', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', item.className)}>
      {item.label}
    </span>
  )
}

/** 进度条 */
function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-200"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

/** Markdown 预览（简易版） */
function MarkdownPreview({ value }) {
  const text = String(value || '')
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">预览（保留原始格式）</div>
      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 dark:text-slate-100 font-mono">
        {text || '（空）'}
      </pre>
    </div>
  )
}

/** 材料完整性检查项 */
function MaterialItem({ ok, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('mt-0.5', ok ? 'text-emerald-500' : 'text-amber-500')}>
        {ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium text-slate-900 dark:text-white">{title}</div>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
               : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
          )}>
            {ok ? '已完成' : '待补全'}
          </span>
        </div>
        {desc && <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</div>}
      </div>
    </div>
  )
}

/** 文件上传行 */
function UploadRow({
  disabled,
  icon: Icon,
  title,
  hint,
  accept,
  existing,
  progress,
  uploading,
  onPick,
  onRemove,
  inputId,
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
            <Icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
            {hint && <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
            {existing && (
              <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                  {existing.filename}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  {existing.size_bytes ? formatBytes(existing.size_bytes) : ''}
                </span>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  existing.is_uploaded
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                )}>
                  {existing.is_uploaded ? '已上传' : '未完成'}
                </span>
              </div>
            )}
            {uploading && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>上传中</span>
                  <span>{Math.round(progress || 0)}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              e.target.value = ''
              if (file) onPick?.(file)
            }}
            id={inputId}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all h-10 px-4 py-2',
              disabled || uploading
                ? 'opacity-50 pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 cursor-pointer'
            )}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            选择并上传
          </label>
          {existing && (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled || uploading}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all h-10 px-3 py-2 border',
                disabled || uploading
                  ? 'opacity-50 pointer-events-none border-slate-200 text-slate-400 dark:border-slate-700'
                  : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** 确认提交弹窗 */
function FinalizeDialog({ open, onOpenChange, onConfirm, loading, submissionId }) {
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (open) setAck(false)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">确认最终提交</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          最终提交后作品将进入审核流程，且不可再修改。请确认所有材料已上传并通过校验。
        </p>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <div className="font-semibold text-amber-700 dark:text-amber-300">重要提示</div>
              <div className="mt-1">请确保仓库为公开可访问、视频时长符合 3-5 分钟要求，且 API 证明材料清晰完整。</div>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">我已确认：提交后不可修改</span>
        </label>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!ack || loading || !submissionId}
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            确认提交
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SubmitPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const token = useAuthStore((s) => s.token)

  const registration = useRegistrationStore((s) => s.registration)
  const registrationStatus = useRegistrationStore((s) => s.status)
  const regLoading = useRegistrationStore((s) => s.loading)
  const openRegistrationModal = useRegistrationStore((s) => s.openModal)
  const checkRegistrationStatus = useRegistrationStore((s) => s.checkStatus)

  const [docMode, setDocMode] = useState('edit')
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizeSubmissionId, setFinalizeSubmissionId] = useState(null)
  const [validateResult, setValidateResult] = useState(null)
  const [imageRef, setImageRef] = useState('')

  const [uploadState, setUploadState] = useState(() => ({
    [ATTACHMENT_TYPES.DEMO_VIDEO]: { uploading: false, progress: 0 },
    [ATTACHMENT_TYPES.API_SCREENSHOT]: { uploading: false, progress: 0 },
    [ATTACHMENT_TYPES.API_LOG]: { uploading: false, progress: 0 },
  }))

  const [form, setForm] = useState({
    title: '',
    description: '',
    repo_url: '',
    demo_url: '',
    readme_url: '',
    cover_image_url: '',
    screenshot_urls_text: '',
    project_doc_md: '',
  })

  const initForSubmissionIdRef = useRef(null)
  const initProjectMetaRef = useRef(false)
  const createDraftPromiseRef = useRef(null)
  const initImageRefDone = useRef(false)

  // 检查报名状态
  useEffect(() => {
    if (!token) return
    checkRegistrationStatus(CONTEST_ID).catch(() => {})
  }, [token, checkRegistrationStatus])

  // 获取我的提交
  const mineQuery = useQuery({
    queryKey: ['submission', 'mine', CONTEST_ID],
    enabled: !!token,
    queryFn: async () => {
      const res = await submissionApi.getMine(CONTEST_ID)
      return res?.items?.[0] || null
    },
    staleTime: 1000 * 15,
    refetchOnWindowFocus: false,
  })

  // 获取我的作品
  const projectQuery = useQuery({
    queryKey: ['project', 'mine', CONTEST_ID],
    enabled: !!token,
    queryFn: async () => {
      const res = await projectApi.list({ contest_id: CONTEST_ID, mine: true })
      return res?.items?.[0] || null
    },
    staleTime: 1000 * 15,
    refetchOnWindowFocus: false,
  })

  const submission = mineQuery.data
  const project = projectQuery.data
  const isEditable = !submission || isEditableStatus(submission.status)

  const projectSubmissionsQuery = useQuery({
    queryKey: ['project', 'submissions', project?.id],
    enabled: !!token && !!project?.id,
    queryFn: async () => {
      const res = await projectApi.listSubmissions(project.id)
      return res?.items || []
    },
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })

  const projectAccessQuery = useQuery({
    queryKey: ['project', 'access', project?.id],
    enabled: !!token && !!project?.id,
    queryFn: async () => projectApi.getAccess(project.id),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })

  const latestProjectSubmission = projectSubmissionsQuery.data?.[0] || null
  const projectError = projectQuery.error ? getErrorMessage(projectQuery.error) : ''
  const projectSubmissionError = projectSubmissionsQuery.error ? getErrorMessage(projectSubmissionsQuery.error) : ''
  const projectAccessError = projectAccessQuery.error ? getErrorMessage(projectAccessQuery.error) : ''

  // 初始化表单数据
  useEffect(() => {
    const id = submission?.id || null
    if (!id) {
      initForSubmissionIdRef.current = null
      return
    }
    if (initForSubmissionIdRef.current === id) return
    initForSubmissionIdRef.current = id
    setForm((prev) => ({
      ...prev,
      title: submission?.title || '',
      description: submission?.description || '',
      repo_url: submission?.repo_url || '',
      demo_url: submission?.demo_url || '',
      project_doc_md: submission?.project_doc_md || '',
    }))
    setValidateResult(submission?.validation_summary || null)
  }, [submission?.id])

  useEffect(() => {
    if (!project?.id) {
      initImageRefDone.current = false
      setImageRef('')
      initProjectMetaRef.current = false
      return
    }
    if (initImageRefDone.current) return
    if (latestProjectSubmission?.image_ref) {
      setImageRef(latestProjectSubmission.image_ref)
      initImageRefDone.current = true
    }
  }, [project?.id, latestProjectSubmission?.id])

  useEffect(() => {
    if (!project?.id) {
      initProjectMetaRef.current = false
      return
    }
    if (initProjectMetaRef.current) return
    setForm((prev) => ({
      ...prev,
      readme_url: project?.readme_url || '',
      cover_image_url: project?.cover_image_url || '',
      screenshot_urls_text: Array.isArray(project?.screenshot_urls)
        ? project.screenshot_urls.join('\n')
        : '',
    }))
    initProjectMetaRef.current = true
  }, [project?.id])

  // Mutations
  const createDraftMutation = useMutation({
    mutationFn: (payload) => submissionApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
    },
  })

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, payload }) => submissionApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
    },
  })

  const validateMutation = useMutation({
    mutationFn: (id) => submissionApi.validate(id),
  })

  const finalizeMutation = useMutation({
    mutationFn: (id) => submissionApi.finalize(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
    },
  })

  const syncProjectMutation = useMutation({
    mutationFn: async () => {
      const title = String(form.title || '').trim()
      if (title.length < 2) {
        throw new Error('作品标题至少 2 个字符')
      }
      const repoCheck = form.repo_url ? validateRepoUrl(form.repo_url) : { ok: true, message: '' }
      if (!repoCheck.ok) {
        throw new Error(repoCheck.message)
      }
      const screenshotUrls = parseScreenshotUrls(form.screenshot_urls_text)
      const payload = {
        contest_id: CONTEST_ID,
        title,
        summary: String(form.description || '').trim() || null,
        description: null,
        repo_url: form.repo_url?.trim() || null,
        demo_url: form.demo_url?.trim() || null,
        readme_url: form.readme_url?.trim() || null,
        cover_image_url: form.cover_image_url?.trim() || null,
        screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
      }
      if (!project?.id) return projectApi.create(payload)
      const { contest_id, ...updatePayload } = payload
      return projectApi.update(project.id, updatePayload)
    },
    onSuccess: async () => {
      toast.success(project?.id ? '作品信息已更新' : '作品已创建')
      await queryClient.invalidateQueries({ queryKey: ['project', 'mine', CONTEST_ID] })
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
    },
  })

  const submitImageMutation = useMutation({
    mutationFn: async () => {
      if (!project?.id) throw new Error('请先创建作品信息')
      const check = validateImageRef(imageRef)
      if (!check.ok) throw new Error(check.message)
      return projectApi.submitImage(project.id, { image_ref: check.value })
    },
    onSuccess: async () => {
      toast.success('镜像已提交，正在部署')
      await queryClient.invalidateQueries({ queryKey: ['project', 'submissions', project?.id] })
      await queryClient.invalidateQueries({ queryKey: ['project', 'access', project?.id] })
      await queryClient.invalidateQueries({ queryKey: ['project', 'mine', CONTEST_ID] })
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
    },
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ submissionId, attachmentId }) => submissionApi.deleteAttachment(submissionId, attachmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
    },
  })

  // 附件数据
  const attachments = submission?.attachments
  const demoVideo = useMemo(() => getFirstAttachment(submission, ATTACHMENT_TYPES.DEMO_VIDEO), [attachments])
  const apiScreenshot = useMemo(() => getFirstAttachment(submission, ATTACHMENT_TYPES.API_SCREENSHOT), [attachments])
  const apiLog = useMemo(() => getFirstAttachment(submission, ATTACHMENT_TYPES.API_LOG), [attachments])

  // 是否可以提交
  const canUseSubmission = useMemo(() => {
    if (!token) return { ok: false, message: '请先登录后提交作品' }
    if (registrationStatus === 'withdrawn') return { ok: false, message: '报名已撤回，无法提交作品' }
    if (registrationStatus === 'none') return { ok: false, message: '请先完成比赛报名' }
    if (!registration) return { ok: false, message: '请先完成比赛报名' }
    return { ok: true, message: '' }
  }, [token, registrationStatus, registration])

  const canFinalize = useMemo(() => {
    if (!token) return { ok: false, message: '请先登录后提交作品' }
    if (registrationStatus === 'withdrawn') return { ok: false, message: '报名已撤回，无法提交作品' }
    if (registrationStatus === 'none') return { ok: false, message: '请先完成比赛报名' }
    if (!registration) return { ok: false, message: '请先完成比赛报名' }
    if (registrationStatus !== 'approved') return { ok: false, message: '报名未审核通过，暂不可最终提交' }
    return { ok: true, message: '' }
  }, [token, registrationStatus, registration])

  const canDeploy = useMemo(() => {
    if (!token) return { ok: false, message: '请先登录后提交镜像' }
    if (registrationStatus === 'withdrawn') return { ok: false, message: '报名已撤回，无法提交镜像' }
    if (registrationStatus === 'none') return { ok: false, message: '请先完成比赛报名' }
    if (!registration) return { ok: false, message: '请先完成比赛报名' }
    if (registrationStatus !== 'approved') return { ok: false, message: '报名未审核通过，暂不可提交镜像部署' }
    return { ok: true, message: '' }
  }, [token, registrationStatus, registration])

  // 本地完整性检查
  const localChecklist = useMemo(() => {
    const trimmedTitle = String(form.title || '').trim()
    const repoOk = validateRepoUrl(form.repo_url).ok
    const docOk = !!String(form.project_doc_md || '').trim()
    const regOk = canUseSubmission.ok && (submission?.registration_id || registration?.id)
    const demoOk = !demoVideo || !!demoVideo?.is_uploaded
    const apiOk = !!apiScreenshot?.is_uploaded && !!apiLog?.is_uploaded
    const titleOk = trimmedTitle.length >= 2
    const allOk = repoOk && docOk && regOk && apiOk && titleOk

    return { allOk, repoOk, docOk, regOk, demoOk, apiOk, titleOk }
  }, [form.repo_url, form.project_doc_md, form.title, canUseSubmission.ok, submission?.registration_id, registration?.id, demoVideo?.is_uploaded, apiScreenshot?.is_uploaded, apiLog?.is_uploaded])

  const imageRefCheck = useMemo(() => {
    const v = String(imageRef || '').trim()
    if (!v) return { ok: false, message: '' }
    return validateImageRef(v)
  }, [imageRef])

  const saving = createDraftMutation.isPending || updateDraftMutation.isPending
  const validating = validateMutation.isPending
  const finalizing = finalizeMutation.isPending
  const syncingProject = syncProjectMutation.isPending
  const submittingImage = submitImageMutation.isPending

  // 确保有草稿（防止并发创建）
  const ensureDraft = async () => {
    if (!canUseSubmission.ok) throw new Error(canUseSubmission.message)
    if (!isEditable) throw new Error('当前作品状态不可修改')

    const title = String(form.title || '').trim()
    if (title.length < 2) throw new Error('作品标题至少 2 个字符')
    const repo = validateRepoUrl(form.repo_url)
    if (!repo.ok) throw new Error(repo.message)

    if (submission?.id) return submission

    // 防止并发创建：复用同一个 promise
    if (createDraftPromiseRef.current) {
      return createDraftPromiseRef.current
    }

    const createPromise = createDraftMutation.mutateAsync({
      contest_id: CONTEST_ID,
      title,
      description: form.description || null,
      repo_url: form.repo_url.trim(),
      demo_url: form.demo_url?.trim() || null,
      project_doc_md: form.project_doc_md || null,
    }).finally(() => {
      createDraftPromiseRef.current = null
    })

    createDraftPromiseRef.current = createPromise
    return createPromise
  }

  // 保存草稿
  const saveDraft = async () => {
    try {
      const title = String(form.title || '').trim()
      if (title.length < 2) {
        toast.warning('请先填写作品标题（至少 2 个字符）')
        return
      }
      const repo = validateRepoUrl(form.repo_url)
      if (!repo.ok) {
        toast.warning(repo.message)
        return
      }
      if (!canUseSubmission.ok) {
        toast.warning(canUseSubmission.message)
        return
      }
      if (!isEditable) {
        toast.warning('当前状态不可保存修改')
        return
      }

      if (!submission?.id) {
        await createDraftMutation.mutateAsync({
          contest_id: CONTEST_ID,
          title,
          description: form.description || null,
          repo_url: form.repo_url.trim(),
          demo_url: form.demo_url?.trim() || null,
          project_doc_md: form.project_doc_md || null,
        })
      } else {
        await updateDraftMutation.mutateAsync({
          id: submission.id,
          payload: {
            title,
            description: form.description || null,
            repo_url: form.repo_url.trim(),
            demo_url: form.demo_url?.trim() || null,
            project_doc_md: form.project_doc_md || null,
          },
        })
      }
      setValidateResult(null)
      toast.success('草稿已保存')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // 上传附件
  const uploadAttachment = async (type, file) => {
    try {
      if (!file) return
      if (!isEditable) {
        toast.warning('当前状态不可上传/修改附件')
        return
      }

      // 前端验证
      if (type === ATTACHMENT_TYPES.DEMO_VIDEO) {
        const msg = await validateDemoVideo(file)
        if (msg) {
          toast.warning(msg)
          return
        }
      }
      if (type === ATTACHMENT_TYPES.API_SCREENSHOT) {
        const msg = validateScreenshot(file)
        if (msg) {
          toast.warning(msg)
          return
        }
      }
      if (type === ATTACHMENT_TYPES.API_LOG) {
        const msg = validateApiLog(file)
        if (msg) {
          toast.warning(msg)
          return
        }
      }

      const draft = await ensureDraft()
      const submissionId = draft.id

      setUploadState((s) => ({ ...s, [type]: { uploading: true, progress: 0 } }))

      const initRes = await submissionApi.initAttachment(submissionId, {
        type,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      })

      const attachmentId = initRes?.attachment_id
      if (!attachmentId) throw new Error('初始化上传失败：未返回 attachment_id')

      await submissionApi.completeAttachment(submissionId, attachmentId, file, (evt) => {
        const loaded = Number(evt?.loaded || 0)
        const total = Number(evt?.total || file.size || 0)
        const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
        setUploadState((s) => ({ ...s, [type]: { uploading: true, progress: pct } }))
      })

      setUploadState((s) => ({ ...s, [type]: { uploading: false, progress: 100 } }))
      setValidateResult(null)
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
      toast.success('上传完成')
    } catch (e) {
      setUploadState((s) => ({ ...s, [type]: { uploading: false, progress: 0 } }))
      toast.error(getErrorMessage(e))
    }
  }

  // 删除附件
  const removeAttachment = async (attachment) => {
    try {
      if (!attachment?.id || !submission?.id) return
      if (!isEditable) {
        toast.warning('当前状态不可删除附件')
        return
      }
      await deleteAttachmentMutation.mutateAsync({ submissionId: submission.id, attachmentId: attachment.id })
      setValidateResult(null)
      toast.success('附件已删除')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // 运行校验
  const runValidate = async () => {
    try {
      const draft = await ensureDraft()
      const res = await validateMutation.mutateAsync(draft.id)
      setValidateResult(res)
      if (res?.ok) toast.success('材料校验通过')
      else toast.warning('材料校验未通过，请按提示补全')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // 开始最终提交
  const startFinalize = async () => {
    try {
      if (!canFinalize.ok) {
        toast.warning(canFinalize.message)
        return
      }
      const draft = await ensureDraft()
      const res = await validateMutation.mutateAsync(draft.id)
      setValidateResult(res)
      if (!res?.ok) {
        toast.warning('材料未齐全，无法提交')
        return
      }
      setFinalizeSubmissionId(draft.id)
      setFinalizeOpen(true)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // 确认最终提交
  const confirmFinalize = async () => {
    try {
      if (!finalizeSubmissionId) return
      if (!canFinalize.ok) {
        toast.warning(canFinalize.message)
        return
      }
      await finalizeMutation.mutateAsync(finalizeSubmissionId)
      setFinalizeOpen(false)
      setFinalizeSubmissionId(null)
      toast.success('已最终提交，期待你的 C 位出道！')
      await queryClient.invalidateQueries({ queryKey: ['submission', 'mine', CONTEST_ID] })
      navigate('/my-project')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const syncProjectInfo = async () => {
    if (!token) {
      toast.warning('请先登录后同步作品信息')
      return
    }
    if (!canUseSubmission.ok) {
      toast.warning(canUseSubmission.message)
      return
    }
    try {
      await syncProjectMutation.mutateAsync()
    } catch {
      // 错误由 onError 提示
    }
  }

  const submitImageRef = async () => {
    if (!token) {
      toast.warning('请先登录后提交镜像')
      return
    }
    if (!canDeploy.ok) {
      toast.warning(canDeploy.message)
      return
    }
    try {
      await submitImageMutation.mutateAsync()
    } catch {
      // 错误由 onError 提示
    }
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              提交作品
            </h1>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
              <span>鸡王争霸赛 · 作品材料提交</span>
              {submission?.status && <StatusBadge status={submission.status} />}
              {submission?.updated_at && (
                <span className="text-xs text-slate-500">
                  最近更新：{formatDateTime(submission.updated_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!token ? (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all"
              >
                登录后提交
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!isEditable || saving || mineQuery.isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存草稿
                </button>
                <button
                  type="button"
                  onClick={runValidate}
                  disabled={!isEditable || validating || mineQuery.isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  材料检查
                </button>
                <button
                  type="button"
                  onClick={startFinalize}
                  disabled={!isEditable || finalizing || mineQuery.isLoading || !canFinalize.ok}
                  className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  最终提交
                </button>
              </>
            )}
          </div>
        </div>

        {/* 提示卡片 */}
        {!token && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">需要登录</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">登录后可保存草稿、上传附件并最终提交。</p>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all"
              >
                去登录
              </Link>
            </div>
          </div>
        )}

        {token && !canUseSubmission.ok && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">需要报名记录</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{canUseSubmission.message}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => openRegistrationModal()}
                disabled={regLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
              >
                关联/完善报名信息
              </button>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                当前报名状态：{registrationStatus || 'unknown'}
              </span>
            </div>
          </div>
        )}

        {submission?.status && !isEditable && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">当前不可编辑</h3>
            <p className="text-slate-600 dark:text-slate-400">
              作品已提交或已通过审核后不可修改。如需调整请联系管理员。
            </p>
          </div>
        )}

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 右侧操作区 */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* 6. 镜像提交与部署 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">6) 镜像提交与部署</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  仅支持 ghcr.io / docker.io，必须使用 digest 形式（@sha256:）
                </p>
              </div>
              <div className="p-6 space-y-4">
                {!token && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    请先登录后提交镜像与查看部署状态
                  </div>
                )}
                {token && registrationStatus !== 'approved' && (
                  <div className="text-sm text-amber-600 dark:text-amber-400">
                    报名审核通过后才可提交镜像部署
                  </div>
                )}

                {token && projectQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载作品信息中...
                  </div>
                )}

                {token && !projectQuery.isLoading && projectError && (
                  <div className="text-sm text-amber-600 dark:text-amber-400">{projectError}</div>
                )}

                {token && !projectQuery.isLoading && !projectError && (
                  <>
                    {project ? (
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                          作品ID：{project.id}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
                          作品状态：{PROJECT_STATUS_LABELS[project.status] || '未知'}
                        </span>
                        {project.current_submission_id && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                            线上提交：{project.current_submission_id}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          当前还没有作品信息，先同步作品信息后再提交镜像。
                        </div>
                        <button
                          type="button"
                          onClick={syncProjectInfo}
                          disabled={syncingProject}
                          className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {syncingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          创建作品信息
                        </button>
                      </div>
                    )}

                    {project && (
                      <>
                        <div className="space-y-2">
                          <label htmlFor="image_ref" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            镜像引用（必填）
                          </label>
                          <input
                            id="image_ref"
                            value={imageRef}
                            onChange={(e) => setImageRef(e.target.value)}
                            placeholder="ghcr.io/owner/repo@sha256:..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          {!imageRefCheck.ok && imageRefCheck.message && (
                            <p className="text-sm text-amber-600 dark:text-amber-400">{imageRefCheck.message}</p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            示例：ghcr.io/xxx/yyy@sha256:xxxxxxxx（必须是 digest，禁止仅 tag）
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={syncProjectInfo}
                            disabled={syncingProject}
                            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {syncingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            同步作品信息
                          </button>
                          <button
                            type="button"
                            onClick={submitImageRef}
                            disabled={submittingImage || !canDeploy.ok}
                            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {submittingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            提交镜像
                          </button>
                          {project?.id && (
                            <Link
                              to={`/projects/${project.id}/access`}
                              className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              查看访问页
                            </Link>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">部署状态</span>
                            {latestProjectSubmission?.status ? (
                              <DeployStatusBadge status={latestProjectSubmission.status} />
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">暂无记录</span>
                            )}
                          </div>
                          {projectSubmissionError && (
                            <div className="text-sm text-amber-600 dark:text-amber-400">{projectSubmissionError}</div>
                          )}
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <div>最近提交时间：{formatDateTime(latestProjectSubmission?.submitted_at)}</div>
                            {latestProjectSubmission?.status_message && (
                              <div>状态说明：{latestProjectSubmission.status_message}</div>
                            )}
                            {latestProjectSubmission?.error_code && (
                              <div>错误码：{latestProjectSubmission.error_code}</div>
                            )}
                          </div>
                          {projectAccessError && (
                            <div className="text-sm text-amber-600 dark:text-amber-400">{projectAccessError}</div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {projectAccessQuery.data?.domain ? (
                              <a
                                href={buildAccessUrl(projectAccessQuery.data.domain)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-9 px-3 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                打开作品
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">暂无访问链接</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                projectSubmissionsQuery.refetch()
                                projectAccessQuery.refetch()
                              }}
                              disabled={projectSubmissionsQuery.isFetching || projectAccessQuery.isFetching}
                              className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-9 px-3 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                              {projectSubmissionsQuery.isFetching || projectAccessQuery.isFetching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                '刷新状态'
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 材料完整性检查 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden lg:sticky lg:top-24">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">材料完整性</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  提交前请确保必填材料齐全（演示视频可选）
                </p>
              </div>
              <div className="p-6 space-y-4">
                <MaterialItem ok={localChecklist.titleOk} title="作品标题" desc="至少 2 个字符" />
                <MaterialItem ok={localChecklist.repoOk} title="项目源码仓库" desc="GitHub/Gitee HTTPS URL" />
                <MaterialItem ok={localChecklist.demoOk} title="演示视频（可选）" desc="MP4/AVI，3-5 分钟，≤1GB" />
                <MaterialItem ok={localChecklist.docOk} title="项目文档" desc="Markdown 文本（最终提交必填）" />
                <MaterialItem ok={localChecklist.apiOk} title="API 调用证明" desc="截图 + 日志（均需上传完成）" />
                <MaterialItem ok={localChecklist.regOk} title="参赛报名表" desc="存在报名且未撤回" />

                <div className="pt-2">
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      localChecklist.allOk
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {localChecklist.allOk ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-300">本地检查：已齐全</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                          <span className="text-amber-700 dark:text-amber-300">本地检查：未齐全</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      建议点击「材料检查」触发服务端校验，避免遗漏。
                    </p>
                  </div>
                </div>

                {validateResult && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">服务端校验结果</span>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          validateResult?.ok
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        )}
                      >
                        {validateResult?.ok ? '通过' : '未通过'}
                      </span>
                    </div>
                    {Array.isArray(validateResult?.errors) && validateResult.errors.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {validateResult.errors.slice(0, 6).map((e, idx) => (
                          <div key={`${e.field || 'field'}_${idx}`} className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">{e.field}</span>：{e.message}
                          </div>
                        ))}
                        {validateResult.errors.length > 6 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            还有 {validateResult.errors.length - 6} 项未展示
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">未发现问题</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={!token || !isEditable || saving}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    保存草稿
                  </button>
                  <button
                    type="button"
                    onClick={runValidate}
                    disabled={!token || !isEditable || validating}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    材料检查（服务端）
                  </button>
                  <button
                    type="button"
                    onClick={startFinalize}
                    disabled={!token || !isEditable || finalizing}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    最终提交（需确认）
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 左侧表单 */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* 1. 项目源码 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">1) 项目源码（必填）</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  请输入公开的 GitHub/Gitee 仓库地址（HTTPS）
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      作品标题 *
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      placeholder="例如：鸡王智能选手系统"
                      disabled={!isEditable}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="demo_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      在线演示地址（可选）
                    </label>
                    <input
                      id="demo_url"
                      type="text"
                      value={form.demo_url}
                      onChange={(e) => setForm((s) => ({ ...s, demo_url: e.target.value }))}
                      placeholder="https://..."
                      disabled={!isEditable}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="repo_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    仓库地址（GitHub/Gitee）*
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="repo_url"
                        type="text"
                        value={form.repo_url}
                        onChange={(e) => setForm((s) => ({ ...s, repo_url: e.target.value }))}
                        placeholder="https://github.com/username/repo"
                        disabled={!isEditable}
                        className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Github className="w-4 h-4" />
                      </div>
                    </div>
                    {validateRepoUrl(form.repo_url).ok && (
                      <a
                        href={form.repo_url.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        打开
                      </a>
                    )}
                  </div>
                  {!validateRepoUrl(form.repo_url).ok && form.repo_url?.trim() && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{validateRepoUrl(form.repo_url).message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    作品简介（可选）
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="用几句话说明亮点、技术栈、解决的问题等"
                    disabled={!isEditable}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="cover_image_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      封面图链接（可选）
                    </label>
                    <input
                      id="cover_image_url"
                      type="text"
                      value={form.cover_image_url}
                      onChange={(e) => setForm((s) => ({ ...s, cover_image_url: e.target.value }))}
                      placeholder="https://... 或 //..."
                      disabled={!isEditable}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      建议 16:9 比例，支持图床/仓库原图链接
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="readme_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      README 链接（可选）
                    </label>
                    <input
                      id="readme_url"
                      type="text"
                      value={form.readme_url}
                      onChange={(e) => setForm((s) => ({ ...s, readme_url: e.target.value }))}
                      placeholder="https://raw.githubusercontent.com/.../README.md"
                      disabled={!isEditable}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      用于作品展示页的 README 入口
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="screenshot_urls" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    截图链接（可选）
                  </label>
                  <textarea
                    id="screenshot_urls"
                    value={form.screenshot_urls_text}
                    onChange={(e) => setForm((s) => ({ ...s, screenshot_urls_text: e.target.value }))}
                    placeholder="每行一个链接，例如：https://.../1.png"
                    disabled={!isEditable}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    每行一个链接，支持多张截图
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 演示视频 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">2) 演示视频（可选）</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  MP4/AVI，3-5 分钟，最大 1GB
                </p>
              </div>
              <div className="p-6">
                <UploadRow
                  disabled={!token || !canUseSubmission.ok || !isEditable}
                  icon={Video}
                  title="演示视频"
                  hint="建议包含：功能演示、核心流程、关键技术点"
                  accept={ACCEPTS[ATTACHMENT_TYPES.DEMO_VIDEO]}
                  existing={demoVideo}
                  uploading={uploadState[ATTACHMENT_TYPES.DEMO_VIDEO].uploading}
                  progress={uploadState[ATTACHMENT_TYPES.DEMO_VIDEO].progress}
                  onPick={(file) => uploadAttachment(ATTACHMENT_TYPES.DEMO_VIDEO, file)}
                  onRemove={() => removeAttachment(demoVideo)}
                  inputId="upload_demo_video"
                />
              </div>
            </div>

            {/* 3. 项目文档 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">3) 项目文档（必填）</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Markdown 文本，建议包含安装步骤、使用说明、技术架构与 API 使用方式
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDocMode('edit')}
                    disabled={!isEditable}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-9 px-3 transition-colors',
                      docMode === 'edit'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                        : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocMode('preview')}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-9 px-3 transition-colors',
                      docMode === 'preview'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                        : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    预览
                  </button>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    {String(form.project_doc_md || '').trim().length} 字符
                  </span>
                </div>

                {docMode === 'edit' ? (
                  <textarea
                    value={form.project_doc_md}
                    onChange={(e) => setForm((s) => ({ ...s, project_doc_md: e.target.value }))}
                    placeholder={`# 项目名称

## 安装
\`\`\`bash
pnpm i
\`\`\`

## 使用说明
- ...

## 技术架构
- ...

## API 调用说明
- ...`}
                    disabled={!isEditable}
                    rows={14}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm"
                  />
                ) : (
                  <MarkdownPreview value={form.project_doc_md} />
                )}
              </div>
            </div>

            {/* 4. API 调用证明 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">4) API 调用证明（必填）</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  上传截图（证明调用）+ 日志文件（证明调用过程）
                </p>
              </div>
              <div className="p-6 space-y-4">
                <UploadRow
                  disabled={!token || !canUseSubmission.ok || !isEditable}
                  icon={ImageIcon}
                  title="API 调用截图"
                  hint="PNG/JPG/WebP，最大 10MB"
                  accept={ACCEPTS[ATTACHMENT_TYPES.API_SCREENSHOT]}
                  existing={apiScreenshot}
                  uploading={uploadState[ATTACHMENT_TYPES.API_SCREENSHOT].uploading}
                  progress={uploadState[ATTACHMENT_TYPES.API_SCREENSHOT].progress}
                  onPick={(file) => uploadAttachment(ATTACHMENT_TYPES.API_SCREENSHOT, file)}
                  onRemove={() => removeAttachment(apiScreenshot)}
                  inputId="upload_api_screenshot"
                />
                <UploadRow
                  disabled={!token || !canUseSubmission.ok || !isEditable}
                  icon={FileText}
                  title="API 调用日志"
                  hint="TXT/LOG/JSON/ZIP/GZ，最大 50MB"
                  accept={ACCEPTS[ATTACHMENT_TYPES.API_LOG]}
                  existing={apiLog}
                  uploading={uploadState[ATTACHMENT_TYPES.API_LOG].uploading}
                  progress={uploadState[ATTACHMENT_TYPES.API_LOG].progress}
                  onPick={(file) => uploadAttachment(ATTACHMENT_TYPES.API_LOG, file)}
                  onRemove={() => removeAttachment(apiLog)}
                  inputId="upload_api_log"
                />
              </div>
            </div>

            {/* 5. 参赛报名表 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">5) 参赛报名表（必填）</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  需关联已有报名记录（系统将自动关联你的报名）
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                        报名状态：{registrationStatus || 'unknown'}
                      </span>
                      {registration?.id && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
                          报名ID：{registration.id}
                        </span>
                      )}
                      {submission?.registration_id && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          已关联：{submission.registration_id}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                      未报名或报名已撤回时无法提交作品；报名未审核通过前不可最终提交与部署。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openRegistrationModal()}
                      disabled={!token || regLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold h-10 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      关联/完善报名
                    </button>
                    <Link
                      to="/my-project"
                      className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-10 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      去参赛者中心
                    </Link>
                  </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* 确认提交弹窗 */}
        <FinalizeDialog
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
          onConfirm={confirmFinalize}
          loading={finalizing}
          submissionId={finalizeSubmissionId}
        />

        {/* 报名弹窗 */}
        <RegistrationModal contestId={CONTEST_ID} />
      </div>
    </div>
  )
}
