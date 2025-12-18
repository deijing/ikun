/**
 * Umami 统计分析工具
 *
 * 功能：
 * - 自动加载 Umami 脚本
 * - 页面浏览量追踪（自动）
 * - 自定义事件追踪
 * - 用户属性设置
 */

const UMAMI_SCRIPT_URL = import.meta.env.VITE_UMAMI_SCRIPT_URL
const UMAMI_WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID

let initialized = false

/**
 * 初始化 Umami 统计
 * 在应用启动时调用一次
 */
export function initAnalytics() {
  if (initialized) return
  if (!UMAMI_SCRIPT_URL || !UMAMI_WEBSITE_ID) {
    if (import.meta.env.DEV) {
      console.log('[Analytics] Umami 未配置，跳过初始化')
    }
    return
  }

  const script = document.createElement('script')
  script.defer = true
  script.src = `${UMAMI_SCRIPT_URL}/script.js`
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID)

  // 可选配置
  // script.setAttribute('data-auto-track', 'false') // 禁用自动页面追踪
  // script.setAttribute('data-do-not-track', 'true') // 尊重 DNT
  // script.setAttribute('data-domains', 'yourdomain.com') // 限制域名

  document.head.appendChild(script)
  initialized = true

  if (import.meta.env.DEV) {
    console.log('[Analytics] Umami 初始化成功')
  }
}

/**
 * 追踪自定义事件
 * @param {string} eventName - 事件名称
 * @param {object} eventData - 事件数据（可选）
 */
export function trackEvent(eventName, eventData = {}) {
  if (typeof window.umami === 'undefined') {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] 事件(未初始化): ${eventName}`, eventData)
    }
    return
  }

  window.umami.track(eventName, eventData)

  if (import.meta.env.DEV) {
    console.log(`[Analytics] 事件: ${eventName}`, eventData)
  }
}

/**
 * 追踪页面浏览（用于 SPA 手动追踪）
 * @param {string} url - 页面 URL
 * @param {string} referrer - 来源页面（可选）
 */
export function trackPageView(url, referrer) {
  if (typeof window.umami === 'undefined') return

  window.umami.track((props) => ({
    ...props,
    url: url || window.location.pathname,
    referrer: referrer || document.referrer,
  }))
}

/**
 * 设置用户属性（用于用户分群分析）
 * @param {object} properties - 用户属性
 */
export function identifyUser(properties) {
  if (typeof window.umami === 'undefined') return

  // Umami 通过事件数据来关联用户属性
  window.umami.track('identify', properties)
}

// ============ 预定义的业务事件 ============

/**
 * 用户登录事件
 */
export function trackLogin(method = 'linuxdo') {
  trackEvent('user_login', { method })
}

/**
 * 用户注册/报名事件
 */
export function trackRegistration(contestId) {
  trackEvent('contest_registration', { contest_id: contestId })
}

/**
 * 作品提交事件
 */
export function trackSubmission(contestId, submissionId) {
  trackEvent('submission_created', {
    contest_id: contestId,
    submission_id: submissionId
  })
}

/**
 * 投票事件
 */
export function trackVote(submissionId) {
  trackEvent('vote_cast', { submission_id: submissionId })
}

/**
 * 签到事件
 */
export function trackSignin(consecutiveDays) {
  trackEvent('daily_signin', { consecutive_days: consecutiveDays })
}

/**
 * 抽奖事件
 */
export function trackLottery(type, cost, prizeName) {
  trackEvent('lottery_play', {
    type, // 'normal', 'gacha', 'scratch', 'slot'
    cost,
    prize: prizeName
  })
}

/**
 * 积分兑换事件
 */
export function trackExchange(itemId, itemName, cost) {
  trackEvent('points_exchange', {
    item_id: itemId,
    item_name: itemName,
    cost
  })
}

/**
 * 竞猜下注事件
 */
export function trackBet(marketId, optionId, amount) {
  trackEvent('prediction_bet', {
    market_id: marketId,
    option_id: optionId,
    amount
  })
}

/**
 * 应援/打气事件
 */
export function trackCheer(targetUserId) {
  trackEvent('cheer_sent', { target_user_id: targetUserId })
}

/**
 * 成就解锁事件
 */
export function trackAchievement(achievementId, achievementName) {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    achievement_name: achievementName
  })
}

/**
 * 彩蛋兑换事件
 */
export function trackEasterEgg(code) {
  trackEvent('easter_egg_redeemed', { code })
}

export default {
  init: initAnalytics,
  track: trackEvent,
  trackPageView,
  identifyUser,
  trackLogin,
  trackRegistration,
  trackSubmission,
  trackVote,
  trackSignin,
  trackLottery,
  trackExchange,
  trackBet,
  trackCheer,
  trackAchievement,
  trackEasterEgg,
}
