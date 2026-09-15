// Runtime-configurable backend base URL.
//
// The app ships with a default (env var at build time, else the hosted
// Railway API), but an agent (or whoever is testing the app) may need to
// point it at a local/LAN backend without a rebuild. The chosen URL is kept
// in AsyncStorage so it survives app restarts, and mirrored into a small
// in-memory cache (`cachedUrl`) so the axios request interceptor — which
// runs on every single request, including from the background location task
// and the offline queue flush — never has to await a storage read on the hot
// path. Call `hydrateServerUrl()` once at app start (and it's safe to call
// again any time, from any JS context, including a headless one; it's
// idempotent after the first resolve).

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { copy } from '@/copy';

export const SERVER_URL_STORAGE_KEY = 'sunsea.collect.serverUrl';

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const SCHEME_RE = /^[a-z][a-z0-9+\-.]*:\/\//i;

function readEnvDefault(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

const HARDCODED_DEFAULT = 'https://sunseaerp-production.up.railway.app/api';

/** The URL used when nothing has ever been saved: the build-time env var if
 * one was baked in, else the hosted production API. Always fully normalized. */
export const DEFAULT_SERVER_URL = normalizeServerUrl(readEnvDefault() ?? HARDCODED_DEFAULT);

/**
 * Trims the input, infers a scheme when none is given (http for localhost/an
 * IP address, https otherwise — an ERP running on a LAN or an emulator host
 * is almost never behind TLS, while a real domain almost always is), strips
 * trailing slashes, and ensures the path ends in `/api` (the backend mounts
 * every route under that prefix).
 */
export function normalizeServerUrl(input: string): string {
  let value = input.trim();
  if (!value) return value;

  if (!SCHEME_RE.test(value)) {
    const hostPart = value.split(/[/?#]/)[0]?.split(':')[0] ?? '';
    const useHttp = hostPart === 'localhost' || IPV4_RE.test(hostPart);
    value = `${useHttp ? 'http://' : 'https://'}${value}`;
  }

  value = value.replace(/\/+$/, '');
  if (!/\/api$/i.test(value)) {
    value = `${value}/api`;
  }
  return value;
}

/** Human-readable reason the address can't be saved, or `null` when it's fine. */
export function validateServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return copy.server.reasons.empty;

  const normalized = normalizeServerUrl(trimmed);
  const match = /^(https?):\/\/([^/]+)(\/.*)?$/i.exec(normalized);
  if (!match) return copy.server.reasons.invalid;

  const [, , hostAndPort] = match;
  const [host, port] = hostAndPort.split(':');
  if (!host) return copy.server.reasons.invalid;
  if (port !== undefined && (!/^\d{1,5}$/.test(port) || Number(port) > 65535)) {
    return copy.server.reasons.invalidPort;
  }

  const isIp = IPV4_RE.test(host);
  const isLocalhost = host === 'localhost';
  const isDomain = /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host);
  if (!isIp && !isLocalhost && !isDomain) {
    return copy.server.reasons.invalidHost;
  }
  return null;
}

/** Strips the scheme and path for display ("Server: 10.0.2.2:5000"). */
export function getServerHostLabel(url: string): string {
  const withoutScheme = url.replace(SCHEME_RE, '');
  const hostAndPort = withoutScheme.split('/')[0];
  return hostAndPort || url;
}

let cachedUrl: string | null = null;
let hydratePromise: Promise<string> | null = null;

/** Reads AsyncStorage once and populates the in-memory cache. Safe to call
 * repeatedly — from app start, from the request interceptor, and from the
 * headless background-location task and offline-queue flush, which each run
 * in their own JS context and so can't rely on the in-app cache already
 * being warm. Every call after the first resolves immediately from the same
 * in-flight/settled promise. */
export function hydrateServerUrl(): Promise<string> {
  if (cachedUrl !== null) return Promise.resolve(cachedUrl);
  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(SERVER_URL_STORAGE_KEY)
      .then((stored) => {
        cachedUrl = stored && stored.trim() ? stored : DEFAULT_SERVER_URL;
        return cachedUrl;
      })
      .catch(() => {
        cachedUrl = DEFAULT_SERVER_URL;
        return cachedUrl;
      });
  }
  return hydratePromise;
}

/** Synchronous read of the cached URL — safe to call before hydration
 * completes (returns the default until then), for places that render before
 * any request has gone out (e.g. the login link, the Profile row). */
export function getServerUrl(): string {
  return cachedUrl ?? DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  const normalized = normalizeServerUrl(url);
  cachedUrl = normalized;
  hydratePromise = Promise.resolve(normalized);
  try {
    await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, normalized);
  } catch {
    // Best-effort — the in-memory cache is already updated for this session,
    // it just won't survive a restart.
  }
}

export interface ServerTestResult {
  ok: boolean;
  version?: string;
  environment?: string;
  latencyMs: number;
  error?: string;
}

// A bare instance, deliberately not `apiClient`: no auth header, no baseURL,
// no unauthorized-handler wiring — this is a one-off reachability probe
// against whatever URL was just typed in, which is very often not the URL
// currently in effect.
const probeClient = axios.create({ timeout: 8000 });

function describeProbeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED' ? copy.server.errors.timeout : copy.server.errors.offline;
    }
    if (error.response.status >= 500) return copy.server.errors.server;
    return error.message || copy.server.errors.generic;
  }
  if (error instanceof Error) return error.message;
  return copy.server.errors.generic;
}

/** GETs the API root and checks it looks like the Sunsea ERP API. */
export async function testServerConnection(url: string): Promise<ServerTestResult> {
  const startedAt = Date.now();
  try {
    const res = await probeClient.get<{ success?: boolean; message?: string; version?: string; environment?: string }>(
      url,
    );
    const latencyMs = Date.now() - startedAt;
    if (res.data?.success === false) {
      return { ok: false, latencyMs, error: res.data.message || copy.server.test.unexpectedResponse };
    }
    return { ok: true, latencyMs, version: res.data?.version, environment: res.data?.environment };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: describeProbeError(error) };
  }
}
