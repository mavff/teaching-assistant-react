import { Quartile } from './Quartile';
import { ResultadoNotificacao } from './Notificacao';

// 'classification' tells the student which quartile they are in once every grade of the class was entered
export type NotificationDirection = 'improvement' | 'decline' | 'classification';

const ORDINALS: Record<Quartile, string> = { 1: 'primeiro', 2: 'segundo', 3: 'terceiro', 4: 'quarto' };
const QUARTILE_MEANING: Record<Quartile, string> = {
  1: 'grupo dos 25% com menor desempenho',
  2: 'grupo entre os 25% e 50%',
  3: 'grupo entre os 50% e 75%',
  4: 'grupo dos 25% com maior desempenho'
};

export interface QuartileNotificationData {
  id: number;
  studentCPF: string;
  classId: string;
  previousQuartile: Quartile | null; // null in a classification notification: there is no previous quartile
  newQuartile: Quartile;
  direction: NotificationDirection;
  reason: string;
  message: string;
  createdAt: string; // ISO 8601
  read: boolean;
  /** Result of the e-mail sent to the student with the same message; null while it was not attempted yet. */
  emailResult: ResultadoNotificacao | null;
  emailFailure?: string;
}

/**
 * Tells one student their quartile in a class (when every grade of the class was
 * entered, and each time it changes afterwards). The same message is sent to the
 * student by e-mail, and the result of that sending is kept in the notification. It carries only
 * the student's own previous and new quartile: nothing about other students.
 */
export class QuartileNotification {
  constructor(private readonly data: QuartileNotificationData) {}

  static forQuartileChange(
    id: number, studentCPF: string, classId: string,
    previousQuartile: Quartile, newQuartile: Quartile, createdAt: Date
  ): QuartileNotification {
    const improved = newQuartile > previousQuartile;
    return new QuartileNotification({
      id,
      studentCPF,
      classId,
      previousQuartile,
      newQuartile,
      direction: improved ? 'improvement' : 'decline',
      reason: `Mudança de quartil: Q${previousQuartile} → Q${newQuartile}`,
      message: improved
        ? `Parabéns! Seu desempenho apresentou evolução e você avançou para o ${ORDINALS[newQuartile]} quartil da turma.`
        : 'Seu desempenho apresentou uma redução em relação à avaliação anterior. Confira os conteúdos e identifique oportunidades de melhoria.',
      createdAt: createdAt.toISOString(),
      read: false,
      emailResult: null
    });
  }

  /** Tells the student their quartile after every grade of the class was entered. */
  static forClassification(
    id: number, studentCPF: string, classId: string, quartile: Quartile, createdAt: Date
  ): QuartileNotification {
    return new QuartileNotification({
      id,
      studentCPF,
      classId,
      previousQuartile: null,
      newQuartile: quartile,
      direction: 'classification',
      reason: `Todas as notas da turma foram lançadas: Q${quartile}`,
      message: `Todas as notas da turma foram lançadas. Você está no ${ORDINALS[quartile]} quartil da turma (${QUARTILE_MEANING[quartile]}).`,
      createdAt: createdAt.toISOString(),
      read: false,
      emailResult: null
    });
  }

  getId(): number { return this.data.id; }
  getStudentCPF(): string { return this.data.studentCPF; }
  markAsRead(): void { this.data.read = true; }

  /** Follows the class when its identification changes. */
  changeClassId(oldClassId: string, newClassId: string): void {
    if (this.data.classId === oldClassId) {
      this.data.classId = newClassId;
    }
  }

  getEmailResult(): ResultadoNotificacao | null { return this.data.emailResult; }

  /** Records what happened when the e-mail with this notification was sent. */
  registerEmail(result: ResultadoNotificacao, failure?: string): void {
    this.data.emailResult = result;
    this.data.emailFailure = failure;
  }

  toJSON(): QuartileNotificationData {
    return { ...this.data };
  }

  static fromJSON(data: QuartileNotificationData): QuartileNotification {
    return new QuartileNotification({ ...data, read: Boolean(data.read), emailResult: data.emailResult ?? null });
  }
}
