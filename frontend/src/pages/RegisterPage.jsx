import { Link } from 'react-router-dom'

/**
 * 注册页
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800">
        <h1 className="text-2xl font-bold text-white text-center mb-6">注册</h1>
        <p className="text-slate-400 text-center mb-8">注册功能开发中...</p>
        <Link
          to="/"
          className="block text-center text-yellow-400 hover:text-yellow-300"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
