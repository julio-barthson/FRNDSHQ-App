import { API_BASE } from '@/lib/env';
import { tokenStore } from '@/lib/token-store';

/**
 * Render's free tier spins a service down after inactivity, and the cold start
 * that follows measured ~31s. At the old 15s this surfaced as "can't reach
 * FRNDSHQ" on the first request after an idle period even though the backend
 * was healthy. Drop this back once the backend is on an always-on instance.
 */
const TIMEOUT_MS = 45_000;

/**
 * `fetch` with a timeout that works on device.
 *
 * `AbortSignal.timeout()` does not exist on React Native 0.81 — RN polyfills
 * `AbortSignal` from the `abort-controller` package (`Libraries/Core/setUpXHR`),
 * which has no static `timeout()`. Calling it throws a TypeError *before* the
 * request is made, so every call surfaced as "can't reach the server" even with
 * a perfectly good connection. Browsers have had it since 2022, which is why
 * only native was affected.
 *
 * That polyfill's `abort()` also takes no reason, so the timeout is tracked
 * with a flag and rethrown with `name === 'TimeoutError'` — the name `request()`
 * checks to tell a slow server apart from an unreachable one.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (!timedOut) throw error;

    const timeout = new Error('The request timed out.');
    timeout.name = 'TimeoutError';
    throw timeout;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages from the NestJS ValidationPipe, when there are any. */
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** True when the request never reached the server. */
  get isNetworkError() {
    return this.status === 0;
  }
}

// ── Session expiry broadcast ────────────────────────────────────────────────
// The client discovers a dead session before the UI does. Rather than have
// every screen handle that, it announces it once and the session provider
// reacts by signing out.

type Listener = () => void;
const expiryListeners = new Set<Listener>();

export function onSessionExpired(listener: Listener) {
  expiryListeners.add(listener);
  return () => {
    expiryListeners.delete(listener);
  };
}

function announceExpiry() {
  for (const listener of expiryListeners) listener();
}

// ── Refresh ─────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * `POST /auth/refresh` rotates destructively: the old refresh token is dead the
 * moment it is presented, and presenting a rotated token revokes the device.
 * So concurrent 401s must never each run their own refresh — they all wait on
 * this one promise instead.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Deliberately a bare fetch, not `request()` — routing this through the
    // retry path would recurse the moment a refresh itself 401s.
    const response = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await tokenStore.clear();
      return null;
    }

    const pair = (await response.json()) as TokenPair;
    await tokenStore.save(pair.accessToken, pair.refreshToken);
    return pair.accessToken;
  } catch {
    // A network failure is not a dead session. Leave the stored tokens alone
    // so the next attempt on a working connection can still use them.
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ── Request ─────────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the bearer token and retry once after a refresh. Default true. */
  auth?: boolean;
}

function messageFrom(payload: unknown, fallback: string): { message: string; details: string[] } {
  if (typeof payload !== 'object' || payload === null) {
    return { message: fallback, details: [] };
  }

  const raw = (payload as { message?: unknown }).message;

  if (Array.isArray(raw)) {
    const details = raw.filter((item): item is string => typeof item === 'string');
    return { message: details[0] ?? fallback, details };
  }

  if (typeof raw === 'string') return { message: raw, details: [] };
  return { message: fallback, details: [] };
}

async function send(path: string, options: RequestOptions, accessToken: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetchWithTimeout(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;

  let response: Response;
  try {
    response = await send(path, options, useAuth ? await tokenStore.getAccessToken() : null);

    if (response.status === 401 && useAuth) {
      const accessToken = await refreshOnce();

      if (!accessToken) {
        await tokenStore.clear();
        announceExpiry();
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }

      response = await send(path, options, accessToken);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new ApiError(
      0,
      timedOut
        ? 'The server took too long to respond. Check your connection and try again.'
        : "Can't reach FRNDSHQ. Check your connection and try again."
    );
  }

  if (response.status === 204) return undefined as T;

  // Read as text first: `json()` swallows the body on a parse failure, and on
  // a 2xx that left `payload` null for the caller to dereference — surfacing
  // as a bare TypeError with nothing pointing back at the response.
  const body = await response.text().catch(() => '');

  let payload: unknown = null;
  let unreadable = false;
  try {
    payload = body.length > 0 ? JSON.parse(body) : null;
  } catch {
    unreadable = true;
  }

  if (!response.ok) {
    // The status goes in the fallback so an error the server refused can be
    // told apart from one thrown after a response arrived — the two rendered
    // an identical sentence, which cost a day of debugging once.
    const { message, details } = messageFrom(
      payload,
      `Something went wrong (HTTP ${response.status}). Please try again.`
    );
    throw new ApiError(response.status, message, details);
  }

  // Deliberately narrow: an empty 2xx body still returns null, as it always
  // has, because `request<void>` callers rely on that. Only a body that is
  // present and unparseable is an error.
  if (unreadable) {
    throw new ApiError(
      response.status,
      `The server replied ${response.status} but the app could not read the body (${body.length} bytes).`
    );
  }

  return payload as T;
}
