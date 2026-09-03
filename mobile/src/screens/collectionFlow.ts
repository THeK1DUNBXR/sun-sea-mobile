import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AttachmentKind, PaymentMode } from '../api/types';
import { createCollection } from '../data/actions';
import type { CollectionDraft, RootStackParamList } from '../navigation/types';
import type { CapturedPhoto } from '../utils/photos';

export { rebalanceDraft } from '../utils/collectionMath';

export interface PaymentDetails {
  paymentMode: PaymentMode;
  amount: number;
  referenceNo?: string | null;
  bankName?: string | null;
  chequeDate?: string | null;
  drawerName?: string | null;
  notes?: string | null;
  photos: { kind: AttachmentKind; photo: CapturedPhoto }[];
}

/**
 * Saves the collection locally and jumps to the success screen, dropping the
 * capture screens from the stack so "Done" returns to the customer.
 */
export async function finishCollection(nav: NativeStackNavigationProp<RootStackParamList>, draft: CollectionDraft, details: PaymentDetails) {
  const collection = await createCollection({
    customerId: draft.customerId,
    visitId: draft.visitId,
    amount: details.amount,
    paymentMode: details.paymentMode,
    referenceNo: details.referenceNo,
    bankName: details.bankName,
    chequeDate: details.chequeDate,
    drawerName: details.drawerName,
    notes: details.notes,
    allocations: draft.allocations,
    photos: details.photos,
  });
  nav.reset({
    index: 1,
    routes: [{ name: 'Main' }, { name: 'CollectionSuccess', params: { collectionId: collection.id } }],
  });
}
