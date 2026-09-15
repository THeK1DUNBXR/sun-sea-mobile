// A custom axios adapter that answers every request from the seeded demo
// dataset instead of the network, so "Explore demo data" never depends on a
// live backend (or even connectivity). Installed on a per-request basis by
// api/client.ts's interceptor whenever demo mode is active — see
// demoMode.ts. Matches on the same relative `config.url` the api/*.ts
// functions request (baseURL isn't joined until after the adapter runs), so
// this stays a thin routing table rather than a second copy of the API layer.

import type { AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { demoActivity, demoLiveAgents, demoMe, demoOverview, demoTrends } from './fixtures';

// A believable but short delay — long enough that a refresh/pull-to-refresh
// still feels like it did something, short enough not to make the demo feel
// slow.
const DEMO_LATENCY_MS = 350;

function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<{ success: true; data: T }> {
  return {
    data: { success: true, data },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
}

function notFound(config: InternalAxiosRequestConfig): Promise<never> {
  const error: any = new Error(`Demo mode: no fixture for ${config.method?.toUpperCase()} ${config.url}`);
  error.config = config;
  error.response = {
    status: 404,
    statusText: 'Not Found',
    data: { success: false, message: 'Not available in the demo.' },
    headers: {} as AxiosHeaders,
    config,
  };
  return Promise.reject(error);
}

export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));

  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0];

  if (method === 'get' && url === '/auth/me') return ok(config, demoMe);
  if (method === 'get' && url === '/insights/overview') return ok(config, demoOverview);
  if (method === 'get' && url === '/insights/trends') {
    const days = Number(config.params?.days) || 30;
    return ok(config, demoTrends(days));
  }
  if (method === 'get' && url === '/insights/agents/live') return ok(config, demoLiveAgents);
  if (method === 'get' && url === '/insights/recent-activity') {
    const limit = Number(config.params?.limit) || 30;
    return ok(config, demoActivity(limit));
  }

  return notFound(config);
}
