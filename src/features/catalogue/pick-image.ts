import * as ImagePicker from 'expo-image-picker';

import type { LocalFile } from '@/features/catalogue/upload';

/** Thrown when the picker cannot be opened at all. */
export class PickerError extends Error {}

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
}

/** Only the two types `ASSET_RULES.ARTWORK` accepts. */
function mimeFromExtension(extension: string): string {
  return extension === 'png' ? 'image/png' : 'image/jpeg';
}

/**
 * `fileSize` and `mimeType` are optional on `ImagePickerAsset` and some Android
 * providers omit both, but the presign DTO requires them. Reading the file back
 * as a blob is the reliable way to learn the truth; artwork is capped at 10MB,
 * so holding one briefly in memory is fine. Audio must not do this.
 */
async function measure(uri: string): Promise<{ sizeBytes: number; mimeType?: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return {
    sizeBytes: blob.size,
    mimeType: blob.type && blob.type !== 'application/octet-stream' ? blob.type : undefined,
  };
}

/**
 * Opens the library and returns a file ready to upload, or null if the artist
 * backed out.
 *
 * Cropping is forced to a square: DSPs require square cover art, and letting
 * the picker enforce it is kinder than rejecting the upload afterwards — and
 * honest, since the API does not check dimensions itself.
 */
export async function pickArtwork(): Promise<LocalFile | null> {
  return pickSquareImage(
    'FRNDSHQ needs access to your photos to set cover artwork. You can grant it in Settings.',
    'artwork'
  );
}

/**
 * The same square crop, for a roster artist's picture.
 *
 * Separate only for its copy: a label being told FRNDSHQ wants photo access
 * "to set cover artwork" while adding an artist is the kind of small lie that
 * makes a permission prompt feel untrustworthy.
 */
export async function pickAvatar(): Promise<LocalFile | null> {
  return pickSquareImage(
    "FRNDSHQ needs access to your photos to set an artist's picture. You can grant it in Settings.",
    'avatar'
  );
}

async function pickSquareImage(
  permissionMessage: string,
  fallbackName: string
): Promise<LocalFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PickerError(permissionMessage);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const measured = await measure(asset.uri);
  const extension = extensionOf(asset.fileName ?? asset.uri) || 'jpg';
  const mimeType = asset.mimeType ?? measured.mimeType ?? mimeFromExtension(extension);

  return {
    uri: asset.uri,
    name: asset.fileName ?? `${fallbackName}.${extension}`,
    mimeType,
    sizeBytes: asset.fileSize ?? measured.sizeBytes,
  };
}
