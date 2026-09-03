import { http, unwrap } from './client';
import type {
  Bootstrap,
  ChequeFields,
  CustomerStatement,
  LoginResponse,
  PullResponse,
  PushResults,
  StoredAttachment,
} from './types';

export const mobileApi = {
  login: async (email: string, password: string) =>
    unwrap<LoginResponse>(await http.post('/auth/login', { email, password })),

  logout: async () => {
    await http.post('/auth/logout');
  },

  bootstrap: async () => unwrap<Bootstrap>(await http.get('/mobile/bootstrap')),

  pull: async (lastPulledAt: number | null, full = false) => {
    const res = await http.get<PullResponse>('/mobile/sync/pull', {
      params: { lastPulledAt: lastPulledAt ?? undefined, full: full ? '1' : undefined },
      timeout: 120000,
    });
    return res.data;
  },

  push: async (body: { changes: unknown; lastPulledAt: number | null }) => {
    const res = await http.post<{ success: boolean; results: PushResults }>('/mobile/sync/push', body, {
      timeout: 120000,
    });
    return res.data.results;
  },

  uploadAttachment: async (file: { uri: string; mimeType: string; name: string }, kind: string, collectionId: string) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, type: file.mimeType, name: file.name } as unknown as Blob);
    form.append('kind', kind);
    form.append('collectionId', collectionId);
    return unwrap<StoredAttachment>(await http.post('/mobile/attachments', form, { timeout: 120000 }));
  },

  ocrCheque: async (file: { uri: string; mimeType: string; name: string }) => {
    const form = new FormData();
    form.append('image', { uri: file.uri, type: file.mimeType, name: file.name } as unknown as Blob);
    return unwrap<ChequeFields>(await http.post('/mobile/ocr/cheque', form, { timeout: 90000 }));
  },

  customerStatement: async (customerId: string) =>
    unwrap<CustomerStatement>(await http.get(`/mobile/customers/${customerId}/statement`)),
};
