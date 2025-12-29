import { useQuery } from '@tanstack/react-query'
import { contestApi } from '@/services'

const DEFAULT_CONTEST_ID = Number(import.meta.env.VITE_CONTEST_ID ?? 1)

/**
 * 获取当前比赛 ID（失败时使用默认值）
 */
export function useContestId() {
  const query = useQuery({
    queryKey: ['contest', 'current'],
    queryFn: async () => {
      try {
        const res = await contestApi.getCurrent({ include_ended: true })
        return res?.id ?? DEFAULT_CONTEST_ID
      } catch (error) {
        console.warn('获取当前比赛失败，使用默认比赛ID', error)
        return DEFAULT_CONTEST_ID
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  return {
    contestId: query.data ?? DEFAULT_CONTEST_ID,
    contestQuery: query,
  }
}
