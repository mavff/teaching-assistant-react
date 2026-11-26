import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import StudentNotifications from '../../components/StudentNotifications';
import { studentNotificationService } from '../../services/StudentNotificationService';
import { StudentNotification } from '../../types/StudentNotification';

jest.mock('../../services/StudentNotificationService', () => ({
  studentNotificationService: { getNotifications: jest.fn(), markAsRead: jest.fn() }
}));

const getNotifications = studentNotificationService.getNotifications as jest.Mock;
const markAsRead = studentNotificationService.markAsRead as jest.Mock;

const notification = (overrides: Partial<StudentNotification> = {}): StudentNotification => ({
  id: 1,
  studentCPF: '44444444444',
  classId: 'ESS-2026-2',
  previousQuartile: 1,
  newQuartile: 2,
  direction: 'improvement',
  reason: 'Mudança de quartil: Q1 → Q2',
  message: 'Parabéns! Seu desempenho apresentou evolução e você avançou para o segundo quartil da turma.',
  createdAt: '2026-11-22T13:30:00.000Z',
  read: false,
  emailResult: 'Enviado',
  ...overrides
});

const search = async (cpf: string) => {
  await userEvent.type(screen.getByTestId('notifications-cpf-input'), cpf);
  await userEvent.click(screen.getByTestId('notifications-search-button'));
};

describe('StudentNotifications', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not search until a CPF is typed', () => {
    render(<StudentNotifications onError={jest.fn()} />);
    expect(screen.getByTestId('notifications-search-button')).toBeDisabled();
    expect(getNotifications).not.toHaveBeenCalled();
  });

  test('shows the reason, message, date, kind, read status and e-mail result of each notification', async () => {
    getNotifications.mockResolvedValue([
      notification(),
      notification({ id: 2, direction: 'decline', read: true, emailResult: 'Falha', reason: 'Mudança de quartil: Q2 → Q1', message: 'Seu desempenho apresentou uma redução em relação à avaliação anterior.' })
    ]);
    render(<StudentNotifications onError={jest.fn()} />);
    await search('44444444444');

    const items = await screen.findAllByTestId('notification-item');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByTestId('notification-direction')).toHaveTextContent('Evolução');
    expect(within(items[0]).getByTestId('notification-status')).toHaveTextContent('Não lida');
    expect(within(items[0]).getByTestId('notification-reason')).toHaveTextContent('Q1 → Q2');
    expect(within(items[0]).getByTestId('notification-message')).toHaveTextContent('avançou para o segundo quartil');
    expect(within(items[0]).getByTestId('notification-email')).toHaveTextContent('Enviado');
    expect(within(items[0]).getByTestId('notification-date').textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(items[0]).toHaveClass('improvement', 'unread');

    expect(within(items[1]).getByTestId('notification-direction')).toHaveTextContent('Redução');
    expect(within(items[1]).getByTestId('notification-status')).toHaveTextContent('Lida');
    expect(within(items[1]).getByTestId('notification-email')).toHaveTextContent('Falha');
    expect(items[1]).toHaveClass('decline', 'read');
    expect(within(items[1]).queryByTestId('notification-mark-read')).toBeNull();
  });

  test('shows the classification notification sent once every grade of the class was entered', async () => {
    getNotifications.mockResolvedValue([notification({
      direction: 'classification', previousQuartile: null, newQuartile: 3, emailResult: null,
      reason: 'Todas as notas da turma foram lançadas: Q3',
      message: 'Todas as notas da turma foram lançadas. Você está no terceiro quartil da turma (grupo entre os 50% e 75%).'
    })]);
    render(<StudentNotifications onError={jest.fn()} />);
    await search('44444444444');

    const item = await screen.findByTestId('notification-item');
    expect(item).toHaveClass('classification');
    expect(within(item).getByTestId('notification-direction')).toHaveTextContent('Classificação');
    expect(within(item).getByTestId('notification-reason')).toHaveTextContent('Q3');
    expect(within(item).getByTestId('notification-message')).toHaveTextContent('terceiro quartil da turma');
    expect(within(item).getByTestId('notification-email')).toHaveTextContent('aguardando envio');
  });

  test('says so when the student has no notifications, and asks only for the typed CPF', async () => {
    getNotifications.mockResolvedValue([]);
    render(<StudentNotifications onError={jest.fn()} />);
    await search('44444444444');

    expect(await screen.findByTestId('notifications-empty')).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotifications).toHaveBeenCalledWith('44444444444');
  });

  test('marks a notification as read and reloads the list', async () => {
    getNotifications
      .mockResolvedValueOnce([notification()])
      .mockResolvedValueOnce([notification({ read: true })]);
    markAsRead.mockResolvedValue(notification({ read: true }));
    render(<StudentNotifications onError={jest.fn()} />);
    await search('44444444444');

    await userEvent.click(await screen.findByTestId('notification-mark-read'));

    await waitFor(() => expect(screen.getByTestId('notification-status')).toHaveTextContent('Lida'));
    expect(markAsRead).toHaveBeenCalledWith('44444444444', 1);
    expect(screen.queryByTestId('notification-mark-read')).toBeNull();
  });

  test('reports the server error when the student is unknown', async () => {
    const onError = jest.fn();
    getNotifications.mockRejectedValue(new Error('Student not found'));
    render(<StudentNotifications onError={onError} />);
    await search('99999999999');

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Student not found'));
    expect(screen.queryByTestId('notification-item')).toBeNull();
  });
});
