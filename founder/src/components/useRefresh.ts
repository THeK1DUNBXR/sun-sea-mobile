import { useCallback, useState } from 'react';
import { fmtTime } from '../format';

/** Pull-to-refresh stand-in: in the prototype the data is seeded, so we only update the timestamp. */
export function useRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(fmtTime(new Date()));
  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setUpdatedAt(fmtTime(new Date()));
      setRefreshing(false);
    }, 700);
  }, []);
  return { refreshing, refresh, updatedAt };
}
