import type { CollectionDraft } from '../navigation/types';

/** Amount actually received may differ from the planned allocations; rebalance the last invoice line. */
export function rebalanceDraft(draft: CollectionDraft, received: number): CollectionDraft {
  const planned = draft.total;
  if (Math.abs(received - planned) < 0.005 || draft.allocations.length === 0) return { ...draft, total: received, onAccount: draft.allocations.length === 0 ? received : draft.onAccount };
  let remaining = received;
  const allocations = draft.allocations.map((a, idx) => {
    if (idx === draft.allocations.length - 1 && draft.onAccount === 0) {
      const amt = Math.max(0, Math.round(remaining * 100) / 100);
      remaining -= amt;
      return { ...a, amount: amt };
    }
    const amt = Math.min(a.amount, Math.max(0, remaining));
    remaining -= amt;
    return { ...a, amount: Math.round(amt * 100) / 100 };
  });
  const onAccount = Math.max(0, Math.round(remaining * 100) / 100);
  return { ...draft, allocations: allocations.filter((a) => a.amount > 0), onAccount, total: received };
}
