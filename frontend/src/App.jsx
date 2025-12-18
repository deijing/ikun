import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import SubmissionsPage from './pages/SubmissionsPage'
import RankingPage from './pages/RankingPage'
import ParticipantsPage from './pages/ParticipantsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SubmitPage from './pages/SubmitPage'
import AdminReviewPage from './pages/AdminReviewPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ActivityManagePage from './pages/ActivityManagePage'
import ReviewCenterPage from './pages/ReviewCenterPage'
import ContestantCenterPage from './pages/ContestantCenterPage'
import AchievementsPage from './pages/AchievementsPage'
import ActivityCenterPage from './pages/ActivityCenterPage'
import PredictionPage from './pages/PredictionPage'
import MyBetsPage from './pages/MyBetsPage'
import { useAuthStore } from './stores/authStore'

function App() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  // 自动刷新用户信息：当已登录但缺少 role 字段时
  useEffect(() => {
    if (token && user && !user.role) {
      refreshUser()
    }
  }, [token, user, refreshUser])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="activity" element={<ActivityCenterPage />} />
          <Route path="prediction/:id" element={<PredictionPage />} />
          <Route path="my-bets" element={<MyBetsPage />} />
          <Route path="my-project" element={<ContestantCenterPage />} />
          <Route path="admin/review" element={<AdminReviewPage />} />
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/activity" element={<ActivityManagePage />} />
          <Route path="review-center" element={<ReviewCenterPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
