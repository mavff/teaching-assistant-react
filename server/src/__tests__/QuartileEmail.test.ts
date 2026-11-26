import request from 'supertest';
import { app, studentSet, classes, services, quartileNotifications, quartileNotifier } from '../server';
import { EmailSenderSimulado, EmailSenderSmtp } from '../models/EmailSender';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS, Grade } from '../models/Evaluation';
import { QuartileNotification } from '../models/QuartileNotification';
import { QuartileNotifier } from '../models/QuartileNotifier';

// Final points: Ana 60, Bia 42, Caio 10, Davi 0  =>  Q4, Q3, Q2, Q1 (as in the other quartile tests)
const PEOPLE: { name: string; cpf: string; email: string; first: Grade; last: Grade }[] = [
  { name: 'Ana Souza', cpf: '11111111111', email: 'ana@aluno.test',  first: 'MA',   last: 'MA' },
  { name: 'Bia Lima',  cpf: '22222222222', email: 'bia@aluno.test',  first: 'MPA',  last: 'MPA' },
  { name: 'Caio Melo', cpf: '33333333333', email: 'caio@aluno.test', first: 'MANA', last: 'MA' },
  { name: 'Davi Reis', cpf: '44444444444', email: '',                first: 'MANA', last: 'MANA' }
];
const CLASS_ID = 'ESS-2026-2';
const LAST_GOAL = EVALUATION_GOALS[EVALUATION_GOALS.length - 1];

const mailbox = () => services.gradeNotificationSender as EmailSenderSimulado;
const quartileEmails = () => mailbox().enviados.filter(e => e.assunto.startsWith('Desempenho na turma'));
const notificationsOf = async (cpf: string) => (await request(app).get(`/api/students/${cpf}/notifications`)).body;
const finishGrading = async () => {
  for (const p of PEOPLE) {
    await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${p.cpf}/evaluation`).send({ goal: LAST_GOAL, grade: p.last }).expect(200);
  }
  await quartileNotifier.whenIdle();
};

describe('E-mail that accompanies the quartile notifications', () => {
  beforeEach(() => {
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    quartileNotifications.restore();
    mailbox().enviados.length = 0;

    const classObj = new Class('ESS', new PeriodoAcademico(2026, 2), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    classes.addClass(classObj);
    PEOPLE.forEach(p => {
      const enrollment = classObj.addEnrollment(studentSet.addStudent(new Student(p.name, p.cpf, p.email)));
      EVALUATION_GOALS.slice(0, -1).forEach(goal => enrollment.addOrUpdateEvaluation(goal, p.first));
    });
    quartileNotifications.refreshClass(classObj); // silent baseline: the class is still incomplete
  });

  test('nothing is e-mailed while the class is incomplete', async () => {
    await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${PEOPLE[0].cpf}/evaluation`).send({ goal: LAST_GOAL, grade: 'MA' }).expect(200);
    await quartileNotifier.whenIdle();
    expect(quartileEmails()).toEqual([]);
  });

  test('when the class is complete, each student is e-mailed their own quartile at their own address', async () => {
    await finishGrading();

    const emails = quartileEmails();
    expect(emails.map(e => e.destinatario).sort()).toEqual(['ana@aluno.test', 'bia@aluno.test', 'caio@aluno.test']);
    const ana = emails.find(e => e.destinatario === 'ana@aluno.test')!;
    expect(ana.assunto).toBe('Desempenho na turma ESS');
    expect(ana.conteudo).toContain('Olá Ana Souza');
    expect(ana.conteudo).toContain('quarto quartil da turma (grupo dos 25% com maior desempenho)');
    // privacy: nothing about the other students
    ['Bia', 'Caio', 'Davi', PEOPLE[1].cpf].forEach(other => expect(ana.conteudo).not.toContain(other));
  });

  test('the result of the e-mail is kept in the notification', async () => {
    await finishGrading();

    expect((await notificationsOf(PEOPLE[0].cpf))[0]).toMatchObject({ emailResult: 'Enviado' });
    // Davi has no e-mail registered: the notification exists, the e-mail is ignored
    expect((await notificationsOf(PEOPLE[3].cpf))[0]).toMatchObject({ direction: 'classification', emailResult: 'Ignorado', emailFailure: 'Aluno sem e-mail cadastrado' });
  });

  test('a quartile change is e-mailed too, only to who changed, and the same update sends nothing again', async () => {
    await finishGrading();
    mailbox().enviados.length = 0;

    // Caio 10 -> 20 points: still below Bia (42) and above Davi (0), so no quartile changes
    await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${PEOPLE[2].cpf}/evaluation`).send({ goal: 'Design', grade: 'MA' }).expect(200);
    await quartileNotifier.whenIdle();
    expect(quartileEmails()).toEqual([]);

    // Davi 0 -> 30 points passes Caio (20): Davi moves up, Caio moves down
    for (const goal of ['Requirements', 'Configuration Management', 'Project Management']) {
      await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${PEOPLE[3].cpf}/evaluation`).send({ goal, grade: 'MA' }).expect(200);
    }
    await quartileNotifier.whenIdle();
    expect(quartileEmails().map(e => e.destinatario)).toEqual(['caio@aluno.test']); // Caio dropped; Davi has no address

    mailbox().enviados.length = 0;
    await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${PEOPLE[3].cpf}/evaluation`).send({ goal: 'Project Management', grade: 'MA' }).expect(200);
    await quartileNotifier.whenIdle();
    expect(quartileEmails()).toEqual([]);
  });
});

describe('QuartileNotifier', () => {
  const notification = (id: number, cpf = '11111111111') =>
    QuartileNotification.forClassification(id, cpf, 'ESS-2026-2', 4, new Date('2026-11-25T10:00:00Z'));
  const recipients: Record<string, { name: string; email: string }> = {
    '11111111111': { name: 'Ana Souza', email: 'ana@aluno.test' },
    '22222222222': { name: 'Bia Lima', email: 'bia@aluno.test' }
  };
  const recipientOf = (cpf: string) => recipients[cpf];

  test('records Falha with the reason when the e-mail is not accepted, and goes on with the next one', async () => {
    const sender = { send: jest.fn()
      .mockResolvedValueOnce({ aceito: false, descricaoFalha: 'O Gmail recusou a autenticação do remetente.' })
      .mockResolvedValueOnce({ aceito: true }) };
    const notifier = new QuartileNotifier(sender, recipientOf, () => 'ESS');
    const first = notification(1);
    const second = notification(2, '22222222222');

    notifier.send([first, second]);
    await notifier.whenIdle();

    expect(first.toJSON()).toMatchObject({ emailResult: 'Falha', emailFailure: 'O Gmail recusou a autenticação do remetente.' });
    expect(second.toJSON()).toMatchObject({ emailResult: 'Enviado' });
  });

  test('records Falha when the sender throws, without losing the notification', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const notifier = new QuartileNotifier({ send: jest.fn().mockRejectedValue(new Error('rede')) }, recipientOf, () => 'ESS');
    const only = notification(1);

    notifier.send([only]);
    await notifier.whenIdle();

    expect(only.toJSON()).toMatchObject({ emailResult: 'Falha', emailFailure: 'Falha ao enviar o e-mail' });
    jest.restoreAllMocks();
  });

  test('asks for the results to be saved once per batch, and sends nothing for an empty batch', async () => {
    const saved = jest.fn();
    const sender = new EmailSenderSimulado();
    const notifier = new QuartileNotifier(sender, recipientOf, () => 'ESS', saved);

    notifier.send([]);
    notifier.send([notification(1), notification(2, '22222222222')]);
    await notifier.whenIdle();

    expect(sender.enviados.map(e => e.destinatario)).toEqual(['ana@aluno.test', 'bia@aluno.test']);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  test('with the real Gmail sender and no credentials configured, the result is Falha and nothing is sent', async () => {
    const user = process.env.GMAIL_USER;
    const password = process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    try {
      const only = notification(1);
      const notifier = new QuartileNotifier(new EmailSenderSmtp(), recipientOf, () => 'ESS');
      notifier.send([only]);
      await notifier.whenIdle();
      expect(only.toJSON()).toMatchObject({ emailResult: 'Falha', emailFailure: 'Configure GMAIL_USER para enviar e-mails.' });
    } finally {
      if (user !== undefined) process.env.GMAIL_USER = user;
      if (password !== undefined) process.env.GMAIL_APP_PASSWORD = password;
    }
  });
});
