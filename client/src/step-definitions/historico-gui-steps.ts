import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type RequestListener, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, type Browser, type Page } from 'puppeteer';
import { Notificacao } from '../../../server/src/models/Notificacao';
import type { HistoricoNotificacoes } from '../../../server/src/models/HistoricoNotificacoes';

const nomeDoCenario = 'Visualização do histórico de notificações';

let pasta: string | undefined;
let servidor: Server | undefined;
let navegador: Browser | undefined;
let pagina: Page;
let historico: HistoricoNotificacoes;

Before({ timeout: 30_000 }, async ({ pickle }) => {
  if (pickle.name !== nomeDoCenario) return;

  const pastaDeTeste = mkdtempSync(join(tmpdir(), 'ta-historico-gui-'));
  pasta = pastaDeTeste;
  const diretorioAnterior = process.cwd();
  const caminhoServidor = require.resolve('../../../server/src/server');

  // O backend resolve seu arquivo de dados ao carregar. A pasta temporária isola o cenário.
  const backend = (() => {
    process.chdir(pastaDeTeste);
    try {
      delete require.cache[caminhoServidor];
      return require(caminhoServidor) as {
        app: RequestListener;
        historicoLembretes: HistoricoNotificacoes;
      };
    } finally {
      process.chdir(diretorioAnterior);
    }
  })();

  historico = backend.historicoLembretes;
  const http = createServer(backend.app);
  servidor = http;
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve);
  });

  const endereco = http.address();
  assert(endereco && typeof endereco !== 'string');
  navegador = await launch({
    executablePath: process.env.CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  pagina = await navegador.newPage();

  await pagina.evaluateOnNewDocument(origem => {
    // Encaminha as requisições do frontend real para a API isolada.
    const fetchOriginal = window.fetch.bind(window);
    const apiPadrao = 'http://localhost:3005';
    window.fetch = (entrada, opcoes) => fetchOriginal(
      typeof entrada === 'string' && entrada.startsWith(`${apiPadrao}/`)
        ? origem + entrada.slice(apiPadrao.length)
        : entrada,
      opcoes
    );
  }, `http://127.0.0.1:${endereco.port}`);
});

After({ timeout: 30_000 }, async ({ pickle }) => {
  if (pickle.name !== nomeDoCenario) return;

  try {
    await navegador?.close();
  } finally {
    try {
      const http = servidor;
      if (http) await new Promise<void>(resolve => http.close(() => resolve()));
    } finally {
      if (pasta) rmSync(pasta, { recursive: true, force: true });
      navegador = undefined;
      servidor = undefined;
      pasta = undefined;
    }
  }
});

Given('o professor está na tela {string}', { timeout: 30_000 },
  async (tela) => {
    assert.equal(tela, 'Turmas');
    await pagina.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' });
    await pagina.click('[data-testid="classes-tab"]'); // Given: começa na aba Classes.
    await pagina.waitForSelector('.classes-container h2');
  }
);

Given(
  'existe uma notificação para a turma {string}, em {string}, com motivo {string} e status {string}',
  (turma, data, motivo, resultado) => {
    assert(resultado === 'Enviado' || resultado === 'Falha' || resultado === 'Ignorado');
    const [dia, mes, ano, horario] = data.split(/\/| às /);
    const instante = new Date(`${ano}-${mes}-${dia}T${horario}:00-03:00`);
    const id = historico.proximoId();

    // Given: registra cada status no histórico que será consultado pela aba.
    historico.registrar(new Notificacao(
      id,
      'professor@example.test',
      {
        lembreteId: `lembrete-${id}`,
        turmaRegistrada: turma,
        prazoRegistrado: new Date('2026-09-01T02:59:00Z'),
        pendenciasRegistradas: []
      },
      instante,
      resultado,
      motivo
    ));
  }
);

When('o professor acessa a tela {string}', async (tela) => {
  assert.equal(tela, 'Histórico de notificações');
  await pagina.click('[data-testid="notification-history-tab"]'); // When: abre a listagem.
});

Then('a tela {string} é exibida', async (tela) => {
  await pagina.waitForFunction(esperado =>
    document.querySelector('#notification-history-title')?.textContent === esperado,
  {}, tela); // Then: confirma o título da tela aberta.
});

Then(
  'é apresentada a notificação da turma {string}, registrada em {string}, com motivo {string} e status {string}',
  async (turma: string, data: string, motivo: string, status: string) => {
    await pagina.waitForFunction(campos =>
      Array.from(document.querySelectorAll('[data-cy^="historico-notificacao-"]')).some(linha =>
        Object.entries(campos).every(([campo, esperado]) =>
          linha.querySelector(`[data-cy="historico-${campo}"]`)?.textContent?.trim() === esperado
        )
      ),
    {}, { turma, data, motivo, status }); // Os quatro valores precisam estar na mesma linha.
  }
);
