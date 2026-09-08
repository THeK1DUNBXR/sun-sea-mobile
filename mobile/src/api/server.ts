/**
 * Server connection: URL normalisation, reachability probe, and the detected
 * integration mode.
 *
 *  - "mobile": the Sun Sea ERP has the mobile extension installed
 *              (`/api/mobile/*` — routes, visits, sync, receipts, OCR).
 *  - "direct": a plain Sun Sea ERP (e.g. the Railway deployment) — the app
 *              talks to the ERP's own endpoints: customers, invoices, products,
 *              vouchers and sales orders. Routes, visits and follow-ups stay on
 *              the device.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import { getApiUrl, setApiUrl } from './client';

export type ServerMode = 'mobile' | 'direct';

export interface ServerInfo {
  apiUrl: string;
  host: string;
  reachable: boolean;
  mode: ServerMode | null;
  version?: string | null;
  environment?: string | null;
  latencyMs?: number | null;
  wokeFromSleep?: boolean;
  checkedAt: number;
  error?: string | null;
}

/** Accepts what people paste — a Railway domain, a URL with or without /api — and returns `https://host/api`. */
export function normalizeServerUrl(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';
  s = s.replace(/\s+/g, '');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  // Railway and most hosts are https; plain http only makes sense for LAN IPs / localhost.
  if (/^http:\/\/(?!(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i.test(s)) s = s.replace(/^http:/i, 'https:');
  s = s.replace(/\/+$/, '');
  s = s.replace(/\/api(\/.*)?$/i, '/api');
  if (!/\/api$/i.test(s)) s = `${s}/api`;
  return s;
}

export const hostOf = (apiUrl: string) => apiUrl.replace(/^https?:\/\//i, '').replace(/\/api$/i, '');
export const isRailway = (apiUrl: string) => /railway\.app/i.test(apiUrl);

async function getOnce(url: string, timeout: number) {
  const started = Date.now();
  const res = await axios.get(url, { timeout, validateStatus: () => true, headers: { Accept: 'application/json' } });
  return { status: res.status, data: res.data as Record<string, unknown> | undefined, ms: Date.now() - started };
}

/**
 * Probes the server. Never throws: the result carries `reachable`/`error`.
 * A Railway service that fell asleep answers the first request slowly or with
 * 502/503, so the root probe is retried a few times with a longer timeout.
 */
export async function probeServer(rawUrl: string): Promise<ServerInfo> {
  const apiUrl = normalizeServerUrl(rawUrl);
  const info: ServerInfo = { apiUrl, host: hostOf(apiUrl), reachable: false, mode: null, checkedAt: Date.now() };
  if (!apiUrl) return { ...info, error: 'Enter the server address.' };
  const root = apiUrl.replace(/\/api$/i, '/');

  let attempts = 0;
  let last: { status: number; data?: Record<string, unknown>; ms: number } | null = null;
  let lastErr: string | null = null;
  while (attempts < 4) {
    attempts += 1;
    try {
      last = await getOnce(root, attempts === 1 ? 12000 : 25000);
      if (last.status < 500) break;
      lastErr = `Server answered ${last.status} — waking up?`;
    } catch (e) {
      lastErr = (e as Error).message?.includes('timeout') ? 'No answer — the server may be asleep or unreachable.' : (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 2500 * attempts));
  }
  if (!last || last.status >= 500) return { ...info, error: lastErr ?? 'Server unreachable.' };

  info.reachable = true;
  info.latencyMs = last.ms;
  info.wokeFromSleep = attempts > 1;
  const body = last.data ?? {};
  const message = String(body.message ?? '');
  const looksLikeSunSea = /sun\s*sea/i.test(message) || typeof body.version === 'string';
  info.version = typeof body.version === 'string' ? body.version : null;
  info.environment = typeof body.environment === 'string' ? body.environment : null;
  if (!looksLikeSunSea) info.error = 'Reached a server, but it does not look like the Sun Sea ERP API.';

  // Mobile extension present? Unauthenticated bootstrap → 401 when the module exists, 404 when it does not.
  try {
    const probe = await getOnce(`${apiUrl}/mobile/bootstrap`, 15000);
    info.mode = probe.status === 404 ? 'direct' : 'mobile';
  } catch {
    info.mode = 'direct';
  }
  return info;
}

export async function saveServer(info: ServerInfo) {
  await setApiUrl(info.apiUrl);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.serverMode, info.mode ?? 'direct'],
    [STORAGE_KEYS.serverInfo, JSON.stringify(info)],
  ]);
}

export async function getServerMode(): Promise<ServerMode> {
  try {
    const m = await AsyncStorage.getItem(STORAGE_KEYS.serverMode);
    return m === 'mobile' ? 'mobile' : 'direct';
  } catch {
    return 'direct';
  }
}

export async function getServerInfo(): Promise<ServerInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.serverInfo);
    if (raw) return JSON.parse(raw) as ServerInfo;
  } catch {
    /* ignore */
  }
  const apiUrl = await getApiUrl();
  return { apiUrl, host: hostOf(apiUrl), reachable: false, mode: null, checkedAt: 0 };
}
