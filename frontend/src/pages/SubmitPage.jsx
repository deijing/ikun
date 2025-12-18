/**
 * 提交作品页
 *
 * 支持5种必填材料：
 * 1. 项目源码 - GitHub/Gitee URL
 * 2. 演示视频 - MP4/AVI, 3-5分钟
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
import { submissionApi } from '@/services'
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
    project_doc_md: '',
  })

  const initForSubmissionIdRef = useRef(null)
  const createDraftPromiseRef = useRef(null)

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

  const submission = mineQuery.data
  const isEditable = !submission || isEditableStatus(submission.status)

  // 初始化表单数据
  useEffect(() => {
    const id = submission?.id || null
    if (!id) {
      initForSubmissionIdRef.current = null
      return
    }
    if (initForSubmissionIdRef.current === id) return
    initForSubmissionIdRef.current = id
    setForm({
      title: submission?.title || '',
      description: submission?.description || '',
      repo_url: submission?.repo_url || '',
      demo_url: submission?.demo_url || '',
      project_doc_md: submission?.project_doc_md || '',
    })
    setValidateResult(submission?.validation_summary || null)
  }, [submission?.id])

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

  // 本地完整性检查
  const localChecklist = useMemo(() => {
    const trimmedTitle = String(form.title || '').trim()
    const repoOk = validateRepoUrl(form.repo_url).ok
    const docOk = !!String(form.project_doc_md || '').trim()
    const regOk = canUseSubmission.ok && (submission?.registration_id || registration?.id)
    const demoOk = !!demoVideo?.is_uploaded
    const apiOk = !!apiScreenshot?.is_uploaded && !!apiLog?.is_uploaded
    const titleOk = trimmedTitle.length >= 2
    const allOk = repoOk && docOk && regOk && demoOk && apiOk && titleOk

    return { allOk, repoOk, docOk, regOk, demoOk, apiOk, titleOk }
  }, [form.repo_url, form.project_doc_md, form.title, canUseSubmission.ok, submission?.registration_id, registration?.id, demoVideo?.is_uploaded, apiScreenshot?.is_uploaded, apiLog?.is_uploaded])

  const saving = createDraftMutation.isPending || updateDraftMutation.isPending
  const validating = validateMutation.isPending
  const finalizing = finalizeMutation.isPending

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
                  disabled={!isEditable || finalizing || mineQuery.isLoading}
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
          {/* 左侧表单 */}
          <div className="lg:col-span-2 space-y-6">
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
              </div>
            </div>

            {/* 2. 演示视频 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">2) 演示视频（必填）</h2>
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
                      如未报名或报名已撤回，请先完成报名再提交作品。
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

          {/* 右侧材料完整性检查 */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">材料完整性</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  提交前请确保 5 种必填材料齐全
                </p>
              </div>
              <div className="p-6 space-y-4">
                <MaterialItem ok={localChecklist.titleOk} title="作品标题" desc="至少 2 个字符" />
                <MaterialItem ok={localChecklist.repoOk} title="项目源码仓库" desc="GitHub/Gitee HTTPS URL" />
                <MaterialItem ok={localChecklist.demoOk} title="演示视频" desc="MP4/AVI，3-5 分钟，≤1GB" />
                <MaterialItem ok={localChecklist.docOk} title="项目文档" desc="Markdown 文本（最终提交必填）" />
                <MaterialItem ok={localChecklist.apiOk} title="API 调用证明" desc="截图 + 日志（均需上传完成）" />
                <MaterialItem ok={localChecklist.regOk} title="参赛报名表" desc="存在报名且未撤回" />

                <div className="pt-2">
                  <div className={cn(
                    'rounded-xl border p-4',
                    localChecklist.allOk
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                  )}>
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
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        validateResult?.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      )}>
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
