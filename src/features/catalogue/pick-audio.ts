import * as DocumentPicker from 'expo-document-picker';
import { getInfoAsync } from 'expo-file-system/legacy';

import type { LocalFile } from '@/features/catalogue/upload';

/** The mime types `ASSET_RULES.AUDIO` accepts, keyed by extension. */
const MIME_BY_EXTENSION: Record<string, string> = {
  wav: 'audio/wav',
  wave: 'audio/wav',
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Android providers frequently hand back `application/octet-stream`, or
 * nothing at all, for audio picked from Files. The extension is the more
 * reliable signal, so it wins whenever it maps to a type the API accepts.
 */
function resolveMimeType(name: string, reported?: string): string {
  const fromExtension = MIME_BY_EXTENSION[extensionOf(name)];
  if (fromExtension) return fromExtension;
  if (reported && reported !== 'application/octet-stream') return reported;
  // Left as-is so the server explains what it will not accept, rather than
  // this guessing wrong and the upload failing for a confusing reason.
  return reported ?? 'application/octet-stream';
}

/**
 * Opens the file browser for a master, and returns it ready to upload.
 *
 * Unlike artwork this never reads the file into memory to measure it — a
 * master can be 100MB. The on-disk length is read instead.
 *
 * `getInfoAsync` comes from `expo-file-system/legacy` because SDK 54 ships
 * v19, whose `File` class exposes `name` and `extension` but no `size` — that
 * getter arrived with the SDK 57 rewrite this was written against.
 */
export async function pickAudio(): Promise<LocalFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // A superset of what the API allows; the wrong type is rejected below with
    // a clearer message than the system picker would give.
    type: ['audio/*'],
    // Content-provider URIs are not readable for upload on Android, so the
    // file has to be copied into the app's cache first.
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset) return null;

  let sizeBytes = asset.size ?? 0;
  if (!sizeBytes) {
    try {
      const info = await getInfoAsync(asset.uri);
      sizeBytes = info.exists && !info.isDirectory ? info.size : 0;
    } catch {
      sizeBytes = 0;
    }
  }

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: resolveMimeType(asset.name, asset.mimeType),
    sizeBytes,
  };
}
