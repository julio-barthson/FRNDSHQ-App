import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getUnreadCount } from '@/features/notifications/api';

/**
 * The number on the bell.
 *
 * Refetched whenever the screen regains focus rather than polled on a timer.
 * Coming back from the notifications centre is the moment the count is most
 * likely to be wrong, and it is also exactly when focus returns — a timer would
 * spend the rest of the session asking a question nobody is looking at.
 *
 * Failures are swallowed and leave the last known count in place. A bell that
 * cannot reach the API should show nothing new, not an error: the screen it
 * sits on has its own error handling for the data that actually matters.
 */
export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await getUnreadCount();
      setUnread(result.unread);
    } catch {
      // Deliberately silent — see above.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { unread, refresh, setUnread };
}
