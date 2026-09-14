import * as FileSystem from 'expo-file-system';

/**
 * Writes a base64 data: URL (as produced by react-native-signature-canvas)
 * to a temp file and returns its file:// uri, so it can be treated like any
 * other picked image when queued for multipart upload.
 */
export async function dataUrlToFile(dataUrl: string, filename = `signature-${Date.now()}.png`): Promise<string | null> {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, ext, base64] = match;
  // expo-file-system's SDK 57 module type only surfaces the new File/Directory
  // API; cacheDirectory/documentDirectory are the legacy string-path constants
  // (still shipped and used above via writeAsStringAsync) that its .d.ts
  // doesn't declare — narrow the cast to just those two optional fields
  // instead of an untyped `any`.
  const legacyDirs = FileSystem as unknown as { cacheDirectory?: string | null; documentDirectory?: string | null };
  const dir = legacyDirs.cacheDirectory ?? legacyDirs.documentDirectory ?? '';
  const path = `${dir}${filename.replace(/\.\w+$/, '')}.${ext}`;
  try {
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    return path;
  } catch {
    return null;
  }
}
