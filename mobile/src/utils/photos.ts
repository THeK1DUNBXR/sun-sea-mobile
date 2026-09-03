import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { PHOTO_MAX_EDGE, PHOTO_QUALITY } from '../config';

export interface CapturedPhoto {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

const attachmentsDir = () => {
  const dir = new Directory(Paths.document, 'attachments');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

/** Downscale + JPEG-compress, then move into the app's document dir so the file survives cache purges. */
async function persist(uri: string, name: string): Promise<CapturedPhoto> {
  const result = await manipulateAsync(uri, [{ resize: { width: PHOTO_MAX_EDGE } }], {
    compress: PHOTO_QUALITY,
    format: SaveFormat.JPEG,
  });
  const dest = new File(attachmentsDir(), `${name}.jpg`);
  const src = new File(result.uri);
  if (dest.exists) dest.delete();
  src.move(dest);
  return { uri: dest.uri, mimeType: 'image/jpeg', width: result.width, height: result.height };
}

export async function captureFromCamera(name: string): Promise<CapturedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission is required to capture the receipt.');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false, mediaTypes: ['images'] });
  if (res.canceled || !res.assets?.[0]) return null;
  return persist(res.assets[0].uri, name);
}

export async function pickFromLibrary(name: string): Promise<CapturedPhoto | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission is required.');
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: false, mediaTypes: ['images'] });
  if (res.canceled || !res.assets?.[0]) return null;
  return persist(res.assets[0].uri, name);
}

export function deleteLocalFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* ignore */
  }
}
