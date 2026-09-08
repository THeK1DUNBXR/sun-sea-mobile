/**
 * The app talks to `api`, which routes every call to the adapter matching the
 * server the user connected to: the mobile extension when it is installed,
 * otherwise the ERP's own endpoints (Railway deployment without the module).
 */
import { mobileApi } from './mobileApi';
import { erpDirect } from './erpDirect';
import { getServerMode, type ServerMode } from './server';
import type { ApiSurface } from './surface';

let cached: ServerMode | null = null;
export const invalidateApiMode = () => {
  cached = null;
};

export async function currentApi(): Promise<ApiSurface> {
  if (!cached) cached = await getServerMode();
  return cached === 'mobile' ? mobileApi : erpDirect;
}

export const api: ApiSurface = {
  get mode() {
    return cached ?? 'direct';
  },
  get capabilities() {
    return (cached === 'mobile' ? mobileApi : erpDirect).capabilities;
  },
  login: async (e, p) => (await currentApi()).login(e, p),
  logout: async () => (await currentApi()).logout(),
  bootstrap: async () => (await currentApi()).bootstrap(),
  pull: async (l, f) => (await currentApi()).pull(l, f),
  push: async (b) => (await currentApi()).push(b),
  uploadAttachment: async (f, k, id) => (await currentApi()).uploadAttachment(f, k, id),
  ocrCheque: async (f) => (await currentApi()).ocrCheque(f),
  customerStatement: async (id) => (await currentApi()).customerStatement(id),
};
