import * as Crypto from 'expo-crypto';

/** RFC-4122 v4 id — the backend requires UUIDs for device-created records. */
export const newId = (): string => Crypto.randomUUID();
