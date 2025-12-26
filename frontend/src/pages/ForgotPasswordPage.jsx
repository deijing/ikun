import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { authApi } from '../services'
import logo from '@/assets/logo.png'

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message) return detail.message
  }
  if (typeof error?.message === 'string' && error.message) return error.message
  return '发送失败，请稍后重试'
}

export default function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim()) {
      toast.warning('请输入邮箱')
      return
    }
    setSubmitting(true)
    try {
      await authApi.forgotPassword({ email: email.trim() })
      setSent(true)
      toast.success('如果邮箱存在，重置链接已发送')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="ikuncode"
            className="w-16 h-16 rounded-full"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          忘记密码
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          请输入注册邮箱，我们会发送重置链接
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="example@domain.com"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-yellow-500 text-slate-900 font-bold hover:bg-yellow-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? '发送中...' : sent ? '已发送' : '发送重置链接'}
          </button>
        </form>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-2 text-center text-sm">
          <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-medium">
            返回登录
          </Link>
          <div className="text-slate-500 dark:text-slate-400">
            没有账号？{' '}
            <Link to="/register" className="text-yellow-500 hover:text-yellow-400 font-medium">
              去注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
