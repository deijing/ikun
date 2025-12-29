/**
 * Markdown 内容展示区（简易版）
 */
export default function MarkdownSection({ title, content, id }) {
  const text = String(content || '').trim()
  if (!text) return null

  return (
    <section id={id} className="py-16 bg-white dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{title}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6">
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200 font-mono">
            {text}
          </pre>
        </div>
      </div>
    </section>
  )
}
