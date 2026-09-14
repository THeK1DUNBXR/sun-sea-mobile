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
  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? '';
  const path = `${dir}${filename.replace(/\.\w+$/, '')}.${ext}`;
  try {
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    return path;
  } catch {
    return null;
  }
}
