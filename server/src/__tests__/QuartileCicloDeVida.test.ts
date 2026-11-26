import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import request from 'supertest';
import { app, studentSet, classes, services, quartileNotifications, quartileNotifier } from '../server';
import { EmailSenderSimulado } from '../models/EmailSender';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS, Grade } from '../models/Evaluation';

// Final points: Ana 60, Bia 42, Caio 10, Davi 0  =>  Q4, Q3, Q2, Q1
const PEOPLE: { name: string; cpf: string; first: Grade; last: Grade }[] = [
  { name: 'Ana Souza', cpf: '11111111111', first: 'MA',   last: 'MA' },
  { name: 'Bia Lima',  cpf: '22222222222', first: 'MPA',  last: 'MPA' },
  { name: 'Caio Melo', cpf: '33333333333', first: 'MANA', last: 'MA' },
  { name: 'Davi Reis', cpf: '44444444444', first: 'MANA', last: 'MANA' }
];
const CLASS_ID = 'ESS-2026-2';
const LAST_GOAL = EVALUATION_GOALS[EVALUATION_GOALS.length - 1];

const notificationsOf = async (cpf: string) => (await request(app).get(`/api/students/${cpf}/notifications`)).body;

/** A class that only misses the last grade of each student. */
const classMissingTheLastGrade = (students = studentSet, classCollection = classes) => {
  const classObj = new Class('ESS', new PeriodoAcademico(2026, 2), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
  classCollection.addClass(classObj);
  PEOPLE.forEach(p => {
    const enrollment = classObj.addEnrollment(students.addStudent(new Student(p.name, p.cpf, `${p.name.split(' ')[0].toLowerCase()}@aluno.test`)));
    EVALUATION_GOALS.slice(0, -1).forEach(goal => enrollment.addOrUpdateEvaluation(goal, p.first));
  });
  return classObj;
};
const finishGrading = async (classId = CLASS_ID) => {
  for (const p of PEOPLE) {
    await request(app).put(`/api/classes/${encodeURIComponent(classId)}/enrollments/${p.cpf}/evaluation`).send({ goal: LAST_GOAL, grade: p.last }).expect(200);
  }
  await quartileNotifier.whenIdle();
};

describe('Quartile notifications and the life of a class', () => {
  beforeEach(() => {
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    quartileNotifications.restore();
    (services.gradeNotificationSender as EmailSenderSimulado).enviados.length = 0;
    quartileNotifications.refreshClass(classMissingTheLastGrade());
  });

  test('renaming the class does not announce it again, and the notifications follow the new id', async () => {
    await finishGrading();
    const renamed = await request(app).put(`/api/classes/${CLASS_ID}`).send({ topic: 'ESS Renamed', semester: 2, year: 2026 });
    expect(renamed.status).toBe(200);
    const newId = 'ESS Renamed-2026-2';

    for (const p of PEOPLE) {
      const list = await notificationsOf(p.cpf);
      expect(list).toHaveLength(1);
      expect(list[0].classId).toBe(newId);
    }

    // a later change is a quartile change, not a second classification
    for (const goal of ['Design', 'Tests', 'Project Management']) {
      await request(app).put(`/api/classes/${encodeURIComponent(newId)}/enrollments/${PEOPLE[3].cpf}/evaluation`).send({ goal, grade: 'MA' }).expect(200);
    }
    const davi = await notificationsOf(PEOPLE[3].cpf);
    expect(davi.map((n: any) => n.direction)).toEqual(['improvement', 'classification']);
  });

  test('deleting the class forgets what was recorded about it', async () => {
    await finishGrading();
    expect((await request(app).delete(`/api/classes/${CLASS_ID}`)).status).toBe(204);

    const state = quartileNotifications.toJSON();
    expect(state.quartiles).toEqual([]);
    expect(state.announced).toEqual([]);
  });

  test('removing a student\'s enrollment recalculates the class: with 3 students it is no longer classified', async () => {
    await finishGrading();
    await request(app).delete(`/api/classes/${CLASS_ID}/enroll/${PEOPLE[3].cpf}`).expect(204);
    await request(app).put(`/api/classes/${CLASS_ID}/enrollments/${PEOPLE[0].cpf}/evaluation`).send({ goal: 'Design', grade: 'MANA' }).expect(200);

    expect(await notificationsOf(PEOPLE[0].cpf)).toHaveLength(1); // only the classification of before
    expect(quartileNotifications.toJSON().quartiles).toEqual([]);
  });

  test('deleting a student discards their notifications, so a reused CPF does not inherit them', async () => {
    await finishGrading();
    await request(app).delete(`/api/students/${PEOPLE[3].cpf}`).expect(204);
    await request(app).post('/api/students').send({ name: 'Novo', cpf: PEOPLE[3].cpf, email: 'novo@aluno.test' }).expect(201);
    expect(await notificationsOf(PEOPLE[3].cpf)).toEqual([]);
  });

  test('a student can only read and mark as read their own notifications', async () => {
    await finishGrading();
    const [ana] = await notificationsOf(PEOPLE[0].cpf);

    expect((await request(app).put(`/api/students/${PEOPLE[1].cpf}/notifications/${ana.id}/read`)).status).toBe(404);
    expect((await notificationsOf(PEOPLE[0].cpf))[0].read).toBe(false);
    expect((await request(app).put(`/api/students/${PEOPLE[0].cpf}/notifications/${ana.id}/read`)).status).toBe(200);
    expect((await notificationsOf(PEOPLE[0].cpf))[0].read).toBe(true);
    expect((await request(app).get('/api/students/99999999999/notifications')).status).toBe(404);
  });
});

describe('Quartile notifications in the data file', () => {
  let pasta: string;
  let arquivo: string;
  const pastaAnterior = process.cwd();
  const ambienteAnterior = { env: process.env.NODE_ENV, user: process.env.GMAIL_USER, senha: process.env.GMAIL_APP_PASSWORD };

  const carregarServidor = (): typeof import('../server') => {
    let servidor!: typeof import('../server');
    jest.isolateModules(() => { servidor = require('../server'); });
    return servidor;
  };

  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'ta-quartis-'));
    arquivo = join(pasta, 'data', 'app-data.json');
    mkdirSync(dirname(arquivo), { recursive: true });
    process.chdir(pasta);
    process.env.NODE_ENV = 'development'; // enables loading and saving the file
    delete process.env.GMAIL_USER; // nothing here may send a real e-mail
    delete process.env.GMAIL_APP_PASSWORD;
  });

  afterEach(() => {
    process.chdir(pastaAnterior);
    process.env.NODE_ENV = ambienteAnterior.env;
    if (ambienteAnterior.user !== undefined) process.env.GMAIL_USER = ambienteAnterior.user;
    if (ambienteAnterior.senha !== undefined) process.env.GMAIL_APP_PASSWORD = ambienteAnterior.senha;
    rmSync(pasta, { recursive: true, force: true });
  });

  const completeTheClass = (servidor: typeof import('../server')) => {
    const classObj = classMissingTheLastGrade(servidor.studentSet, servidor.classes);
    classObj.getEnrollments().forEach((e, i) => e.addOrUpdateEvaluation(LAST_GOAL, PEOPLE[i].last));
    return servidor.quartileNotifications.refreshClass(classObj);
  };

  test('notifications, read status and announcements survive a restart, without duplicates', () => {
    writeFileSync(arquivo, JSON.stringify({ students: [], classes: [] }), 'utf8');
    const inicial = carregarServidor();
    const criadas = completeTheClass(inicial);
    expect(criadas).toHaveLength(4);
    inicial.quartileNotifications.markAsRead(PEOPLE[0].cpf, criadas[0].getId());
    expect(inicial.saveDataToFile()).toBe(true);

    const gravado = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(gravado.notificacoesDeQuartil.notifications).toHaveLength(4);

    const reiniciado = carregarServidor();
    const ana = reiniciado.quartileNotifications.getNotificationsOf(PEOPLE[0].cpf);
    expect(ana).toHaveLength(1);
    expect(ana[0].toJSON()).toMatchObject({ read: true, direction: 'classification', newQuartile: 4 });
    // the same data again creates nothing
    expect(reiniciado.quartileNotifications.refreshClass(reiniciado.classes.getAllClasses()[0])).toEqual([]);
  });

  test('a data file written before quartile notifications existed is read without creating notifications', () => {
    const anterior = carregarServidor();
    completeTheClass(anterior);
    // a complete class saved by a version that knew nothing about quartile notifications
    anterior.saveDataToFile();
    const arquivoAntigo = JSON.parse(readFileSync(arquivo, 'utf8'));
    delete arquivoAntigo.notificacoesDeQuartil;
    writeFileSync(arquivo, JSON.stringify(arquivoAntigo), 'utf8');

    const reiniciado = carregarServidor();
    for (const p of PEOPLE) {
      expect(reiniciado.quartileNotifications.getNotificationsOf(p.cpf)).toEqual([]);
    }
    // an unrelated update does not announce the class now
    expect(reiniciado.quartileNotifications.refreshClass(reiniciado.classes.getAllClasses()[0])).toEqual([]);
  });
});
