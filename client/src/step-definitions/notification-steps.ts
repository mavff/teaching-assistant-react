import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(60 * 1000);

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';
const CLASS = { topic: 'Notifications Test', semester: 1, year: 2099 };
const CLASS_ID = `${CLASS.topic}-${CLASS.year}-${CLASS.semester}`;

let browser: Browser;
let page: Page;
let students: { name: string; cpf: string }[] = [];

const cpfOf = (name: string) => {
  const student = students.find(s => s.name === name);
  if (!student) throw new Error(`Unknown test student ${name}`);
  return student.cpf;
};

const api = async (method: string, path: string, body?: unknown) =>
  fetch(`${serverUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

/** Classes can only be created after an e-mail for the classes is registered. */
async function ensureClassesEmail() {
  const { emailDasTurmas } = await (await api('GET', '/api/classes/email')).json();
  if (!emailDasTurmas) {
    expect((await api('PUT', '/api/classes/email', { emailDasTurmas: 'courses@example.test' })).status).toBe(200);
  }
}

async function removeTestData() {
  await api('DELETE', `/api/classes/${encodeURIComponent(CLASS_ID)}`);
  for (const student of students) {
    await api('DELETE', `/api/students/${student.cpf}`);
  }
}

Before({ tags: '@notifications' }, async function () {
  browser = await launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@notifications' }, async function () {
  await removeTestData();
  students = [];
  await browser?.close();
});

// Goals in the order used by the class; "Refactoring" is the last one
const GOALS = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];
let lastGrades = new Map<string, string>();

Given('a complete class with four graded students:', async function (table: DataTable) {
  const rows = table.hashes();
  students = rows.map(r => ({ name: r.name, cpf: r.cpf }));
  await removeTestData(); // leftovers of an interrupted run

  await ensureClassesEmail();
  expect((await api('POST', '/api/classes', CLASS)).status).toBe(201);
  const classPath = `/api/classes/${encodeURIComponent(CLASS_ID)}`;
  for (const row of rows) {
    // No e-mail on purpose: the e-mail of each notification is then ignored and no real message is sent
    expect((await api('POST', '/api/students', { name: row.name, cpf: row.cpf, email: '' })).status).toBe(201);
    expect((await api('POST', `${classPath}/enroll`, { studentCPF: row.cpf })).status).toBe(201);
  }
  // Student by student; the goals other than Requirements and Design are MANA (0 points).
  // The class is complete, and announced, when the last grade of the last student is entered.
  for (const row of rows) {
    for (const goal of GOALS) {
      const grade = goal === 'Requirements' ? row.requirements : goal === 'Design' ? row.design : 'MANA';
      const response = await api('PUT', `${classPath}/enrollments/${row.cpf}/evaluation`, { goal, grade });
      expect(response.status).toBe(200);
    }
  }
  // each student was told their quartile once, and nothing else
  for (const row of rows) {
    const notifications = await (await api('GET', `/api/students/${row.cpf}/notifications`)).json();
    expect(notifications.map((n: any) => [n.direction, n.newQuartile])).toEqual([['classification', Number(row.quartile)]]);
  }
});

Given('a class whose students have every grade except {string}:', async function (lastGoal: string, table: DataTable) {
  expect(GOALS[GOALS.length - 1]).toBe(lastGoal);
  const rows = table.hashes();
  students = rows.map(r => ({ name: r.name, cpf: r.cpf }));
  lastGrades = new Map(rows.map(r => [r.cpf, r.refactoring]));
  await removeTestData();

  await ensureClassesEmail();
  expect((await api('POST', '/api/classes', CLASS)).status).toBe(201);
  const classPath = `/api/classes/${encodeURIComponent(CLASS_ID)}`;
  for (const row of rows) {
    // No e-mail on purpose: the e-mail of each notification is then ignored and no real message is sent
    expect((await api('POST', '/api/students', { name: row.name, cpf: row.cpf, email: '' })).status).toBe(201);
    expect((await api('POST', `${classPath}/enroll`, { studentCPF: row.cpf })).status).toBe(201);
  }
  for (const row of rows) {
    const grades = row.grades.split(',');
    for (let i = 0; i < grades.length; i++) {
      const response = await api('PUT', `${classPath}/enrollments/${row.cpf}/evaluation`, { goal: GOALS[i], grade: grades[i] });
      expect(response.status).toBe(200);
    }
  }
});

When('the {string} grade is entered for {string}', async function (goal: string, name: string) {
  const cpf = cpfOf(name);
  const response = await api(
    'PUT',
    `/api/classes/${encodeURIComponent(CLASS_ID)}/enrollments/${cpf}/evaluation`,
    { goal, grade: lastGrades.get(cpf) }
  );
  expect(response.status).toBe(200);
});

When('the design grade of {string} is updated to {string}', async function (name: string, grade: string) {
  const response = await api(
    'PUT',
    `/api/classes/${encodeURIComponent(CLASS_ID)}/enrollments/${cpfOf(name)}/evaluation`,
    { goal: 'Design', grade }
  );
  expect(response.status).toBe(200);
});

async function openNotifications(name: string) {
  await page.goto(baseUrl);
  await page.waitForSelector('[data-testid="student-notifications-tab"]');
  await page.click('[data-testid="student-notifications-tab"]');
  await page.waitForSelector('[data-testid="notifications-cpf-input"]');
  await page.type('[data-testid="notifications-cpf-input"]', cpfOf(name));
  await page.click('[data-testid="notifications-search-button"]');
  await page.waitForSelector('[data-testid="notification-item"], [data-testid="notifications-empty"]');
}

const itemTexts = async (testId: string) =>
  page.$$eval(`[data-testid="notification-item"] [data-testid="${testId}"]`, els => els.map(e => e.textContent ?? ''));

When('{string} opens the notifications tab', async function (name: string) {
  await openNotifications(name);
});

const itemByKind = async (kind: string) => {
  for (const item of await page.$$('[data-testid="notification-item"]')) {
    const text = await item.$eval('[data-testid="notification-direction"]', e => e.textContent ?? '');
    if (text === kind) return item;
  }
  throw new Error(`There is no "${kind}" notification on the page`);
};

Then('{string} sees {int} notification(s)', async function (_name: string, count: number) {
  expect(await page.$$('[data-testid="notification-item"]')).toHaveLength(count);
});

Then('{string} sees no notifications on the notifications tab', async function (name: string) {
  await openNotifications(name);
  expect(await page.$$('[data-testid="notification-item"]')).toHaveLength(0);
  expect(await page.$('[data-testid="notifications-empty"]')).not.toBeNull();
});

Then('{string} sees only the classification notification', async function (_name: string) {
  expect(await itemTexts('notification-direction')).toEqual(['Classificação']);
});

Then('{string} has only the classification notification on the notifications tab', async function (name: string) {
  await openNotifications(name);
  expect(await itemTexts('notification-direction')).toEqual(['Classificação']);
});

Then('the notifications include a quartile change from {string} to {string}', async function (from: string, to: string) {
  expect(await itemTexts('notification-reason')).toContain(`Mudança de quartil: ${from} → ${to}`);
});

Then('the notifications include the message {string}', async function (message: string) {
  expect(await itemTexts('notification-message')).toContain(message);
});

Then('the {string} notification is unread', async function (kind: string) {
  const item = await itemByKind(kind);
  expect(await item.$eval('[data-testid="notification-status"]', e => e.textContent)).toBe('Não lida');
});

Then('the {string} notification is read', async function (kind: string) {
  const item = await itemByKind(kind);
  expect(await item.$eval('[data-testid="notification-status"]', e => e.textContent)).toBe('Lida');
});

Then('the notification is shown as {string} and unread', async function (kind: string) {
  expect(await itemTexts('notification-direction')).toEqual([kind]);
  expect(await itemTexts('notification-status')).toEqual(['Não lida']);
});

Then('the notification e-mail result is {string}', async function (result: string) {
  expect(await itemTexts('notification-email')).toEqual([`E-mail: ${result}`]);
});

Then('the notification message is {string}', async function (message: string) {
  expect(await itemTexts('notification-message')).toEqual([message]);
});

Then('every notification shows when it was generated', async function () {
  const dates = await itemTexts('notification-date');
  expect(dates.length).toBeGreaterThan(0);
  dates.forEach(date => expect(date).toMatch(/\d{2}\/\d{2}\/\d{4}/));
});

Then('the notifications page shows nothing about {string}, {string} or {string}', async function (a: string, b: string, c: string) {
  const text = await page.$eval('[data-testid="notifications"]', el => el.textContent ?? '');
  for (const name of [a, b, c]) {
    expect(text).not.toContain(name.split(' ')[0]);
    expect(text).not.toContain(cpfOf(name));
  }
});

When('{string} marks the {string} notification as read', async function (_name: string, kind: string) {
  const item = await itemByKind(kind);
  const button = await item.$('[data-testid="notification-mark-read"]');
  if (!button) throw new Error(`The "${kind}" notification has no mark-as-read button`);
  await button.click();
  await page.waitForFunction(
    (label: string) => Array.from(document.querySelectorAll('[data-testid="notification-item"]')).some(el =>
      el.querySelector('[data-testid="notification-direction"]')?.textContent === label &&
      el.querySelector('[data-testid="notification-status"]')?.textContent === 'Lida'),
    {},
    kind
  );
});
