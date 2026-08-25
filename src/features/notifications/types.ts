/** Mirrors `backend/src/notifications`. Keep in step with it. */

export type NotificationType =
  | 'RELEASE_SUBMITTED'
  | 'RELEASE_APPROVED'
  | 'RELEASE_REJECTED'
  | 'REVIEW_QUEUE_NEW';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  /**
   * Written when the notification was created, not derived now. A rejection
   * carries the reviewer's note word for word, and a later edit to the release
   * must not be able to rewrite what the artist was told.
   */
  body: string;
  /** What opening it should show. Null for anything not about one release. */
  releaseId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: AppNotification[];
  unread: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
