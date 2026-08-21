import { useCallback, useState } from 'react';

import { mapAuthError, type Matchers } from '@/features/auth/field-errors';
import { ApiError } from '@/lib/api';

export interface AuthErrors<K extends string> {
  fields: Partial<Record<K, string>>;
  /** Whatever did not belong to a field — bad credentials, an unreachable server. */
  formError: string | null;
  /**
   * True when the last failure never reached the server. Retrying a network
   * failure can work; retrying a wrong password cannot, so only the former
   * should be offered a retry action.
   */
  isNetworkError: boolean;
  /** Replaces every field error at once — for local validation before submit. */
  setFields: (next: Partial<Record<K, string>>) => void;
  /**
   * Drops one field's error. Called as the user edits that field, so a message
   * disappears the moment it is being addressed rather than surviving until the
   * next submit.
   */
  clearField: (field: K) => void;
  /** Maps a failed request onto fields plus a form message, and returns the fields it claimed. */
  capture: (error: unknown, matchers: Matchers<K>) => Partial<Record<K, string>>;
  reset: () => void;
}

/**
 * The error half of an auth form's state, in one place.
 *
 * Every auth screen was repeating the same three `useState` calls and the same
 * "map the failure, set the fields, set the form error" dance. Holding it here
 * also gives the screens `clearField` and `isNetworkError`, which is what makes
 * live error clearing and a retry affordance cheap enough to do consistently.
 */
export function useAuthErrors<K extends string>(): AuthErrors<K> {
  const [fields, setFieldsState] = useState<Partial<Record<K, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const setFields = useCallback((next: Partial<Record<K, string>>) => {
    setFieldsState(next);
    setFormError(null);
    setIsNetworkError(false);
  }, []);

  const clearField = useCallback((field: K) => {
    // Returning `prev` unchanged when there is nothing to clear keeps every
    // keystroke on an untouched field from re-rendering the form.
    setFieldsState((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const capture = useCallback((error: unknown, matchers: Matchers<K>) => {
    const mapped = mapAuthError(error, matchers);
    setFieldsState(mapped.fields);
    setFormError(mapped.formError);
    setIsNetworkError(error instanceof ApiError && error.isNetworkError);
    return mapped.fields;
  }, []);

  const reset = useCallback(() => {
    setFieldsState({});
    setFormError(null);
    setIsNetworkError(false);
  }, []);

  return { fields, formError, isNetworkError, setFields, clearField, capture, reset };
}
