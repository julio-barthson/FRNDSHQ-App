import { request } from '@/lib/api';

/**
 * The password-reset endpoints, kept out of `SessionProvider` on purpose: none
 * of them produces a session, and a reset revokes every device rather than
 * signing this one in. The user still has to sign in afterwards.
 */

export interface MessageResponse {
  message: string;
}

/**
 * Sends a 6-digit code, valid for 10 minutes.
 *
 * The reply is deliberately the same whether or not an account exists, so the
 * screen must show `message` as returned rather than claiming delivery — the
 * wording is what stops this endpoint confirming which addresses are
 * registered. Throttled to 3 per 10 minutes.
 */
export function requestPasswordReset(email: string) {
  return request<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
    auth: false,
  });
}

/**
 * Checks a reset code without consuming it, so the app can move the user on to
 * the password fields before asking them to type one. Throws on a bad code.
 */
export function verifyResetCode(email: string, otp: string) {
  return request<MessageResponse>('/auth/verify-code', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), otp },
    auth: false,
  });
}

/**
 * Consumes the code and sets the password. Every existing session is revoked
 * server-side, and an unverified account becomes verified — receiving the code
 * proved control of the address.
 */
export function setNewPassword(args: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return request<MessageResponse>('/auth/set-new-password', {
    method: 'POST',
    body: { ...args, email: args.email.trim().toLowerCase() },
    auth: false,
  });
}
