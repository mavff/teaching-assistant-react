export type Quartile = 1 | 2 | 3 | 4;

/**
 * A quartile notification, as the server sends it to that student only: either the
 * classification (once every grade of the class was entered) or a change of quartile.
 */
export interface StudentNotification {
  id: number;
  studentCPF: string;
  classId: string;
  previousQuartile: Quartile | null; // null in a classification notification
  newQuartile: Quartile;
  direction: 'improvement' | 'decline' | 'classification';
  reason: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** What happened when the same message was e-mailed to the student; null while it was not attempted yet. */
  emailResult: 'Enviado' | 'Falha' | 'Ignorado' | null;
  emailFailure?: string;
}
