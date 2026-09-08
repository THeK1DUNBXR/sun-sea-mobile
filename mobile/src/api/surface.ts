import type { Bootstrap, ChequeFields, CustomerStatement, LoginResponse, PullResponse, PushResults, StoredAttachment } from './types';
import type { ServerMode } from './server';

export interface ApiCapabilities {
  /** Receipt / cheque photos can be uploaded and stored server-side. */
  attachments: boolean;
  /** Cheque OCR endpoint exists. */
  chequeOcr: boolean;
  /** Routes and visits are planned on the server and synced down. */
  routes: boolean;
  /** Ledger statement per customer is available online. */
  statement: boolean;
}

/** What the rest of the app needs from a backend, regardless of how it is reached. */
export interface ApiSurface {
  mode: ServerMode;
  capabilities: ApiCapabilities;
  login(email: string, password: string): Promise<LoginResponse>;
  logout(): Promise<void>;
  bootstrap(): Promise<Bootstrap>;
  pull(lastPulledAt: number | null, full?: boolean): Promise<PullResponse>;
  push(body: { changes: unknown; lastPulledAt: number | null }): Promise<PushResults>;
  uploadAttachment(file: { uri: string; mimeType: string; name: string }, kind: string, parentId: string): Promise<StoredAttachment>;
  ocrCheque(file: { uri: string; mimeType: string; name: string }): Promise<ChequeFields>;
  customerStatement(customerId: string): Promise<CustomerStatement>;
}
