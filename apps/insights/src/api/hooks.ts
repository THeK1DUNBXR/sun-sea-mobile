import { useQuery } from '@tanstack/react-query';

import { fetchAgentsLive, fetchOverview, fetchRecentActivity, fetchTrends } from './insightsApi';

export function useOverview(focused = true) {
  return useQuery({
    queryKey: ['insights', 'overview'],
    queryFn: fetchOverview,
    refetchInterval: focused ? 60_000 : false,
    staleTime: 15_000,
  });
}

export function useTrends(days: number, focused = true) {
  return useQuery({
    queryKey: ['insights', 'trends', days],
    queryFn: () => fetchTrends(days),
    refetchInterval: focused ? 60_000 : false,
    staleTime: 15_000,
  });
}

export function useAgentsLive(focused = true) {
  return useQuery({
    queryKey: ['insights', 'agents-live'],
    queryFn: fetchAgentsLive,
    refetchInterval: focused ? 30_000 : false,
    staleTime: 10_000,
  });
}

export function useRecentActivity(limit = 30, focused = true) {
  return useQuery({
    queryKey: ['insights', 'recent-activity', limit],
    queryFn: () => fetchRecentActivity(limit),
    refetchInterval: focused ? 60_000 : false,
    staleTime: 15_000,
  });
}
