/**
 * Live feeds: one named request per ERP endpoint, run a few at a time so a
 * sleepy Railway service and its Postgres pool are not hit with fourteen
 * parallel queries. Every feed reports what happened (rows, time, error) and
 * falls back to its last good response so one failing endpoint never zeroes a
 * whole scene.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, http, unwrap } from '../api/client';

export interface FeedStatus {
  name: string;
  label: string;
  ok: boolean;
  /** Served from the last good response because this run failed. */
  stale: boolean;
  ms: number;
  count: number;
  error: string | null;
  /** When the data shown was actually fetched. */
  at: number | null;
}

export interface FeedDef {
  name: string;
  label: string;
  url: string;
  params?: Record<string, unknown>;
  /** Keys that may hold the row array when the payload is an object. */
  arrayKeys?: string[];
  /** Fetch further pages (`page=2..n`) until this many pages or the server's totalPages. */
  maxPages?: number;
  /** Skip persisting (large or sensitive payloads). Default: cache when under ~1.2 MB. */
  cache?: boolean;
}

export interface FeedResult {
  status: FeedStatus;
  data: unknown;
}

const CACHE_PREFIX = 'insights.feed.';
const CACHE_LIMIT_BYTES = 1_200_000;
const cacheKey = (name: string) => `${CACHE_PREFIX}${name}`;

async function readCache(name: string): Promise<{ at: number; data: unknown } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(name));
    return raw ? (JSON.parse(raw) as { at: number; data: unknown }) : null;
  } catch {
    return null;
  }
}
async function writeCache(name: string, data: unknown, at: number) {
  try {
    const raw = JSON.stringify({ at, data });
    if (raw.length > CACHE_LIMIT_BYTES) return;
    await AsyncStorage.setItem(cacheKey(name), raw);
  } catch {
    /* best effort */
  }
}
export async function clearFeedCache(names: string[]) {
  try {
    await AsyncStorage.multiRemove(names.map(cacheKey));
  } catch {
    /* ignore */
  }
}

/** Rows out of `[]`, `{ data: [] }`, `{ invoices: [] }` and friends. */
export function rows(data: unknown, preferred: string[] = []): Record<string, any>[] {
  if (Array.isArray(data)) return data as Record<string, any>[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of preferred) if (Array.isArray(o[k])) return o[k] as Record<string, any>[];
    for (const v of Object.values(o)) if (Array.isArray(v)) return v as Record<string, any>[];
  }
  return [];
}

const countOf = (data: unknown, keys?: string[]) => {
  if (Array.isArray(data)) return data.length;
  const r = rows(data, keys);
  return r.length || (data && typeof data === 'object' ? 1 : 0);
};

async function fetchFeed(def: FeedDef): Promise<unknown> {
  const first = unwrap<any>(await http.get(def.url, { params: def.params, timeout: 45_000 }));
  if (!def.maxPages || def.maxPages < 2) return first;
  // Paged list: pull the remaining pages and concatenate rows into the same container.
  const totalPages = Number(first?.totalPages ?? first?.meta?.totalPages ?? 1);
  if (!Number.isFinite(totalPages) || totalPages < 2) return first;
  const key = (def.arrayKeys ?? ['data']).find((k) => Array.isArray(first?.[k])) ?? 'data';
  const all: unknown[] = [...(first[key] as unknown[])];
  for (let page = 2; page <= Math.min(totalPages, def.maxPages); page++) {
    const next = unwrap<any>(await http.get(def.url, { params: { ...def.params, page }, timeout: 45_000 }));
    all.push(...rows(next, def.arrayKeys));
  }
  return { ...first, [key]: all };
}

async function runOne(def: FeedDef): Promise<FeedResult> {
  const started = Date.now();
  try {
    const data = await fetchFeed(def);
    const at = Date.now();
    if (def.cache !== false) void writeCache(def.name, data, at);
    return { data, status: { name: def.name, label: def.label, ok: true, stale: false, ms: at - started, count: countOf(data, def.arrayKeys), error: null, at } };
  } catch (e) {
    const err = e as ApiError;
    const message = err.status === 403 ? 'No permission for this data on your ERP account' : err.status === 404 ? 'Endpoint not on this server' : err.message || 'Request failed';
    const cached = await readCache(def.name);
    return {
      data: cached?.data ?? null,
      status: { name: def.name, label: def.label, ok: false, stale: !!cached, ms: Date.now() - started, count: cached ? countOf(cached.data, def.arrayKeys) : 0, error: message, at: cached?.at ?? null },
    };
  }
}

/** Runs feeds with at most `concurrency` in flight, preserving input order in the result map. */
export async function runFeeds(defs: FeedDef[], concurrency = 3, onProgress?: (done: number, total: number) => void): Promise<Map<string, FeedResult>> {
  const out = new Map<string, FeedResult>();
  let index = 0;
  let done = 0;
  const worker = async () => {
    while (index < defs.length) {
      const def = defs[index++];
      const res = await runOne(def);
      out.set(def.name, res);
      done += 1;
      onProgress?.(done, defs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, defs.length) }, worker));
  return out;
}
