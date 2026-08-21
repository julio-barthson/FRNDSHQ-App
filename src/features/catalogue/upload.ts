import { createUploadTask, FileSystemUploadType } from 'expo-file-system/legacy';

import { ApiError, request } from '@/lib/api';
import type { AssetKind } from '@/features/catalogue/media';

/** Mirrors the reply from `POST /media/upload-url`. */
interface UploadTicket {
  assetId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
}

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Client-side mirror of `ASSET_RULES`. The server re-checks all of it — twice
 * for size, once against the declared value and again against the stored
 * object — so this exists only to fail fast with a readable message instead of
 * spending a 70MB upload to find out.
 */
const RULES: Record<AssetKind, { maxBytes: number; mimeTypes: string[] }> = {
  AUDIO: {
    maxBytes: 100 * 1024 * 1024,
    mimeTypes: [
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/flac',
      'audio/x-flac',
      'audio/mpeg',
    ],
  },
  ARTWORK: { maxBytes: 10 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/png'] },
  AVATAR: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

function describeLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function checkFile(kind: AssetKind, file: LocalFile): string | null {
  const rules = RULES[kind];

  // `sizeBytes` is `@Min(1)` on the API, and a zero here means the picker gave
  // us nothing readable — better to say so than to send a request that 400s.
  if (!file.sizeBytes) {
    return 'Could not read that file. Try copying it to your device first.';
  }

  if (!rules.mimeTypes.includes(file.mimeType)) {
    const readable = kind === 'AUDIO' ? 'WAV, FLAC or MP3' : 'JPEG or PNG';
    return `That file type is not supported. Use ${readable}.`;
  }

  if (file.sizeBytes > rules.maxBytes) {
    return `That file is too large. The limit is ${describeLimit(rules.maxBytes)}.`;
  }

  return null;
}

/**
 * Runs the three-step upload: ask for a presigned URL, PUT the bytes straight
 * to storage, then confirm so the server checks the real object and marks the
 * asset usable.
 *
 * The bytes never pass through the API — that is the whole point of presigning
 * — so the PUT is a bare `fetch` rather than going through `request()`.
 */
export async function uploadFile(
  kind: AssetKind,
  file: LocalFile,
  /** Fraction sent, 0 to 1. Audio masters are large enough that a silent
   *  spinner reads as a frozen screen. */
  onProgress?: (fraction: number) => void
): Promise<{ assetId: string }> {
  const problem = checkFile(kind, file);
  if (problem) throw new ApiError(400, problem);

  const ticket = await request<UploadTicket>('/media/upload-url', {
    method: 'POST',
    body: {
      kind,
      fileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
  });

  // Not `fetch`: React Native only accepts a `{ uri }` object as a *part* of
  // FormData, never as a raw body, so a presigned PUT built that way never
  // forms a request. This streams the file straight from disk instead, which
  // also keeps a 100MB master out of memory.
  // `expo-file-system/legacy`, not the root module. SDK 54 ships v19, where
  // `new File(uri).upload()` and `UploadType` do not exist yet — those arrived
  // with the SDK 57 rewrite this code was originally written against.
  // `createUploadTask` is the equivalent here and is the only variant that
  // reports progress.
  let status: number;
  let body: string;
  try {
    const task = createUploadTask(
      ticket.uploadUrl,
      file.uri,
      {
        httpMethod: 'PUT',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: ticket.headers,
      },
      onProgress
        ? ({ totalBytesSent, totalBytesExpectedToSend }) => {
            // The expected total can be 0 before the transfer starts; guard so
            // the bar never jumps to a nonsense value.
            if (totalBytesExpectedToSend > 0) {
              onProgress(Math.min(1, totalBytesSent / totalBytesExpectedToSend));
            }
          }
        : undefined
    );

    const result = await task.uploadAsync();
    if (!result) throw new Error('upload cancelled');

    status = result.status;
    body = result.body;
  } catch {
    throw new ApiError(0, 'The upload could not reach storage. Check your connection.');
  }

  if (status < 200 || status >= 300) {
    // R2 answers with an XML error document; the code inside it is the only
    // part worth surfacing, and only to the logs.
    console.warn(`[upload] storage rejected ${status}: ${body.slice(0, 300)}`);
    throw new ApiError(status, 'Storage rejected the upload. Please try again.');
  }

  // Until this succeeds the asset is PENDING and cannot be attached to
  // anything; the server sweeps unconfirmed uploads after 24 hours.
  await request(`/media/${ticket.assetId}/confirm`, { method: 'POST' });

  return { assetId: ticket.assetId };
}
