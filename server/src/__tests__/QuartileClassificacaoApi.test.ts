import request from 'supertest';
import { app, studentSet, classes, services, quartileNotifications as notificationCenter } from '../server';
import { EmailSenderSimulado } from '../models/EmailSender';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { QuartileNotification } from '../models/QuartileNotification';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';

type Grade = 'MA' | 'MPA' | 'MANA';

// Grades of the first five goals and of the last one ("Refactoring"). The ranking
// Ana > Bia > Caio > Davi holds before and after the last grade, so quartiles
// never change and only the classification notification is generated:
//   Ana 50 -> 60, Bia 35 -> 42, Caio 14 -> 21, Davi 0 -> 0   =>  Q4, Q3, Q2, Q1
const STUDENTS = [
  { name: 'Ana Souza', cpf: '11111111111', email: 'ana@email.com',  first: ['MA', 'MA', 'MA', 'MA', 'MA'],           last: 'MA' },
  { name: 'Bia Lima',  cpf: '22222222222', email: 'bia@email.com',  first: ['MPA', 'MPA', 'MPA', 'MPA', 'MPA'],      last: 'MPA' },
  { name: 'Caio Melo', cpf: '33333333333', email: 'caio@email.com', first: ['MANA', 'MPA', 'MANA', 'MPA', 'MANA'],   last: 'MPA' },
  { name: 'Davi Reis', cpf: '44444444444', email: 'davi@email.com', first: ['MANA', 'MANA', 'MANA', 'MANA', 'MANA'], last: 'MANA' }
] as { name: string; cpf: string; email: string; first: Grade[]; last: Grade }[];
const [ANA, BIA, CAIO, DAVI] = STUDENTS;
const CLASS_ID = 'ESS-2026-2';
const LAST_GOAL = EVALUATION_GOALS[EVALUATION_GOALS.length - 1];

const grade = (cpf: string, goal: string, value: Grade) =>
  request(app).put(`/api/classes/${CLASS_ID}/enrollments/${cpf}/evaluation`).send({ goal, grade: value });
const notificationsOf = async (cpf: string) => (await request(app).get(`/api/students/${cpf}/notifications`)).body;
const finishGrading = async (student: typeof STUDENTS[number]) => (await grade(student.cpf, LAST_GOAL, student.last)).status;

describe('Classification notification after every grade of the class was entered', () => {
  beforeEach(() => {
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    notificationCenter.restore();
    (services.gradeNotificationSender as EmailSenderSimulado).enviados.length = 0;

    const classObj = new Class('ESS', new PeriodoAcademico(2026, 2), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    classes.addClass(classObj);
    STUDENTS.forEach(s => {
      const enrollment = classObj.addEnrollment(studentSet.addStudent(new Student(s.name, s.cpf, s.email)));
      s.first.forEach((g, i) => enrollment.addOrUpdateEvaluation(EVALUATION_GOALS[i], g));
    });
    notificationCenter.refreshClass(classObj); // first classification: silent
  });

  test('the class has 6 evaluation goals', () => {
    expect(EVALUATION_GOALS).toEqual(['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring']);
  });

  test('nobody is notified while some grade of the class is still missing', async () => {
    for (const student of [ANA, BIA, CAIO]) {
      expect(await finishGrading(student)).toBe(200);
    }
    for (const student of STUDENTS) {
      expect(await notificationsOf(student.cpf)).toEqual([]);
    }
  });

  test('once the last grade is entered, every student is told their own quartile', async () => {
    for (const student of STUDENTS) {
      expect(await finishGrading(student)).toBe(200);
    }

    const expected: [typeof ANA, number, string][] = [
      [ANA, 4, 'quarto quartil da turma (grupo dos 25% com maior desempenho)'],
      [BIA, 3, 'terceiro quartil da turma (grupo entre os 50% e 75%)'],
      [CAIO, 2, 'segundo quartil da turma (grupo entre os 25% e 50%)'],
      [DAVI, 1, 'primeiro quartil da turma (grupo dos 25% com menor desempenho)']
    ];
    for (const [student, quartile, text] of expected) {
      const notifications = await notificationsOf(student.cpf);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        studentCPF: student.cpf, classId: CLASS_ID, direction: 'classification',
        previousQuartile: null, newQuartile: quartile, read: false,
        message: `Todas as notas da turma foram lançadas. Você está no ${text}.`
      });
    }
  });

  test('the same completion is not notified twice', async () => {
    for (const student of STUDENTS) await finishGrading(student);
    await finishGrading(DAVI);
    await finishGrading(DAVI);

    for (const student of STUDENTS) {
      expect(await notificationsOf(student.cpf)).toHaveLength(1);
    }
    expect(notificationCenter.refreshClass(classes.findClassById(CLASS_ID)!)).toEqual([]);
  });

  test('a grade changed after the completion is notified only if the quartile changes', async () => {
    for (const student of STUDENTS) await finishGrading(student);

    await grade(ANA.cpf, 'Design', 'MPA'); // 60 -> 57, still the best: nothing new
    expect(await notificationsOf(ANA.cpf)).toHaveLength(1);

    await grade(DAVI.cpf, 'Design', 'MA'); // 0 -> 10 points, still below Caio (21): still Q1
    expect(await notificationsOf(DAVI.cpf)).toHaveLength(1);

    await grade(DAVI.cpf, 'Tests', 'MA'); // 20 points, still below Caio: still Q1
    await grade(DAVI.cpf, 'Project Management', 'MPA'); // 27 points: Davi passes Caio
    const davi = await notificationsOf(DAVI.cpf);
    expect(davi.map((n: any) => n.direction)).toEqual(['improvement', 'classification']);
    expect(davi[0]).toMatchObject({ previousQuartile: 1, newQuartile: 2 });
    expect((await notificationsOf(CAIO.cpf)).map((n: any) => n.direction)).toEqual(['decline', 'classification']);
  });

  test('quartile changes while the class is incomplete are not notified, only the final quartile is', async () => {
    // Davi 0 -> 30 points passes Caio (14) and Bia stays above: Davi Q2, Caio Q1, but the class is incomplete
    await grade(DAVI.cpf, 'Requirements', 'MA');
    await grade(DAVI.cpf, 'Configuration Management', 'MA');
    await grade(DAVI.cpf, 'Design', 'MA');
    for (const student of STUDENTS) {
      expect(await notificationsOf(student.cpf)).toEqual([]);
    }

    for (const student of STUDENTS) await finishGrading(student);

    // final points: Ana 60, Bia 42, Caio 21 (last grade MPA), Davi 30
    const quartiles = await Promise.all(STUDENTS.map(async s => {
      const notifications = await notificationsOf(s.cpf);
      expect(notifications.map((n: any) => n.direction)).toEqual(['classification']);
      return notifications[0].newQuartile;
    }));
    expect(quartiles).toEqual([4, 3, 1, 2]);
  });

  test('a class with fewer than 4 students has no quartiles and sends no classification', async () => {
    await request(app).delete(`/api/classes/${CLASS_ID}/enroll/${DAVI.cpf}`);
    for (const student of [ANA, BIA, CAIO]) await finishGrading(student);

    for (const student of [ANA, BIA, CAIO]) {
      expect(await notificationsOf(student.cpf)).toEqual([]);
    }
  });

  test('each student only sees their own classification, with nothing about the others', async () => {
    for (const student of STUDENTS) await finishGrading(student);

    const davi = await notificationsOf(DAVI.cpf);
    expect(davi.every((n: any) => n.studentCPF === DAVI.cpf)).toBe(true);
    const seen = JSON.stringify(davi);
    ['Ana Souza', 'Bia Lima', 'Caio Melo', ANA.cpf, BIA.cpf, CAIO.cpf].forEach(secret => expect(seen).not.toContain(secret));
  });

  test('the announcement state survives a save and load of the center', async () => {
    for (const student of STUDENTS) await finishGrading(student);
    const state = JSON.parse(JSON.stringify(notificationCenter.toJSON()));

    notificationCenter.restore(state);
    await finishGrading(DAVI);
    expect(await notificationsOf(DAVI.cpf)).toHaveLength(1);
  });

  test('a class already fully graded when loaded is not announced afterwards', async () => {
    const classObj = classes.findClassById(CLASS_ID)!;
    classObj.getEnrollments().forEach((e, i) => e.addOrUpdateEvaluation(LAST_GOAL, STUDENTS[i].last));
    notificationCenter.restore(); // data saved before this feature: no announcement state
    notificationCenter.recordCurrentQuartiles(classObj);

    await finishGrading(DAVI);
    for (const student of STUDENTS) {
      expect(await notificationsOf(student.cpf)).toEqual([]);
    }
  });
});

describe('QuartileNotification.forClassification', () => {
  test.each([[1, 'primeiro', 'menor'], [4, 'quarto', 'maior']] as const)('Q%i message', (quartile, ordinal, side) => {
    const n = QuartileNotification.forClassification(1, '11111111111', 'ESS-2026-2', quartile, new Date('2026-11-22T10:00:00Z')).toJSON();
    expect(n.direction).toBe('classification');
    expect(n.previousQuartile).toBeNull();
    expect(n.message).toContain(`${ordinal} quartil`);
    expect(n.message).toContain(`${side} desempenho`);
  });
});
