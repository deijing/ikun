import { useMemo, useState } from 'react'
import { ChevronRight, ExternalLink, FolderOpen, Key, CheckCircle2, Check, Copy } from 'lucide-react'
import { useRegistrationStore } from '@/stores/registrationStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TOKEN_URL = 'https://api.ikuncode.cc/console/token'
const TOKEN_NAME = 'ikun-contest'

/**
 * 步骤指示器组件
 */
function StepIndicator({ currentStep, projectChecked, tokenChecked }) {
  const steps = [
    { number: 1, label: '准备项目', completed: projectChecked },
    { number: 2, label: '创建令牌', completed: tokenChecked },
  ]

  return (
    <div className="flex items-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm',
                currentStep >= step.number
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                  : 'bg-card text-muted-foreground border-muted'
              )}
            >
              {step.completed ? <CheckCircle2 className="w-5 h-5" /> : step.number}
            </div>
            <span className={cn(
              'text-sm font-bold tracking-tight',
              currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-4 transition-colors',
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * 报名前的事前准备引导弹窗（两步）
 */
export default function PreparationGuideModal() {
  // Store 状态
  const preparationOpen = useRegistrationStore((s) => s.preparationOpen)
  const step = useRegistrationStore((s) => s.preparationStep)
  const projectChecked = useRegistrationStore((s) => s.preparationProjectChecked)
  const tokenChecked = useRegistrationStore((s) => s.preparationTokenChecked)

  // Store 动作
  const closePreparationGuide = useRegistrationStore((s) => s.closePreparationGuide)
  const setPreparationProjectChecked = useRegistrationStore((s) => s.setPreparationProjectChecked)
  const setPreparationTokenChecked = useRegistrationStore((s) => s.setPreparationTokenChecked)
  const nextPreparationStep = useRegistrationStore((s) => s.nextPreparationStep)
  const prevPreparationStep = useRegistrationStore((s) => s.prevPreparationStep)
  const startRegistrationFromPreparation = useRegistrationStore((s) => s.startRegistrationFromPreparation)

  // 复制状态
  const [copied, setCopied] = useState(false)

  // 当前步骤是否可以继续
  const canProceed = useMemo(() => {
    return step === 1 ? projectChecked : tokenChecked
  }, [step, projectChecked, tokenChecked])

  // 复制令牌名称
  const handleCopyTokenName = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_NAME)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 静默失败
    }
  }

  return (
    <Dialog open={preparationOpen} onOpenChange={(open) => !open && closePreparationGuide()}>
      <DialogContent className="sm:max-w-xl bg-background border-zinc-200 dark:border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">事前准备</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            完成以下 2 个步骤后即可开始报名
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* 步骤指示器 */}
          <StepIndicator
            currentStep={step}
            projectChecked={projectChecked}
            tokenChecked={tokenChecked}
          />

          {/* 步骤内容 */}
          {step === 1 ? (
            <div className="space-y-6">
              {/* 标题 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground mb-1">
                    准备一个合适的项目
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    报名时需要填写项目名称、简介、介绍、实现计划与技术栈，请确保你已准备好参赛项目。
                  </p>
                </div>
              </div>

              {/* 提示列表 */}
              <div className="space-y-3">
                 <h5 className="text-sm font-semibold text-foreground px-1">项目要求：</h5>
                 <ul className="grid gap-2">
                    {[
                        '可以是已完成或正在开发的项目',
                        '确保你能清晰描述项目亮点与下一步计划',
                        '项目需要调用 ikuncode API 接口'
                    ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            {item}
                        </li>
                    ))}
                 </ul>
              </div>

              {/* 确认勾选 */}
              <div 
                className={cn(
                    "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
                    projectChecked 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-card hover:border-primary/50"
                )}
                onClick={() => setPreparationProjectChecked(!projectChecked)}
              >
                <Checkbox
                  id="project-ready"
                  checked={projectChecked}
                  onCheckedChange={setPreparationProjectChecked}
                  className="mt-1"
                />
                <div className="space-y-1 select-none">
                  <Label htmlFor="project-ready" className="cursor-pointer font-semibold block">
                    我已准备好一个合适的项目
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    勾选确认后继续下一步
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 标题 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground mb-1">
                    创建专属令牌
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    请前往令牌控制台创建一个新令牌，名称必须完全一致。
                  </p>
                </div>
              </div>

              {/* 令牌名称 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Token Name
                </div>
                <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 rounded-lg bg-zinc-950 text-zinc-50 font-mono text-sm border border-zinc-800 shadow-inner flex items-center justify-between group">
                    {TOKEN_NAME}
                    <span className="text-zinc-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Required
                    </span>
                    </code>
                    <Button
                    variant={copied ? 'outline' : 'default'}
                    size="default"
                    onClick={handleCopyTokenName}
                    className={cn(
                        'h-[46px] px-5 font-semibold transition-all',
                        copied 
                            ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' 
                            : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900'
                    )}
                    >
                    {copied ? (
                        <>
                        <Check className="w-4 h-4 mr-2" />
                        已复制
                        </>
                    ) : (
                        <>
                        <Copy className="w-4 h-4 mr-2" />
                        复制
                        </>
                    )}
                    </Button>
                </div>
              </div>

              {/* 打开控制台链接 */}
              <div className="flex justify-center">
                  <Button variant="link" asChild className="text-primary font-medium hover:no-underline hover:opacity-80">
                    <a
                    href={TOKEN_URL}
                    target="_blank"
                    rel="noreferrer"
                    >
                    前往令牌控制台创建
                    <ExternalLink className="w-4 h-4 ml-1.5" />
                    </a>
                </Button>
              </div>

              {/* 提示卡片 */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  <strong>注意：</strong>创建令牌后请妥善保存令牌值（sk-xxx），稍后在报名表单中需要填写。
                </p>
              </div>

              {/* 确认勾选 */}
               <div 
                className={cn(
                    "flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all",
                    tokenChecked 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-card hover:border-primary/50"
                )}
                onClick={() => setPreparationTokenChecked(!tokenChecked)}
              >
                <Checkbox
                  id="token-ready"
                  checked={tokenChecked}
                  onCheckedChange={setPreparationTokenChecked}
                  className="mt-1"
                />
                <div className="space-y-1 select-none">
                  <Label htmlFor="token-ready" className="cursor-pointer font-semibold block">
                    我已创建令牌并保存好令牌值
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    勾选确认后开始报名
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/5 border-t border-border flex sm:justify-between items-center gap-3">
          {step === 2 ? (
            <Button variant="ghost" onClick={prevPreparationStep} className="text-muted-foreground hover:text-foreground">
              上一步
            </Button>
          ) : (
             <div /> /* Spacer */
          )}
          
          {step === 1 ? (
            <Button 
                onClick={nextPreparationStep} 
                disabled={!canProceed}
                className="bg-primary text-primary-foreground shadow-md hover:shadow-lg font-bold px-8"
            >
              下一步
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
                onClick={startRegistrationFromPreparation} 
                disabled={!canProceed}
                className="bg-primary text-primary-foreground shadow-md hover:shadow-lg font-bold px-8"
            >
              开始报名
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
