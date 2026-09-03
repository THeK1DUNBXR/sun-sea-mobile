import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import type { Query, Model } from '@nozbe/watermelondb';

/** Subscribe to any WatermelonDB observable; re-subscribes when `deps` change. */
export function useObservable<T>(factory: () => Observable<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = factory().subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('[db] observable error', e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function useQuery<T extends Model>(factory: () => Query<T>, deps: unknown[]): T[] {
  return useObservable(() => factory().observe(), deps, [] as T[]);
}

export function useCount<T extends Model>(factory: () => Query<T>, deps: unknown[]): number {
  return useObservable(() => factory().observeCount(false), deps, 0);
}

/** Observe a single record; pass a factory returning null when there is nothing to observe. */
export function useRecord<T extends Model>(factory: () => Observable<T> | null, deps: unknown[]): T | null {
  return useObservable<T | null>(() => {
    const obs = factory();
    return obs ? (obs as Observable<T | null>) : new Observable<T | null>((sub) => sub.next(null));
  }, deps, null);
}
