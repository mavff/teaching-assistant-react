import { studentNotificationService } from '../services/StudentNotificationService';

/** Records the HTTP contract each service method relies on. */
describe('studentNotificationService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

  test('getNotifications GETs the notifications of that student only', async () => {
    respond(200, [{ id: 1 }]);
    await expect(studentNotificationService.getNotifications('123.456.789-01')).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students/123.456.789-01/notifications');
  });

  test('getNotifications surfaces the server error message', async () => {
    respond(404, { error: 'Student not found' });
    await expect(studentNotificationService.getNotifications('999')).rejects.toThrow('Student not found');
  });

  test('markAsRead PUTs to the read endpoint of that notification', async () => {
    respond(200, { id: 7, read: true });
    await expect(studentNotificationService.markAsRead('123.456.789-01', 7)).resolves.toEqual({ id: 7, read: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3005/api/students/123.456.789-01/notifications/7/read',
      { method: 'PUT' }
    );
  });

  test('markAsRead rejects when the notification is not the student\'s', async () => {
    respond(404, { error: 'Notification not found' });
    await expect(studentNotificationService.markAsRead('123.456.789-01', 7)).rejects.toThrow('Notification not found');
  });
});
