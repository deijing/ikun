import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Plus, Trash2, GripVertical, Check, Target } from 'lucide-react'

/**
 * 解析 checklist 格式的正则
 */
const CHECKLINE_RE = /^\s*[-*+]\s+\[( |x|X)\]\s*(.*)$/
const BULLET_RE = /^\s*[-*+]\s+(.*)$/

/**
 * 生成唯一 ID
 */
function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 解析计划文本为任务数组
 */
function parsePlan(value) {
  const lines = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  const tasks = []
  for (const line of lines) {
    if (!line.trim()) continue

    // 优先匹配 checklist 格式: - [ ] xxx 或 - [x] xxx
    const checkMatch = line.match(CHECKLINE_RE)
    if (checkMatch) {
      const done = checkMatch[1].toLowerCase() === 'x'
      const text = (checkMatch[2] || '').trim()
      if (text) {
        tasks.push({ id: makeId(), text, done })
      }
      continue
    }

    // 匹配普通列表项: - xxx
    const bulletMatch = line.match(BULLET_RE)
    if (bulletMatch) {
      const text = (bulletMatch[1] || '').trim()
      if (text) {
        tasks.push({ id: makeId(), text, done: false })
      }
      continue
    }

    // 普通文本行也作为任务
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      tasks.push({ id: makeId(), text: trimmed, done: false })
    }
  }

  return tasks
}

/**
 * 序列化任务数组为文本
 */
function serializePlan(tasks) {
  return (tasks || [])
    .filter((t) => t?.text?.trim())
    .map((t) => `- [${t.done ? 'x' : ' '}] ${t.text.trim()}`)
    .join('\n')
}

/**
 * 数组重排序
 */
function reorder(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) return list
  const next = [...list]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

/**
 * 实现计划编辑器 - 滴答清单风格
 *
 * @param {Object} props
 * @param {string} props.value - 计划文本（checklist 格式）
 * @param {Function} props.onChange - 变更回调
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.className - 额外样式类
 */
export default function PlanEditor({ value = '', onChange, className, disabled = false }) {
  const lastEmittedRef = useRef('')
  const inputRefs = useRef(new Map())
  const pendingFocusIdRef = useRef(null)

  const [tasks, setTasks] = useState(() => parsePlan(value))
  const [newText, setNewText] = useState('')
  const [draggingId, setDraggingId] = useState(null)

  // 统计数据
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.done).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }, [tasks])

  // 外部 value 变化时同步（避免覆盖自己刚 emit 的值）
  useEffect(() => {
    const incoming = String(value || '')
    if (incoming === lastEmittedRef.current) return
    setTasks(parsePlan(incoming))
  }, [value])

  // 变更任务 -> emit
  const emit = (nextTasks) => {
    const nextValue = serializePlan(nextTasks)
    lastEmittedRef.current = nextValue
    onChange?.(nextValue)
  }

  const setAndEmit = (updater) => {
    setTasks((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      emit(next)
      return next
    })
  }

  // 处理待聚焦的输入框
  useEffect(() => {
    const id = pendingFocusIdRef.current
    if (!id) return
    pendingFocusIdRef.current = null
    const el = inputRefs.current.get(id)
    if (el) {
      el.focus()
    }
  })

  // 添加任务
  const addTask = (text, insertAfterId = null) => {
    const trimmed = String(text || '').trim()
    const newTask = { id: makeId(), text: trimmed, done: false }

    setAndEmit((prev) => {
      if (!insertAfterId) return [...prev, newTask]
      const idx = prev.findIndex((t) => t.id === insertAfterId)
      if (idx === -1) return [...prev, newTask]
      return [...prev.slice(0, idx + 1), newTask, ...prev.slice(idx + 1)]
    })

    pendingFocusIdRef.current = newTask.id
  }

  // 删除任务
  const removeTask = (id) => {
    setAndEmit((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      const focusId = next[Math.max(0, idx - 1)]?.id || next[idx]?.id || null
      pendingFocusIdRef.current = focusId
      return next
    })
  }

  // 切换完成状态
  const toggleTask = (id) => {
    setAndEmit((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  // 更新任务文本
  const updateTaskText = (id, text) => {
    setAndEmit((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
  }

  // 键盘事件处理
  const onTaskKeyDown = (e, taskId) => {
    if (disabled) return

    // Enter: 在当前任务后插入新任务
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const currentTask = tasks.find((t) => t.id === taskId)
      // 只有当前任务有内容时才允许添加新任务
      if (currentTask?.text?.trim()) {
        addTask('', taskId)
      }
      return
    }

    // Backspace: 如果文本为空，删除当前任务
    if (e.key === 'Backspace') {
      const current = tasks.find((t) => t.id === taskId)
      if (current && !current.text && tasks.length > 1) {
        e.preventDefault()
        removeTask(taskId)
      }
    }
  }

  // 拖拽事件处理
  const onDragStart = (e, id) => {
    if (disabled) return
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const onDragOver = (e) => {
    if (disabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e, overId) => {
    if (disabled) return
    e.preventDefault()
    const fromId = draggingId
    setDraggingId(null)
    if (!fromId || fromId === overId) return

    setAndEmit((prev) => {
      const fromIndex = prev.findIndex((t) => t.id === fromId)
      const toIndex = prev.findIndex((t) => t.id === overId)
      if (fromIndex === -1 || toIndex === -1) return prev
      return reorder(prev, fromIndex, toIndex)
    })

    pendingFocusIdRef.current = fromId
  }

  const onDragEnd = () => setDraggingId(null)

  return (
    <div className={cn('space-y-4', className)}>
      {/* 进度头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground">实现计划</span>
            <span className="text-red-500 ml-1">*</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {stats.completed} / {stats.total} 已完成
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "font-mono",
              stats.percent === 100 && stats.total > 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            {stats.percent}%
          </Badge>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            stats.percent === 100 && stats.total > 0
              ? "bg-green-500"
              : "bg-gradient-to-r from-primary to-primary/80"
          )}
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      {/* 任务列表 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500">还没有任务</p>
            <p className="text-xs text-zinc-400 mt-1">从下方添加第一条计划</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 transition-colors',
                  'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                  draggingId === task.id && 'opacity-50 bg-zinc-100 dark:bg-zinc-800'
                )}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, task.id)}
              >
                {/* 拖拽手柄 - 只有这个元素可以触发拖拽 */}
                <div
                  draggable={!disabled}
                  onDragStart={(e) => onDragStart(e, task.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    disabled && 'hidden'
                  )}
                  title="拖拽排序"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* 勾选框 */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  disabled={disabled}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    task.done
                      ? 'bg-primary border-primary text-white'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-primary',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {task.done && (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  )}
                </button>

                {/* 任务输入框 */}
                <Input
                  disabled={disabled}
                  value={task.text}
                  onChange={(e) => updateTaskText(task.id, e.target.value)}
                  onKeyDown={(e) => onTaskKeyDown(e, task.id)}
                  ref={(el) => {
                    if (el) inputRefs.current.set(task.id, el)
                    else inputRefs.current.delete(task.id)
                  }}
                  className={cn(
                    'flex-1 h-9 border-0 bg-transparent px-0 shadow-none',
                    'focus-visible:ring-0 focus-visible:ring-offset-0',
                    task.done && 'line-through text-zinc-400 dark:text-zinc-500'
                  )}
                  placeholder="输入任务内容…"
                />

                {/* 删除按钮 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removeTask(task.id)}
                  className={cn(
                    'h-8 w-8 rounded-lg shrink-0',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新任务 */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 shrink-0" />
            <Input
              disabled={disabled}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (disabled) return
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newText.trim()) {
                    addTask(newText)
                    setNewText('')
                  }
                }
              }}
              className="flex-1 h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="添加新任务…（回车添加）"
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || !newText.trim()}
              onClick={() => {
                if (newText.trim()) {
                  addTask(newText)
                  setNewText('')
                }
              }}
              className="h-8 px-3 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        提示：按 Enter 快速添加，拖拽排序，点击圆圈标记完成
      </p>
    </div>
  )
}
