/**
 * 作品展示页
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Github, Eye, Search, User2, ThumbsUp, Bookmark, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { projectApi } from '../services'
import { useAuthStore } from '../stores/authStore'

const CONTEST_ID = 1

const STATUS_CONFIG = {
  online: { label: '已上线', variant: 'success' },
  submitted: { label: '提交中', variant: 'warning' },
  draft: { label: '草稿', variant: 'secondary' },
  offline: { label: '已下线', variant: 'secondary' },
}

function normalizeUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('//')) return url
  return `https://${url}`
}

function resolveCoverUrl(project) {
  if (project?.cover_image_url) return project.cover_image_url
  const screenshots = project?.screenshot_urls || []
  return screenshots.length > 0 ? screenshots[0] : ''
}

export default function SubmissionsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actioning, setActioning] = useState({})

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await projectApi.list({ contest_id: CONTEST_ID })
      setProjects(res?.items || [])
    } catch (err) {
      setError(err?.response?.data?.detail || '加载作品失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const updateProjectInteraction = (projectId, data) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project
        return {
          ...project,
          like_count: data?.like_count ?? project.like_count ?? 0,
          favorite_count: data?.favorite_count ?? project.favorite_count ?? 0,
          liked: data?.liked ?? project.liked ?? false,
          favorited: data?.favorited ?? project.favorited ?? false,
        }
      })
    )
  }

  const setActioningFlag = (projectId, key, value) => {
    setActioning((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || {}),
        [key]: value,
      },
    }))
  }

  const ensureLogin = () => {
    if (user) return true
    toast.warning('请先登录后再操作')
    navigate('/login')
    return false
  }

  const toggleLike = async (project) => {
    if (!ensureLogin()) return
    if (actioning[project.id]?.like) return
    setActioningFlag(project.id, 'like', true)
    try {
      const res = project.liked
        ? await projectApi.unlike(project.id)
        : await projectApi.like(project.id)
      updateProjectInteraction(project.id, res)
    } catch (err) {
      toast.error(err?.response?.data?.detail || '点赞操作失败')
    } finally {
      setActioningFlag(project.id, 'like', false)
    }
  }

  const toggleFavorite = async (project) => {
    if (!ensureLogin()) return
    if (actioning[project.id]?.favorite) return
    setActioningFlag(project.id, 'favorite', true)
    try {
      const res = project.favorited
        ? await projectApi.unfavorite(project.id)
        : await projectApi.favorite(project.id)
      updateProjectInteraction(project.id, res)
    } catch (err) {
      toast.error(err?.response?.data?.detail || '收藏操作失败')
    } finally {
      setActioningFlag(project.id, 'favorite', false)
    }
  }

  const filteredProjects = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return projects
    return projects.filter((project) => {
      const fields = [
        project.title,
        project.summary,
        project.description,
        project.owner?.display_name,
        project.owner?.username,
      ]
      return fields.some((text) => String(text || '').toLowerCase().includes(keyword))
    })
  }, [projects, searchQuery])

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">作品展示</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">共 {projects.length} 个作品</p>
          </div>
          <div className="w-full sm:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索作品或作者"
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <p className="text-slate-600 dark:text-slate-300">{error}</p>
            <Button
              className="mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              onClick={fetchProjects}
            >
              重试
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">暂无符合条件的作品</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.offline
              const ownerName = project.owner?.display_name || project.owner?.username || '匿名作者'
              const coverUrl = resolveCoverUrl(project)
              return (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                >
                  <div className="mb-4 h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {coverUrl ? (
                      <img
                        src={normalizeUrl(coverUrl)}
                        alt={`${project.title || '作品'}封面`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">暂无封面</span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">{project.title}</h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {project.summary || project.description || '暂无简介'}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <User2 className="w-4 h-4" />
                    <span className="truncate">{ownerName}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    {project.repo_url && (
                      <a
                        href={normalizeUrl(project.repo_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                      >
                        <Github className="w-4 h-4" />
                        开源仓库
                      </a>
                    )}
                    {project.demo_url && (
                      <a
                        href={normalizeUrl(project.demo_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                      >
                        <ExternalLink className="w-4 h-4" />
                        演示链接
                      </a>
                    )}
                    {project.readme_url && (
                      <a
                        href={normalizeUrl(project.readme_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                      >
                        <FileText className="w-4 h-4" />
                        README
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleLike(project)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition',
                        project.liked
                          ? 'border-blue-500/40 text-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/40',
                        actioning[project.id]?.like && 'opacity-60 cursor-not-allowed'
                      )}
                      title={project.liked ? '取消点赞' : '点赞'}
                      disabled={actioning[project.id]?.like}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{project.like_count ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(project)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition',
                        project.favorited
                          ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/40',
                        actioning[project.id]?.favorite && 'opacity-60 cursor-not-allowed'
                      )}
                      title={project.favorited ? '取消收藏' : '收藏'}
                      disabled={actioning[project.id]?.favorite}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{project.favorite_count ?? 0}</span>
                    </button>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Link to={`/projects/${project.id}/access`} className="flex-1">
                      <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                        <Eye className="w-4 h-4 mr-2" />
                        在线访问
                      </Button>
                    </Link>
                    <div className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      project.status === 'online'
                        ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                    )}>
                      ID {project.id}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
