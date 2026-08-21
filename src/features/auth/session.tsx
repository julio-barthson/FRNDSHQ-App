import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  AccountType,
  AuthSession,
  ProfileInput,
  RegisterInput,
  RegisterResult,
  User,
} from '@/features/auth/types';
import { onSessionExpired, request } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';

export type SessionStatus = 'loading' | 'signedOut' | 'unverified' | 'onboarding' | 'signedIn';

/**
 * The three gates a signed-in account passes through, in order.
 *
 * Login succeeds for an unverified account — the backend only blocks on
 * `accountStatus` — so the first gate is `emailVerified`, not whether we hold a
 * token. The second is the profile: neither signup path creates one, because
 * only onboarding knows whether this is an artist or a label. Until it runs
 * the account has no profile row at all, and the catalogue is unreachable.
 */
function statusFor(user: User): SessionStatus {
  if (!user.emailVerified) return 'unverified';
  if (!user.onboardingCompleted) return 'onboarding';
  return 'signedIn';
}

interface SessionValue {
  status: SessionStatus;
  user: User | null;
  /** Carried from sign-up to the verification screen. */
  pendingEmail: string | null;
  /**
   * Whether the verification screen should ask for a fresh code as soon as it
   * opens. True only after a sign-in that turned out to be unverified, since
   * that path emails nothing on its own. `POST /auth/register` already sends
   * one, and a restored session may be hours old — in both of those cases an
   * automatic send would waste the 3-per-10-minute resend allowance, so the
   * user taps Resend themselves.
   */
  shouldSendCode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Exchanges a Google ID token for a FRNDSHQ session. Never lands on
   * `unverified` — Google has already proven the address — but a first-time
   * Google account still has a profile to fill in, so it lands on
   * `onboarding`.
   */
  signInWithGoogle: (idToken: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  verifyEmail: (otp: string) => Promise<void>;
  /**
   * Saves one onboarding step. Pass `isComplete` on the final step only — that
   * is what flips `onboardingCompleted` and moves the session to `signedIn`.
   */
  saveProfile: (input: ProfileInput) => Promise<User>;
  /**
   * The first onboarding step. Creates the artist or label row behind the
   * login — neither exists until this runs, because signup cannot know which
   * one is wanted and a Google sign-in never asks.
   */
  setAccountType: (accountType: AccountType, name: string) => Promise<User>;
  resendCode: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [shouldSendCode, setShouldSendCode] = useState(false);

  const adopt = useCallback((session: AuthSession) => {
    setUser(session.user);
    setStatus(statusFor(session.user));
  }, []);

  const clearLocally = useCallback(() => {
    setUser(null);
    setPendingEmail(null);
    setShouldSendCode(false);
    setStatus('signedOut');
  }, []);

  // Restore on launch. `GET /auth/me` is enough on its own: the API client
  // refreshes on a 401 and clears the tokens if that fails, so a dead or
  // absent session simply throws and lands here as signedOut.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await request<User>('/auth/me');
        if (cancelled) return;
        setUser(me);
        setPendingEmail(me.emailVerified ? null : me.email);
        setShouldSendCode(false);
        setStatus(statusFor(me));
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The client detects an expired session on any request; react once, here.
  useEffect(() => onSessionExpired(clearLocally), [clearLocally]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await request<AuthSession>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
        auth: false,
      });

      await tokenStore.save(session.accessToken, session.refreshToken);

      const unverified = !session.user.emailVerified;
      setPendingEmail(unverified ? session.user.email : null);
      // Nothing was emailed by the login itself, so the verification screen
      // has to trigger a send when it opens.
      setShouldSendCode(unverified);
      adopt(session);
    },
    [adopt]
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const session = await request<AuthSession>('/auth/google', {
        method: 'POST',
        body: { idToken },
        auth: false,
      });

      await tokenStore.save(session.accessToken, session.refreshToken);
      setPendingEmail(null);
      setShouldSendCode(false);
      adopt(session);
    },
    [adopt]
  );

  const register = useCallback(async (input: RegisterInput) => {
    const result = await request<RegisterResult>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });

    // No tokens come back here — the account is not usable until the emailed
    // code is confirmed. The API has already sent that code.
    setPendingEmail(result.email);
    setShouldSendCode(false);
    setStatus('unverified');
    return result;
  }, []);

  const verifyEmail = useCallback(
    async (otp: string) => {
      const email = pendingEmail ?? user?.email;
      if (!email) throw new Error('No email to verify. Please sign in again.');

      const session = await request<AuthSession>('/auth/verify-email', {
        method: 'POST',
        body: { email, otp },
        auth: false,
      });

      await tokenStore.save(session.accessToken, session.refreshToken);
      setPendingEmail(null);
      setShouldSendCode(false);
      adopt(session);
    },
    [adopt, pendingEmail, user?.email]
  );

  const saveProfile = useCallback(async (input: ProfileInput) => {
    const updated = await request<User>('/auth/profile', {
      method: 'PATCH',
      body: input,
    });

    // The response is the whole user, so adopting it re-derives the status and
    // the navigator moves on by itself once `isComplete` has been sent.
    setUser(updated);
    setStatus(statusFor(updated));
    return updated;
  }, []);

  const setAccountType = useCallback(async (accountType: AccountType, name: string) => {
    const updated = await request<User>('/auth/account-type', {
      method: 'POST',
      body: { accountType, name: name.trim() },
    });

    setUser(updated);
    setStatus(statusFor(updated));
    return updated;
  }, []);

  const resendCode = useCallback(async () => {
    const email = pendingEmail ?? user?.email;
    if (!email) throw new Error('No email to send a code to.');

    // Cleared first so a failed send cannot leave the screen re-triggering
    // itself; the user retries with the button instead.
    setShouldSendCode(false);

    await request('/auth/resend-email-verification', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  }, [pendingEmail, user?.email]);

  const signOut = useCallback(async () => {
    const refreshToken = await tokenStore.getRefreshToken();

    try {
      if (refreshToken) {
        await request('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          auth: false,
        });
      }
    } catch {
      // Revoking server-side is best effort. Losing the local tokens is what
      // actually signs this device out.
    }

    await tokenStore.clear();
    clearLocally();
  }, [clearLocally]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      pendingEmail,
      shouldSendCode,
      signIn,
      signInWithGoogle,
      register,
      verifyEmail,
      saveProfile,
      setAccountType,
      resendCode,
      signOut,
    }),
    [
      status,
      user,
      pendingEmail,
      shouldSendCode,
      signIn,
      signInWithGoogle,
      register,
      verifyEmail,
      saveProfile,
      setAccountType,
      resendCode,
      signOut,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
