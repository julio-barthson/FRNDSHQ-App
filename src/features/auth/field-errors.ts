import { ApiError } from '@/lib/api';

/**
 * Turns a failed auth request into per-field messages plus whatever is left
 * over for the top of the form.
 *
 * The backend produces two shapes. The ValidationPipe returns an array of
 * strings, and those strings are inconsistent: DTOs with a custom `message`
 * read as prose ("Please provide a valid email address") while the rest fall
 * back to class-validator's default, which is prefixed with the property name
 * ("email should not be empty"). Anything thrown by the service by hand —
 * "Passwords do not match", "An account with that email already exists" —
 * arrives as a single string instead. Matching on a per-field pattern covers
 * all three without the screens having to care which one they got.
 */
export type Matchers<K extends string> = Record<K, RegExp>;

export interface MappedErrors<K extends string> {
  fields: Partial<Record<K, string>>;
  /** Null when every message found a field to live under. */
  formError: string | null;
}

function claim<K extends string>(
  message: string,
  matchers: Matchers<K>,
  fields: Partial<Record<K, string>>
): boolean {
  // Object key order decides precedence, so a `confirmPassword` matcher must
  // be declared before `password` or it never wins.
  for (const key of Object.keys(matchers) as K[]) {
    if (!fields[key] && matchers[key].test(message)) {
      fields[key] = message;
      return true;
    }
  }
  return false;
}

export function mapAuthError<K extends string>(
  error: unknown,
  matchers: Matchers<K>
): MappedErrors<K> {
  if (!(error instanceof ApiError)) {
    // TEMPORARY (2026-08-26) — diagnostic, revert once the cause is known.
    //
    // Reaching here means the request itself did not fail: `request()` throws
    // only `ApiError`, so anything else was raised *after* a response came
    // back, by our own code. A login the backend completes successfully (the
    // session row is written in full) still lands here, and the generic copy
    // below was destroying the only evidence of why.
    //
    // `name` matters as much as `message`: a `TypeError` points at an SDK 54
    // API that only exists on 57, which has bitten this project four times and
    // always typechecks clean.
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : `Threw a non-Error: ${String(error)}`;

    return { fields: {}, formError: detail };
  }

  const fields: Partial<Record<K, string>> = {};
  const unclaimed: string[] = [];

  // `ApiError.message` is already `details[0]` when details exist, so only read
  // the message on its own when there are none — otherwise it double-reports.
  const messages = error.details.length > 0 ? error.details : [error.message];

  for (const message of messages) {
    if (!claim(message, matchers, fields)) unclaimed.push(message);
  }

  return { fields, formError: unclaimed[0] ?? null };
}
