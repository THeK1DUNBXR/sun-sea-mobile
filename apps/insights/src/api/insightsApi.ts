import { apiClient } from './client';
import type {
  ActivityItem,
  ApiResponse,
  LiveAgent,
  LoginResponse,
  MeResponse,
  OverviewResponse,
  TrendPoint,
} from '@/types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
    email,
    password,
  });
  return res.data.data;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');
  return res.data.data;
}

export async function fetchOverview(): Promise<OverviewResponse> {
  const res = await apiClient.get<ApiResponse<OverviewResponse>>('/insights/overview');
  return res.data.data;
}

export async function fetchTrends(days: number): Promise<TrendPoint[]> {
  const res = await apiClient.get<ApiResponse<TrendPoint[]>>('/insights/trends', {
    params: { days },
  });
  return res.data.data ?? [];
}

export async function fetchAgentsLive(): Promise<LiveAgent[]> {
  const res = await apiClient.get<ApiResponse<LiveAgent[]>>('/insights/agents/live');
  return res.data.data ?? [];
}

export async function fetchRecentActivity(limit = 30): Promise<ActivityItem[]> {
  const res = await apiClient.get<ApiResponse<ActivityItem[]>>('/insights/recent-activity', {
    params: { limit },
  });
  return res.data.data ?? [];
}
