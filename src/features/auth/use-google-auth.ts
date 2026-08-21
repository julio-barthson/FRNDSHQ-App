import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/session';
import { GOOGLE_CLIENT_IDS } from '@/lib/env';
import { ApiError } from '@/lib/api';

// Closes the browser tab that the redirect lands in. Safe to call at module
// scope and required for the web build to complete the flow at all.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthState {
  /** Opens Google's account chooser. */
  signIn: () => void;
  /** True from the moment the sheet opens until the session is adopted. */
  pending: boolean;
  error: string | null;
  /** False when no client id is configured, or the request is still loading. */
  ready: boolean;
}

/**
 * Drives "Continue with Google" end to end: opens Google, takes the ID token
 * it returns, and hands it to the API for a FRNDSHQ session.
 *
 * The ID-token flow is used rather than the authorization-code flow because a
 * native app cannot keep a client secret. The token is verified server-side.
 */
export function useGoogleAuth(): GoogleAuthState {
  const { signInWithGoogle } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
  });

  // `redirect_uri_mismatch` is only diagnosable by seeing what was actually
  // sent, and neither value is a secret.
  useEffect(() => {
    if (__DEV__ && request) {
      console.log('[google] redirectUri:', request.redirectUri);
      console.log('[google] clientId:', request.clientId);
    }
  }, [request]);

  useEffect(() => {
    if (!response) return;

    // Cancelling is not a failure — drop the spinner and say nothing.
    if (response.type !== 'success') {
      setPending(false);
      if (response.type === 'error') {
        setError(response.error?.message ?? 'Google sign-in did not complete. Please try again.');
      }
      return;
    }

    const idToken = response.params?.id_token;
    if (!idToken) {
      setPending(false);
      setError('Google did not return an ID token. Please try again.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // On success the session status flips and the root layout swaps the
        // navigator, so this component may unmount mid-flight.
        await signInWithGoogle(idToken);
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Could not sign you in with Google. Please try again.'
        );
      } finally {
        if (!cancelled) setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [response, signInWithGoogle]);

  const signIn = useCallback(() => {
    setError(null);
    setPending(true);
    // `promptAsync` resolves with the same value delivered to `response`, so
    // the effect above is the single place the result is handled.
    void promptAsync().catch(() => {
      setPending(false);
      setError('Could not open Google sign-in.');
    });
  }, [promptAsync]);

  return { signIn, pending, error, ready: request != null };
}
