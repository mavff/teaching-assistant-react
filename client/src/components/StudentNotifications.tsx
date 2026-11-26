import React, { useState } from 'react';
import { StudentNotification } from '../types/StudentNotification';
import { studentNotificationService } from '../services/StudentNotificationService';

interface NotificationsProps {
  onError: (errorMessage: string) => void;
}

const DIRECTION_LABELS: Record<StudentNotification['direction'], string> = {
  improvement: 'Evolução',
  decline: 'Redução',
  classification: 'Classificação'
};

const StudentNotifications: React.FC<NotificationsProps> = ({ onError }) => {
  const [cpf, setCpf] = useState<string>('');
  const [studentCPF, setStudentCPF] = useState<string>('');
  const [notifications, setNotifications] = useState<StudentNotification[] | null>(null);

  const loadNotifications = async (cpfToLoad: string) => {
    try {
      const data = await studentNotificationService.getNotifications(cpfToLoad);
      setStudentCPF(cpfToLoad);
      setNotifications(data);
      onError('');
    } catch (error) {
      setNotifications(null);
      onError((error as Error).message);
    }
  };

  const handleMarkAsRead = async (notification: StudentNotification) => {
    try {
      await studentNotificationService.markAsRead(studentCPF, notification.id);
      await loadNotifications(studentCPF);
    } catch (error) {
      onError((error as Error).message);
    }
  };

  return (
    <div className="notifications" data-testid="notifications">
      <h2>Notificações de desempenho</h2>
      <div className="form-group">
        <label htmlFor="notifications-cpf">Your CPF</label>
        <input
          id="notifications-cpf"
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          data-testid="notifications-cpf-input"
        />
      </div>
      <button
        onClick={() => loadNotifications(cpf)}
        disabled={!cpf.trim()}
        data-testid="notifications-search-button"
      >
        View notifications
      </button>

      {notifications !== null && notifications.length === 0 && (
        <p data-testid="notifications-empty">You have no notifications.</p>
      )}

      {notifications !== null && notifications.length > 0 && (
        <ul className="notification-list">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`notification-item ${notification.direction} ${notification.read ? 'read' : 'unread'}`}
              data-testid="notification-item"
            >
              <strong data-testid="notification-direction">
                {DIRECTION_LABELS[notification.direction]}
              </strong>
              <span data-testid="notification-status">{notification.read ? 'Lida' : 'Não lida'}</span>
              <div data-testid="notification-reason">{notification.reason}</div>
              <div data-testid="notification-class">Turma: {notification.classId}</div>
              <div data-testid="notification-message">{notification.message}</div>
              <div data-testid="notification-email">E-mail: {notification.emailResult ?? 'aguardando envio'}</div>
              <small data-testid="notification-date">
                {new Date(notification.createdAt).toLocaleString('pt-BR')}
              </small>
              {!notification.read && (
                <button
                  onClick={() => handleMarkAsRead(notification)}
                  data-testid="notification-mark-read"
                >
                  Marcar como lida
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StudentNotifications;
