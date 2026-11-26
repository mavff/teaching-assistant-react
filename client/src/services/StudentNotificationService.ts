import { StudentNotification } from '../types/StudentNotification';

const API_BASE_URL = 'http://localhost:3005';

const notificationsPath = (studentCPF: string) =>
  `${API_BASE_URL}/api/students/${encodeURIComponent(studentCPF)}/notifications`;

/** Access to the quartile notifications of one student: the server only returns that student's own. */
export const studentNotificationService = {
  async getNotifications(studentCPF: string): Promise<StudentNotification[]> {
    const response = await fetch(notificationsPath(studentCPF));
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to fetch notifications');
    }
    return response.json();
  },

  async markAsRead(studentCPF: string, notificationId: number): Promise<StudentNotification> {
    const response = await fetch(`${notificationsPath(studentCPF)}/${notificationId}/read`, { method: 'PUT' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to mark notification as read');
    }
    return response.json();
  }
};
