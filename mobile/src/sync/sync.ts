/**
 * Sync engine — WatermelonDB `synchronize()` against /api/mobile/sync.
 *
 *  1. upload photos that have no remote URL yet and stamp the URLs onto the
 *     parent collection (so the server receives finished records),
 *  2. push device changes / pull server changes (Watermelon protocol),
 *  3. prune route tables to the server's current set (small, replace-all),
 *  4. remember when the last successful sync happened.
 */
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '../api/mobileApi';
import { ApiError, toApiError } from '../api/client';
import type { AttachmentRef, PushResults } from '../api/types';
import { STORAGE_KEYS } from '../config';
import { database, tables, Attachment, Collection } from '../db';
import { deleteLocalFile } from '../utils/photos';

export type SyncPhase = 'idle' | 'attachments' | 'push' | 'pull' | 'done' | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  attachmentsDone: number;
  attachmentsTotal: number;
  message?: string;
}

export interface SyncOutcome {
  ok: boolean;
  error?: string;
  pushResults?: PushResults;
  full?: boolean;
  finishedAt: number;
}

let running: Promise<SyncOutcome> | null = null;

/** Only one sync at a time; concurrent callers share the in-flight run. */
export function runSync(onProgress?: (p: SyncProgress) => void, opts: { full?: boolean } = {}): Promise<SyncOutcome> {
  if (running) return running;
  running = doSync(onProgress ?? (() => undefined), opts).finally(() => {
    running = null;
  });
  return running;
}

export const isSyncRunning = () => running !== null;

async function doSync(onProgress: (p: SyncProgress) => void, opts: { full?: boolean }): Promise<SyncOutcome> {
  const progress: SyncProgress = { phase: 'attachments', attachmentsDone: 0, attachmentsTotal: 0 };
  const report = (patch: Partial<SyncProgress>) => onProgress({ ...Object.assign(progress, patch) });

  try {
    await uploadPendingAttachments(report);

    let pushResults: PushResults | undefined;
    let pulledRouteIds: Set<string> | null = null;
    let pulledRouteCustomerIds: Set<string> | null = null;
    let wasFull = false;

    report({ phase: 'push' });
    await synchronize({
      database,
      sendCreatedAsUpdated: false,
      migrationsEnabledAtVersion: 1,
      pushChanges: async ({ changes, lastPulledAt }) => {
        // Device-only table — the server ignores it, no need to send photo paths.
        const { attachments: _ignored, ...rest } = changes as Record<string, unknown>;
        const hasChanges = Object.values(rest).some((t) => {
          const tc = t as { created: unknown[]; updated: unknown[]; deleted: unknown[] };
          return tc.created.length + tc.updated.length + tc.deleted.length > 0;
        });
        if (!hasChanges) return;
        pushResults = await mobileApi.push({ changes: rest, lastPulledAt: lastPulledAt ?? null });
      },
      pullChanges: async ({ lastPulledAt }) => {
        report({ phase: 'pull' });
        const res = await mobileApi.pull(lastPulledAt ?? null, opts.full);
        wasFull = res.full;
        if (res.full) {
          pulledRouteIds = new Set((res.changes.routes?.updated ?? []).map((r) => String(r.id)));
          pulledRouteCustomerIds = new Set((res.changes.route_customers?.updated ?? []).map((r) => String(r.id)));
        }
        return { changes: res.changes as never, timestamp: res.timestamp };
      },
    });

    if (pulledRouteIds && pulledRouteCustomerIds) {
      await pruneMissing('routes', pulledRouteIds);
      await pruneMissing('route_customers', pulledRouteCustomerIds);
    }
    await cleanupUploadedAttachments();

    const finishedAt = Date.now();
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastSyncAt, String(finishedAt)],
      [STORAGE_KEYS.lastSyncError, ''],
    ]);
    report({ phase: 'done' });
    return { ok: true, pushResults, full: wasFull, finishedAt };
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : toApiError(err);
    const message = apiErr.message || 'Sync failed';
    await AsyncStorage.setItem(STORAGE_KEYS.lastSyncError, message);
    report({ phase: 'error', message });
    return { ok: false, error: message, finishedAt: Date.now() };
  }
}

async function uploadPendingAttachments(report: (p: Partial<SyncProgress>) => void) {
  const pending = await tables
    .attachments()
    .query(Q.where('remote_url', null))
    .fetch();
  report({ phase: 'attachments', attachmentsDone: 0, attachmentsTotal: pending.length });
  let done = 0;

  for (const att of pending) {
    const stored = await mobileApi.uploadAttachment(
      { uri: att.localUri, mimeType: att.mimeType, name: `${att.kind.toLowerCase()}-${att.id}.jpg` },
      att.kind,
      att.collectionId
    );
    await database.write(async () => {
      await att.update((a) => {
        a.remoteUrl = stored.url;
        a.uploadError = null;
      });
      const collection = await tables.collections().find(att.collectionId).catch(() => null);
      if (collection) {
        const ref: AttachmentRef = { kind: att.kind, url: stored.url, fileId: stored.fileId ?? null, localId: att.id };
        await collection.update((c) => {
          c.attachments = [...c.attachments.filter((x) => x.localId !== att.id), ref];
        });
      }
    });
    done++;
    report({ attachmentsDone: done });
  }
}

/** Once a collection is posted server-side, local photo copies are no longer needed. */
async function cleanupUploadedAttachments() {
  const uploaded = await tables.attachments().query(Q.where('remote_url', Q.notEq(null))).fetch();
  if (uploaded.length === 0) return;
  const toDelete: Attachment[] = [];
  for (const att of uploaded) {
    const c: Collection | null = await tables.collections().find(att.collectionId).catch(() => null);
    if (!c || (c.status !== 'PENDING' && c.syncStatus === 'synced')) toDelete.push(att);
  }
  if (toDelete.length === 0) return;
  await database.write(async () => {
    for (const att of toDelete) {
      deleteLocalFile(att.localUri);
      await att.destroyPermanently();
    }
  });
}

async function pruneMissing(table: 'routes' | 'route_customers', keep: Set<string>) {
  const all = await database.get(table).query().fetch();
  const stale = all.filter((r) => !keep.has(r.id));
  if (stale.length === 0) return;
  await database.write(async () => {
    for (const r of stale) await r.destroyPermanently();
  });
}

export async function getLastSync(): Promise<{ at: number | null; error: string | null }> {
  const [[, at], [, error]] = await AsyncStorage.multiGet([STORAGE_KEYS.lastSyncAt, STORAGE_KEYS.lastSyncError]);
  return { at: at ? Number(at) : null, error: error || null };
}

/** Counts of device records still waiting to reach the server. */
export async function pendingCounts() {
  const [collections, orders, visits, attachments] = await Promise.all([
    tables.collections().query(Q.where('_status', Q.notEq('synced'))).fetchCount(),
    tables.orders().query(Q.where('_status', Q.notEq('synced'))).fetchCount(),
    tables.visits().query(Q.where('_status', Q.notEq('synced'))).fetchCount(),
    tables.attachments().query(Q.where('remote_url', null)).fetchCount(),
  ]);
  return { collections, orders, visits, attachments, total: collections + orders + visits + attachments };
}
