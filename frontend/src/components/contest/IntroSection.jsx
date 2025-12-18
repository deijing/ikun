import { FEATURES } from './constants'

/**
 * 介绍区组件
 */
export default function IntroSection() {
  return (
    <section id="intro" className="py-20 bg-slate-200/50 dark:bg-slate-900/50 border-y border-slate-300 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white sm:text-4xl">
            致各位制作人 (Developers)
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            ikuncode 致力于为开发者提供企业级稳定性、高并发吞吐的大模型 API 服务。
            本次大赛旨在打破"囤 Key 不用"的怪圈，通过"零风险、高回报"的机制，让你的创意落地！
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-yellow-500/50 transition-colors shadow-sm"
              >
                <div className="mb-4 bg-slate-100 dark:bg-slate-900 w-16 h-16 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
