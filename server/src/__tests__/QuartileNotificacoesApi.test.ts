import request from 'supertest';
import { app, studentSet, classes, services, quartileNotifications as notificationCenter } from '../server';
import { EmailSenderSimulado } from '../models/EmailSender';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { EspecificacaoDoCalculoDaMedia } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';

type Grade = 'MA' | 'MPA' | 'MANA';

// Four students whose performances (sum of points / 6 goals) are all different
// (the other four goals are MANA for everyone, so they add 0 points):
//   Ana (20) > Bia (14) > Caio (7) > Davi (0)  =>  Q4, Q3, Q2, Q1
const STUDENTS = [
  { name: 'Ana Souza',  cpf: '11111111111', email: 'ana@email.com',  grades: ['MA', 'MA'] },
  { name: 'Bia Lima',   cpf: '22222222222', email: 'bia@email.com',  grades: ['MPA', 'MPA'] },
  { name: 'Caio Melo',  cpf: '33333333333', email: 'caio@email.com', grades: ['MANA', 'MPA'] },
  { name: 'Davi Reis',  cpf: '44444444444', email: 'davi@email.com', grades: ['MANA', 'MANA'] }
] as { name: string; cpf: string; email: string; grades: [Grade, Grade] }[];
const [ANA, BIA, CAIO, DAVI] = STUDENTS.map(s => s.cpf);
const ESPECIFICACAO_TESTE = new EspecificacaoDoCalculoDaMedia(
  new Map([['MA', 10], ['MPA', 7], ['MANA', 0]]),
  new Map(EVALUATION_GOALS.map(meta => [meta, 1]))
);
const CLASS_ID = 'ESS-2026-2';

const grade = (cpf: string, goal: string, value: Grade) =>
  request(app).put(`/api/classes/${CLASS_ID}/enrollments/${cpf}/evaluation`).send({ goal, grade: value });
const notificationsOf = async (cpf: string) => (await request(app).get(`/api/students/${cpf}/notifications`)).body;

describe('Quartile-change notifications', () => {
  beforeEach(() => {
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    notificationCenter.restore();
    (services.gradeNotificationSender as EmailSenderSimulado).enviados.length = 0;

    const classObj = new Class('ESS', new PeriodoAcademico(2026, 2), ESPECIFICACAO_TESTE);
    classes.addClass(classObj);
    STUDENTS.forEach(s => {
      const student = studentSet.addStudent(new Student(s.name, s.cpf, s.email));
      const enrollment = classObj.addEnrollment(student);
      EVALUATION_GOALS.forEach(goal => enrollment.addOrUpdateEvaluation(goal, 'MANA'));
      enrollment.addOrUpdateEvaluation('Requirements', s.grades[0]);
      enrollment.addOrUpdateEvaluation('Design', s.grades[1]);
    });
    // the class is complete and was already announced (as when loaded from the data file)
    notificationCenter.recordCurrentQuartiles(classObj);
  });

  test('a class that was already complete when loaded generates no notification', async () => {
    for (const cpf of [ANA, BIA, CAIO, DAVI]) {
      expect(await notificationsOf(cpf)).toEqual([]);
    }
  });

  test('a student who changes quartile receives a notification with the previous and the new quartile', async () => {
    // Davi goes from 0 to 10 points: passes Caio (7) and stays below Bia (14)
    expect((await grade(DAVI, 'Design', 'MA')).status).toBe(200);

    const notifications = await notificationsOf(DAVI);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      studentCPF: DAVI, classId: CLASS_ID, previousQuartile: 1, newQuartile: 2, direction: 'improvement', read: false,
      message: 'Parabéns! Seu desempenho apresentou evolução e você avançou para o segundo quartil da turma.'
    });
    expect(new Date(notifications[0].createdAt).getTime()).not.toBeNaN();
  });

  test('the student who is overtaken receives an informative notification about the decline', async () => {
    await grade(DAVI, 'Design', 'MA');

    const notifications = await notificationsOf(CAIO);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ previousQuartile: 2, newQuartile: 1, direction: 'decline' });
    expect(notifications[0].message).toContain('redução');
  });

  test('students whose quartile did not change are not notified', async () => {
    await grade(DAVI, 'Design', 'MA');

    expect(await notificationsOf(ANA)).toEqual([]);
    expect(await notificationsOf(BIA)).toEqual([]);
  });

  test('an update that keeps every quartile generates no notification', async () => {
    // Ana 20 -> 17 points and Caio 7 -> 10 points: the ranking Ana > Bia(14) > Caio > Davi is kept
    await grade(ANA, 'Design', 'MPA');
    await grade(CAIO, 'Design', 'MA');

    for (const cpf of [ANA, BIA, CAIO, DAVI]) {
      expect(await notificationsOf(cpf)).toEqual([]);
    }
  });

  test('repeating the same update does not duplicate the notification', async () => {
    await grade(DAVI, 'Design', 'MA');
    await grade(DAVI, 'Design', 'MA');
    await grade(DAVI, 'Design', 'MA');

    expect(await notificationsOf(DAVI)).toHaveLength(1);
    expect(await notificationsOf(CAIO)).toHaveLength(1);
    expect(notificationCenter.refreshClass(classes.findClassById(CLASS_ID)!)).toEqual([]);
  });

  test('going back to the old quartile is a new change and is notified once more', async () => {
    await grade(DAVI, 'Design', 'MA');
    await grade(DAVI, 'Design', 'MANA');

    const notifications = await notificationsOf(DAVI);
    expect(notifications.map((n: any) => [n.previousQuartile, n.newQuartile])).toEqual([[2, 1], [1, 2]]);
  });

  describe('privacy', () => {
    test('a student only sees their own notifications, without data about other students', async () => {
      await grade(DAVI, 'Design', 'MA');

      const davi = await notificationsOf(DAVI);
      const caio = await notificationsOf(CAIO);
      expect(davi.every((n: any) => n.studentCPF === DAVI)).toBe(true);
      expect(caio.every((n: any) => n.studentCPF === CAIO)).toBe(true);

      const everythingSeen = JSON.stringify([davi, caio]);
      ['Ana Souza', 'Bia Lima', ANA, BIA, 'ana@email.com'].forEach(secret => expect(everythingSeen).not.toContain(secret));
      expect(JSON.stringify(davi)).not.toContain('Caio');
      expect(JSON.stringify(caio)).not.toContain('Davi');
    });

    test('a student cannot mark another student\'s notification as read', async () => {
      await grade(DAVI, 'Design', 'MA');
      const [daviNotification] = await notificationsOf(DAVI);

      const response = await request(app).put(`/api/students/${CAIO}/notifications/${daviNotification.id}/read`);
      expect(response.status).toBe(404);
      expect((await notificationsOf(DAVI))[0].read).toBe(false);
    });

    test('notifications of an unknown student are not found', async () => {
      expect((await request(app).get('/api/students/99999999999/notifications')).status).toBe(404);
    });
  });

  describe('integration: evaluation update -> recalculation -> notification -> interface API', () => {
    test('the notification becomes available to the student and can be marked as read', async () => {
      const update = await grade(DAVI, 'Design', 'MA');
      expect(update.status).toBe(200);
      expect(update.body.evaluations).toContainEqual({ goal: 'Design', grade: 'MA' });

      const [notification] = await notificationsOf(DAVI);
      expect(notification).toMatchObject({ previousQuartile: 1, newQuartile: 2, read: false });

      const read = await request(app).put(`/api/students/${DAVI}/notifications/${notification.id}/read`);
      expect(read.status).toBe(200);
      expect(read.body.read).toBe(true);
      expect((await notificationsOf(DAVI))[0].read).toBe(true);
    });

    test('removing a student\'s enrollment recalculates the class and notifies who changed quartile', async () => {
      // with 3 students left the class is no longer classified: nobody is notified
      await request(app).delete(`/api/classes/${CLASS_ID}/enroll/${ANA}`);
      expect(await notificationsOf(BIA)).toEqual([]);
    });

    test('deleting a student discards their notifications, so a reused CPF does not inherit them', async () => {
      await grade(DAVI, 'Design', 'MA');
      expect(await notificationsOf(DAVI)).toHaveLength(1);

      await request(app).delete(`/api/students/${DAVI}`);
      await request(app).post('/api/students').send({ name: 'Novo Aluno', cpf: DAVI, email: 'novo@email.com' });

      expect(await notificationsOf(DAVI)).toEqual([]);
    });

    test('state survives a save and load of the center', async () => {
      await grade(DAVI, 'Design', 'MA');
      const state = JSON.parse(JSON.stringify(notificationCenter.toJSON()));

      notificationCenter.restore(state);
      expect(await notificationsOf(DAVI)).toHaveLength(1);
      await grade(DAVI, 'Design', 'MA'); // same data again: still no duplicate
      expect(await notificationsOf(DAVI)).toHaveLength(1);
    });
  });
});
