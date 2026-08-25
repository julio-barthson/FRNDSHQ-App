import { request } from '@/lib/api';
import type { NotificationsPage } from '@/features/notifications/types';

/**
 * `GET /notifications`, scoped server-side to the caller. There is no route
 * that reads anyone else's, so no id is passed here.
 */
export function listNotifications(page = 1, limit = 20) {
  return request<NotificationsPage>(`/notifications?page=${page}&limit=${limit}`);
}

/** Just the badge. Cheap enough to call on every focus. */
export function getUnreadCount() {
  return request<{ unread: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return request<{ unread: number }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return request<{ unread: number }>('/notifications/read-all', { method: 'PATCH' });
}
