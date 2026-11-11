import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import * as fs from 'fs';

setDefaultTimeout(30 * 1000);

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

let browser: Browser;
let page: Page;

// Seletores estáveis (data-cy) escopados pelo grupo, sem depender de classes CSS.
const grupo = (nome: string, interno = '') => `[data-cy="grupo-${nome}"] ${interno}`.trim();
const cy = (nome: string) => `[data-cy="${nome}"]`;

async function api(metodo: string, caminho: string, corpo?: object) {
  const resposta = await fetch(`${serverUrl}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

async function cadastrarMonitor(login: string) {
  expect((await api('POST', '/api/monitores', { login })).status).toBe(201);
}

async function criarGrupo(nome: string, alunos: string[]) {
  expect((await api('POST', '/api/grupos', { nome, alunos })).status).toBe(201);
}

async function abrirTelaDeGrupos(nomeDoGrupo: string) {
  await page.goto(baseUrl);
  await page.click('[data-testid="groups-tab"]');
  await page.waitForSelector(grupo(nomeDoGrupo));
}

async function textos(seletor: string): Promise<string[]> {
  return page.$$eval(seletor, els => els.map(el => (el.textContent || '').trim()));
}

Before({ tags: '@grupos-gui or @grupos-integracao' }, async function () {
  await api('POST', '/api/test/reset'); // cada cenário começa com o estado limpo
  const executablePath = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
  browser = await launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@grupos-gui or @grupos-integracao' }, async function () {
  await browser.close();
});

// ---------- Given ----------
Given('o grupo {string} existe com os alunos {string} e {string} e o monitor {string}',
  async (nome: string, aluno1: string, aluno2: string, monitor: string) => {
    await api('POST', '/api/monitores', { login: monitor });
    expect((await api('POST', '/api/grupos', { nome, alunos: [aluno1, aluno2] })).status).toBe(201);
    expect((await api('POST', `/api/grupos/${nome}/monitor`, { monitor })).status).toBe(201);
    await api('POST', '/api/test/reset-notificacoes'); // a alocação inicial não faz parte do cenário
  });

Given('o grupo {string} existe sem nenhum aluno e sem monitor definido', async (nome: string) => {
  await criarGrupo(nome, []);
});

Given('o grupo {string} existe com os alunos {string} e {string} e sem monitor definido',
  async (nome: string, aluno1: string, aluno2: string) => {
    await cadastrarMonitor('joaosilva');
    await criarGrupo(nome, [aluno1, aluno2]);
  });

Given('o monitor {string} é o único monitor livre no momento', async (monitor: string) => {
  await api('POST', '/api/test/reset-monitores');
  await cadastrarMonitor(monitor);
  expect((await api('GET', '/api/monitores')).corpo).toEqual([monitor]);
});

Given('o monitor {string} está alocado ao grupo {string}', async (monitor: string, nome: string) => {
  await cadastrarMonitor(monitor);
  await criarGrupo(nome, []);
  expect((await api('POST', `/api/grupos/${nome}/monitor`, { monitor })).status).toBe(201);
  await api('POST', '/api/test/reset-notificacoes');
});

Given('o monitor {string} já está alocado ao grupo {string}', async (monitor: string, nome: string) => {
  await cadastrarMonitor(monitor);
  await criarGrupo(nome, []);
  expect((await api('POST', `/api/grupos/${nome}/monitor`, { monitor })).status).toBe(201);
  await api('POST', '/api/test/reset-notificacoes');
});

Given('o grupo {string} não existe no sistema', async (nome: string) => {
  const grupos = (await api('GET', '/api/grupos')).corpo as { nome: string }[];
  expect(grupos.map(g => g.nome)).not.toContain(nome);
});

Given('não há nenhum monitor disponível no momento', async () => {
  await api('POST', '/api/test/reset-monitores');
  expect((await api('GET', '/api/monitores')).corpo).toEqual([]);
});

// ---------- When ----------
When('o professor aloca o monitor {string} ao grupo {string}', async (monitor: string, nome: string) => {
  await cadastrarMonitor(monitor);
  await abrirTelaDeGrupos(nome);
  await page.select(grupo(nome, cy('monitor-select')), monitor);
  await page.click(grupo(nome, cy('alocar-monitor-btn')));
});

When('o professor tenta alocar um monitor ao grupo {string}', async (nome: string) => {
  await abrirTelaDeGrupos(nome);
  await page.click(grupo(nome, cy('alocar-monitor-btn')));
});

When('o professor adiciona o aluno {string} ao grupo {string}', async (aluno: string, nome: string) => {
  await abrirTelaDeGrupos(nome);
  const resposta = page.waitForResponse(r => r.url().endsWith(`/api/grupos/${nome}/alunos`) && r.request().method() === 'POST');
  await page.type(grupo(nome, cy('aluno-input')), aluno);
  await page.click(grupo(nome, cy('adicionar-aluno-btn')));
  expect((await resposta).status()).toBe(201); // interface -> API
});

When('o professor tenta adicionar o aluno {string} novamente ao grupo {string}', async (aluno: string, nome: string) => {
  await abrirTelaDeGrupos(nome);
  await page.type(grupo(nome, cy('aluno-input')), aluno);
  await page.click(grupo(nome, cy('adicionar-aluno-btn')));
});

When('o professor realoca o monitor {string} do grupo {string} para o grupo {string}',
  async (monitor: string, origem: string, destino: string) => {
    await abrirTelaDeGrupos(origem);
    expect(await textos(grupo(origem, cy('grupo-monitor')))).toEqual([monitor]);
    await page.type(grupo(origem, cy('destino-input')), destino);
    await page.click(grupo(origem, cy('realocar-monitor-btn')));
  });

When('o professor tenta realocar o monitor {string} do grupo {string} para o grupo {string}',
  async (monitor: string, origem: string, destino: string) => {
    await abrirTelaDeGrupos(origem);
    expect(await textos(grupo(origem, cy('grupo-monitor')))).toEqual([monitor]);
    await page.type(grupo(origem, cy('destino-input')), destino);
    await page.click(grupo(origem, cy('realocar-monitor-btn')));
  });

When('o sistema de alocação automática é executado para o grupo {string}', async (nome: string) => {
  await abrirTelaDeGrupos(nome);
  await page.click(grupo(nome, cy('alocacao-automatica-btn')));
});

When('o professor remove o monitor {string} do grupo {string} sem realocá-lo',
  async (monitor: string, nome: string) => {
    await abrirTelaDeGrupos(nome);
    expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual([monitor]);
    await page.click(grupo(nome, cy('remover-monitor-btn')));
  });

When('o professor aloca o monitor {string} também ao grupo {string}', async (monitor: string, nome: string) => {
  await abrirTelaDeGrupos(nome);
  await page.select(grupo(nome, cy('monitor-select')), monitor);
  await page.click(grupo(nome, cy('alocar-monitor-btn')));
});

// ---------- Then ----------
Then('o sistema envia uma notificação de alocação para {string}, {string} e {string}',
  async (d1: string, d2: string, d3: string) => {
    await page.waitForSelector('[data-cy="notificacao-item"][data-tipo="alocacao"]');
    const destinatarios = await textos('[data-tipo="alocacao"] [data-cy="notificacao-destinatario"]');
    expect(destinatarios.sort()).toEqual([d1, d2, d3].sort());
  });

Then('o sistema envia uma notificação de aviso para {string}, {string}, {string} e {string}',
  async (d1: string, d2: string, d3: string, d4: string) => {
    const resposta = await api('GET', '/api/grupos/ESS-G3/notificacoes'); // API -> serviço de notificação
    const avisos = resposta.corpo.filter((n: { tipo: string }) => n.tipo === 'aviso');
    expect(avisos.map((n: { destinatario: string }) => n.destinatario).sort()).toEqual([d1, d2, d3, d4].sort());
  });

Then('o grupo {string} passa a ter {string} como monitor', async (nome: string, monitor: string) => {
  await page.waitForFunction(
    (sel: string, esperado: string) => document.querySelector(sel)?.textContent === esperado,
    {}, grupo(nome, cy('grupo-monitor')), monitor);
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual([monitor]);
});

Then('o grupo {string} passa a ter {string}, {string} e {string} como alunos',
  async (nome: string, a1: string, a2: string, a3: string) => {
    await page.waitForFunction(
      (sel: string, total: number) => document.querySelectorAll(sel).length === total,
      {}, grupo(nome, cy('grupo-aluno')), 3);               // API -> interface
    expect((await textos(grupo(nome, cy('grupo-aluno')))).sort()).toEqual([a1, a2, a3].sort());
  });

Then('o sistema exibe uma mensagem informando que não há monitor disponível', async () => {
  await page.waitForSelector(cy('mensagem-erro'));
  expect(await textos(cy('mensagem-erro'))).toEqual(['Não há monitor disponível']);
});

Then('o sistema exibe uma mensagem informando que o aluno já pertence ao grupo', async () => {
  await page.waitForSelector(cy('mensagem-erro'));
  expect(await textos(cy('mensagem-erro'))).toEqual(['O aluno já pertence ao grupo']);
});

Then('nenhuma notificação é enviada', async () => {
  expect(await textos(cy('notificacao-item'))).toEqual([]);
  expect((await api('GET', '/api/notificacoes')).corpo).toEqual([]);
});

Then('o grupo {string} continua sem monitor definido', async (nome: string) => {
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual(['Sem monitor']);
});

Then('o grupo {string} mantém apenas {string} e {string} como alunos',
  async (nome: string, a1: string, a2: string) => {
    expect((await textos(grupo(nome, cy('grupo-aluno')))).sort()).toEqual([a1, a2].sort());
  });

const destinatariosNaTela = async (nomeGrupo: string, tipo: string) => {
  await page.waitForSelector(`[data-cy="notificacao-item"][data-grupo="${nomeGrupo}"][data-tipo="${tipo}"]`);
  return (await textos(
    `[data-cy="notificacao-item"][data-grupo="${nomeGrupo}"][data-tipo="${tipo}"] [data-cy="notificacao-destinatario"]`
  )).sort();
};

const alunosDoGrupo = async (nome: string): Promise<string[]> => {
  const grupos = (await api('GET', '/api/grupos')).corpo as { nome: string; alunos: string[] }[];
  return grupos.find(g => g.nome === nome)!.alunos.slice().sort();
};

Then('o sistema envia uma notificação de saída para os alunos do grupo {string}', async (nome: string) => {
  expect(await destinatariosNaTela(nome, 'saida')).toEqual(await alunosDoGrupo(nome));
});

Then('o sistema envia uma notificação de entrada para os alunos do grupo {string}', async (nome: string) => {
  expect(await destinatariosNaTela(nome, 'entrada')).toEqual(await alunosDoGrupo(nome));
});

Then('o histórico de notificações do grupo {string} registra a notificação de saída para {string} e {string}',
  async (nome: string, a1: string, a2: string) => {
    const historico = (await api('GET', `/api/grupos/${nome}/notificacoes`)).corpo as
      { tipo: string; destinatario: string; resultado: string }[]; // API -> histórico
    const saidas = historico.filter(n => n.tipo === 'saida');
    expect(saidas.map(n => n.destinatario).sort()).toEqual([a1, a2].sort());
    expect(saidas.every(n => n.resultado === 'Enviado')).toBe(true);
  });

Then('o grupo {string} passa a não ter monitor definido', async (nome: string) => {
  await page.waitForFunction(
    (sel: string) => document.querySelector(sel)?.textContent === 'Sem monitor', {}, grupo(nome, cy('grupo-monitor')));
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual(['Sem monitor']);
});

Then('o sistema aloca o monitor {string} ao grupo {string}', async (monitor: string, nome: string) => {
  await page.waitForFunction(
    (sel: string, esperado: string) => document.querySelector(sel)?.textContent === esperado,
    {}, grupo(nome, cy('grupo-monitor')), monitor);
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual([monitor]);
});

Then('a lista de monitores da disciplina mostra {string} como alocado ao grupo {string} por alocação automática',
  async (monitor: string, nome: string) => {
    const item = `[data-cy="monitor-item"][data-login="${monitor}"][data-situacao="alocado"][data-automatica="true"]`;
    await page.waitForSelector(item);
    expect(await textos(`${item} [data-cy="monitor-grupos"]`)).toEqual([nome]);
  });

Then('a lista de monitores da disciplina não mostra monitores livres', async () => {
  expect(await textos('[data-cy="monitor-item"][data-situacao="livre"]')).toEqual([]);
});

Then('o sistema envia uma notificação de remoção para {string} e {string}', async (a1: string, a2: string) => {
  expect(await destinatariosNaTela('ESS-G3', 'remocao')).toEqual([a1, a2].sort());
});

Then('o sistema exibe uma mensagem informando que o grupo de destino não existe', async () => {
  await page.waitForSelector(cy('mensagem-erro'));
  expect(await textos(cy('mensagem-erro'))).toEqual(['Grupo de destino não existe']);
});

Then('o monitor {string} permanece alocado ao grupo {string}', async (monitor: string, nome: string) => {
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual([monitor]);
  const grupos = (await api('GET', '/api/grupos')).corpo as { nome: string; monitor: string }[];
  expect(grupos.find(g => g.nome === nome)!.monitor).toBe(monitor);
});

Then('o sistema envia uma notificação de alocação apenas para {string}', async (monitor: string) => {
  expect(await destinatariosNaTela('ESS-G6', 'alocacao')).toEqual([monitor]);
  expect(await textos(cy('notificacao-item'))).toHaveLength(1);
});

Then('o sistema envia uma notificação para os alunos do grupo {string}', async (nome: string) => {
  expect(await destinatariosNaTela(nome, 'alocacao')).toEqual(await alunosDoGrupo(nome));
});

Then('o sistema envia uma notificação para {string} informando o acúmulo de grupos', async (monitor: string) => {
  expect(await destinatariosNaTela('ESS-G7', 'acumulo')).toEqual([monitor]);
});

Then('o grupo {string} permanece com {string} como monitor, sem alteração', async (nome: string, monitor: string) => {
  expect(await textos(grupo(nome, cy('grupo-monitor')))).toEqual([monitor]);
  expect((await api('GET', `/api/grupos/${nome}/notificacoes`)).corpo).toEqual([]);
});
