import { EmailSender, EmailSenderSmtp } from './EmailSender';
import { QuartileNotification } from './QuartileNotification';

/** Who receives the e-mail of a notification, taken from the student registry. */
export interface QuartileRecipient {
  name: string;
  email: string;
}

/**
 * Sends the e-mail that accompanies each quartile notification and records
 * its result (Enviado, Falha or Ignorado) in the notification.
 *
 * It uses the same sender the system already uses to e-mail students (real
 * Gmail SMTP outside the automated tests, simulated inside them). Sending is
 * done in the background, one e-mail at a time, so that grading a class does
 * not wait for the mail server; whenIdle() lets callers (and tests) wait for it.
 * A failure never undoes the notification, which is still shown to the student.
 */
export class QuartileNotifier {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly emailSender: EmailSender | Pick<EmailSenderSmtp, 'send'>,
    private readonly recipientOf: (studentCPF: string) => QuartileRecipient | undefined,
    private readonly classNameOf: (classId: string) => string,
    private readonly onResultsRecorded: () => void = () => {}
  ) {}

  /** Queues the e-mails of the given notifications. */
  send(notifications: QuartileNotification[]): void {
    if (notifications.length === 0) {
      return;
    }
    this.queue = this.queue.then(async () => {
      for (const notification of notifications) {
        await this.sendOne(notification);
      }
      this.onResultsRecorded();
    });
  }

  /** Resolves when every queued e-mail has been attempted. */
  whenIdle(): Promise<void> {
    return this.queue;
  }

  private async sendOne(notification: QuartileNotification): Promise<void> {
    const data = notification.toJSON();
    const recipient = this.recipientOf(data.studentCPF);
    if (!recipient || !recipient.email) {
      notification.registerEmail('Ignorado', 'Aluno sem e-mail cadastrado');
      return;
    }
    const className = this.classNameOf(data.classId);
    try {
      const result = await this.emailSender.send(
        recipient.email,
        `Desempenho na turma ${className}`,
        `Olá ${recipient.name},\n\n${data.message}\n\nTurma: ${className}.`
      );
      if (result.aceito) {
        notification.registerEmail('Enviado');
      } else {
        notification.registerEmail('Falha', result.descricaoFalha ?? 'O e-mail não foi aceito');
      }
    } catch (error) {
      console.error('Failed to send quartile notification e-mail:', error);
      notification.registerEmail('Falha', 'Falha ao enviar o e-mail');
    }
  }
}
