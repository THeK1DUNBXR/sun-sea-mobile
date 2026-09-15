import { Alert } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { copy } from '@/copy';

// Matches the backend's multer limit (agent-app.routes.ts: 5 * 1024 * 1024)
// — reject client-side with a clear message rather than letting the agent
// fill out an entire form and only find out at submit/sync time.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Returns true if the picked asset is within the backend's upload size
 * limit (or if the size can't be determined, in which case we let it
 * through and rely on the server's own check). Shows an alert on reject. */
export function assertImageSizeOk(asset: ImagePickerAsset): boolean {
  if (asset.fileSize != null && asset.fileSize > MAX_IMAGE_BYTES) {
    Alert.alert(
      copy.imageGuard.tooLargeTitle,
      copy.imageGuard.tooLargeMessage((asset.fileSize / (1024 * 1024)).toFixed(1)),
    );
    return false;
  }
  return true;
}
