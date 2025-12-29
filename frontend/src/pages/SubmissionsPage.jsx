/**
 * 作品展示页
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Github, Eye, Search, User2, ThumbsUp, Bookmark, FileText, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { contestApi, projectApi, submissionApi, voteApi } from '../services'
import { useAuthStore } from '../stores/authStore'
import { useContestId } from '@/hooks/useContestId'

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
  if (url.startsWith('/')) return url
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
  const { contestId } = useContestId()
  const [contest, setContest] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actioning, setActioning] = useState({})
  const [submissions, setSubmissions] = useState([])
  const [myVoteIds, setMyVoteIds] = useState([])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await projectApi.list({ contest_id: contestId })
      setProjects(res?.items || [])
    } catch (err) {
      setError(err?.response?.data?.detail || '加载作品失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [contestId])

  useEffect(() => {
    let active = true
    const loadContest = async () => {
      try {
        const data = await contestApi.get(contestId)
        if (active) {
          setContest(data)
        }
      } catch (err) {
        if (active) {
          setContest(null)
        }
      }
    }
    if (contestId) {
      loadContest()
    }
    return () => {
      active = false
    }
  }, [contestId])

  useEffect(() => {
    let active = true
    const loadSubmissions = async () => {
      if (!contestId) return
      try {
        const res = await submissionApi.list({ contest_id: contestId, page: 1, page_size: 100 })
        if (active) {
          setSubmissions(res?.items || [])
        }
      } catch (err) {
        if (active) {
          setSubmissions([])
        }
      }
    }
    loadSubmissions()
    return () => {
      active = false
    }
  }, [contestId])

  useEffect(() => {
    let active = true
    const loadMyVotes = async () => {
      if (!user) {
        if (active) {
          setMyVoteIds([])
        }
        return
      }
      try {
        const res = await voteApi.getMyVotes()
        if (active) {
          setMyVoteIds((res?.items || []).map((item) => item.submission_id))
        }
      } catch (err) {
        if (active) {
          setMyVoteIds([])
        }
      }
    }
    loadMyVotes()
    return () => {
      active = false
    }
  }, [user])

  const canVote = contest?.phase === 'voting'
  const myVoteSet = useMemo(() => new Set(myVoteIds), [myVoteIds])
  const submissionByUser = useMemo(() => {
    const map = new Map()
    submissions.forEach((item) => {
      if (!item?.user_id) return
      if (!map.has(item.user_id)) {
        map.set(item.user_id, item)
      }
    })
    return map
  }, [submissions])

  const updateSubmissionVote = (submissionId, data) => {
    setSubmissions((prev) =>
      prev.map((item) => {
        if (item.id !== submissionId) return item
        return {
          ...item,
          vote_count: data?.vote_count ?? item.vote_count ?? 0,
        }
      })
    )
  }

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

  const toggleVote = async (project, submission) => {
    if (!submission) {
      toast.warning('暂无可投票作品')
      return
    }
    if (!ensureLogin()) return
    if (!canVote) {
      toast.warning('当前不在投票期')
      return
    }
    if (submission.user_id === user?.id) {
      toast.warning('不能给自己的作品投票')
      return
    }
    if (actioning[project.id]?.vote) return
    setActioningFlag(project.id, 'vote', true)
    const alreadyVoted = myVoteSet.has(submission.id)
    try {
      const res = alreadyVoted
        ? await voteApi.cancel(submission.id)
        : await voteApi.vote(submission.id)
      updateSubmissionVote(submission.id, res)
      setMyVoteIds((prev) => {
        const next = new Set(prev)
        if (res?.voted) {
          next.add(submission.id)
        } else {
          next.delete(submission.id)
        }
        return Array.from(next)
      })
    } catch (err) {
      toast.error(err?.response?.data?.detail || (alreadyVoted ? '取消投票失败' : '投票失败'))
    } finally {
      setActioningFlag(project.id, 'vote', false)
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
              const submission = submissionByUser.get(project.user_id)
              const voted = submission ? myVoteSet.has(submission.id) : false
              const isOwner = submission?.user_id === user?.id
              const voteDisabledReason = !submission
                ? '暂无可投票作品'
                : !canVote
                  ? '当前不在投票期'
                  : isOwner
                    ? '不能给自己的作品投票'
                    : null
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
                    <button
                      type="button"
                      onClick={() => toggleVote(project, submission)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition',
                        voted
                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40',
                        (voteDisabledReason || actioning[project.id]?.vote) && 'opacity-60 cursor-not-allowed'
                      )}
                      title={voteDisabledReason || (voted ? '取消投票' : '投票')}
                      disabled={Boolean(voteDisabledReason) || actioning[project.id]?.vote}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{voted ? '已投票' : '投票'}</span>
                      <span>{submission?.vote_count ?? 0}</span>
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
