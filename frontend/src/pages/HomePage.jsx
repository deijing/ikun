import { useEffect, useState } from 'react'
import HeroSection from '../components/contest/HeroSection'
import IntroSection from '../components/contest/IntroSection'
import PrizesSection from '../components/contest/PrizesSection'
import RulesSection from '../components/contest/RulesSection'
import CTASection from '../components/contest/CTASection'
import LiveFeedSection from '../components/contest/LiveFeedSection'
import HotProjectsCarousel from '../components/contest/HotProjectsCarousel'
import HotBettingSection from '../components/contest/HotBettingSection'
import MarkdownSection from '../components/contest/MarkdownSection'
import ContestantDashboard from '../components/contestant/ContestantDashboard'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import { contestApi } from '../services'
import { useContestId } from '@/hooks/useContestId'

/**
 * 首页 - 活动介绍
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const registration = useRegistrationStore((s) => s.registration)
  const status = useRegistrationStore((s) => s.status)
  const checkStatus = useRegistrationStore((s) => s.checkStatus)
  const { contestId } = useContestId()
  const [contest, setContest] = useState(null)

  useEffect(() => {
    let active = true
    const loadContest = async () => {
      try {
        const data = await contestApi.get(contestId)
        if (active) {
          setContest(data)
        }
      } catch (error) {
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

  // 首次加载时检查报名状态
  useEffect(() => {
    if (user && status === 'unknown') {
      checkStatus(contestId)
    }
  }, [user, status, contestId, checkStatus])

  // 是否显示参赛者仪表盘 - 仅参赛者角色可见
  const isContestant = user?.role === 'contestant'
  const showDashboard = isContestant && registration && status !== 'none' && status !== 'unknown' && status !== 'withdrawn'
  const hasPrizes = Boolean(contest?.prizes_md && contest.prizes_md.trim())
  const hasRules = Boolean(contest?.rules_md && contest.rules_md.trim())
  const hasReviewRules = Boolean(contest?.review_rules_md && contest.review_rules_md.trim())
  const hasFaq = Boolean(contest?.faq_md && contest.faq_md.trim())

  return (
    <>
      <HeroSection />

      {contest?.banner_url && (
        <section className="py-10 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
              <img
                src={contest.banner_url}
                alt="赛事 Banner"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      )}

      {/* 参赛者仪表盘 - 已报名用户显示（优先展示） */}
      {showDashboard && (
        <section className="relative py-12 sm:py-16 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <ContestantDashboard />
          </div>
        </section>
      )}

      {/* 热门项目轮播 - 显示人气榜前几名 */}
      <HotProjectsCarousel contestId={contestId} />

      {/* 热门竞猜 - 显示进行中的竞猜活动 */}
      <HotBettingSection />

      {/* 实时动态 */}
      <LiveFeedSection contestId={contestId} />

      <IntroSection />
      {hasPrizes ? (
        <MarkdownSection title="奖项设置" content={contest?.prizes_md} id="prizes" />
      ) : (
        <PrizesSection />
      )}
      {hasRules || hasReviewRules ? (
        <>
          <MarkdownSection title="赛事规则" content={contest?.rules_md} id="rules" />
          <MarkdownSection title="评审规则" content={contest?.review_rules_md} id="judging" />
        </>
      ) : (
        <RulesSection />
      )}
      {hasFaq && <MarkdownSection title="常见问题" content={contest?.faq_md} id="faq" />}
      <CTASection contestPhase={contest?.phase} />
    </>
  )
}
