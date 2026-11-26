import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type RequestListener, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, type Browser, type Page } from 'puppeteer';
import { Notificacao } from '../../../server/src/models/Notificacao';
import type { HistoricoNotificacoes } from '../../../server/src/models/HistoricoNotificacoes';

// Os hooks usam estes nomes para isolar a preparação dos quatro cenários de histórico.
const nomesDosCenarios = new Set([
  'Visualização do histórico de notificações',
  'Visualização dos detalhes históricos de uma notificação',
  'Visualização de uma falha no próprio histórico',
  'Filtragem do próprio histórico por disciplina e turma'
]);

let pasta: string | undefined;
let servidor: Server | undefined;
let navegador: Browser | undefined;
let pagina: Page;
let historico: HistoricoNotificacoes;
let origemDaApi: string;
let idSelecionado: number | undefined;

/** Abre o Chrome e uma API isolada que recebe os dados de cada cenário. */
Before({ timeout: 30_000 }, async function ({ pickle }) {
  if (!nomesDosCenarios.has(pickle.name)) return;

  const pastaDeTeste = mkdtempSync(join(tmpdir(), 'ta-historico-gui-'));
  pasta = pastaDeTeste;
  const diretorioAnterior = process.cwd();
  const ambienteAnterior = process.env.NODE_ENV;
  const caminhoServidor = require.resolve('../../../server/src/server');

  // O backend resolve seu arquivo de dados ao carregar. A pasta temporária isola o cenário.
  const backend = (() => {
    process.chdir(pastaDeTeste);
    process.env.NODE_ENV = 'test'; // O lançamento de notas usa o remetente simulado.
    try {
      delete require.cache[caminhoServidor];
      return require(caminhoServidor) as {
        app: RequestListener;
        historicoLembretes: HistoricoNotificacoes;
      };
    } finally {
      process.chdir(diretorioAnterior);
      if (ambienteAnterior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = ambienteAnterior;
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
  origemDaApi = `http://127.0.0.1:${endereco.port}`;
  navegador = await launch({
    executablePath: process.env.CHROME_BIN,
    headless: this.parameters.janela !== true, // A opção do Cucumber abre a janela só na demonstração.
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
  }, origemDaApi);
});

/** Fecha o navegador e a API e descarta o estado usado pelo cenário. */
After({ timeout: 30_000 }, async ({ pickle }) => {
  if (!nomesDosCenarios.has(pickle.name)) return;

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
      idSelecionado = undefined;
    }
  }
});

Given('o professor está na tela {string}', { timeout: 30_000 },
  async (tela: string) => {
    await pagina.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' });

    if (tela === 'Turmas') {
      await pagina.click('[data-testid="classes-tab"]');
      await pagina.waitForSelector('[data-cy="turmas-pagina"]');
      return;
    }

    assert.equal(tela, 'Histórico de notificações');
    await pagina.click('[data-testid="notification-history-tab"]');
    await pagina.waitForSelector('#notification-history-title');
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

/** Converte a data do cenário em um instante com o deslocamento de Brasília usado nos testes. */
function instanteEmBrasilia(data: string): Date {
  const [dia, mes, ano, horario] = data.split(/\/| às /);
  return new Date(`${ano}-${mes}-${dia}T${horario}:00-03:00`);
}

/** Extrai aluno e meta do formato usado nas pendências escritas no cenário. */
function lerPendencia(descricao: string) {
  const [nomeAluno, meta] = descricao.split(' - ');
  assert(nomeAluno && meta, `Pendência inválida no cenário: ${descricao}`);
  return { nomeAluno, meta };
}

/** Envia o corpo JSON à API isolada e confere o status antes de ler a resposta. */
async function requisitarApi(metodo: string, rota: string, status: number, corpo: object) {
  const resposta = await fetch(`${origemDaApi}${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  assert.equal(resposta.status, status, `${metodo} ${rota}`);
  return resposta.json();
}

Given(
  'existe uma notificação destinada a {string} para a turma {string}, registrada em {string}, com motivo {string}, status {string}, prazo {string} e pendências {string} e {string}',
  (destinatario: string, turma: string, data: string, motivo: string, status: string,
    prazo: string, primeira: string, segunda: string) => {
    assert(status === 'Enviado');
    const id = historico.proximoId();

    // Guarda os valores da tentativa antes de cadastrar os conceitos atuais.
    historico.registrar(new Notificacao(
      id,
      destinatario,
      {
        lembreteId: `lembrete-${id}`,
        turmaRegistrada: turma,
        prazoRegistrado: instanteEmBrasilia(prazo),
        pendenciasRegistradas: [lerPendencia(primeira), lerPendencia(segunda)]
      },
      instanteEmBrasilia(data),
      status,
      motivo
    ));
  }
);

Given(
  'depois foram lançados os conceitos {string} para {string} e {string} para {string}',
  async (primeiroConceito: string, primeira: string, segundoConceito: string, segunda: string) => {
    await requisitarApi('PUT', '/api/classes/email', 200, {
      emailDasTurmas: 'professor@example.test'
    });
    const turma = await requisitarApi('POST', '/api/classes', 201, {
      topic: 'ESS', year: 2026, semester: 2
    });

    const conceitos = [
      { ...lerPendencia(primeira), conceito: primeiroConceito },
      { ...lerPendencia(segunda), conceito: segundoConceito }
    ];
    const rotaDaTurma = `/api/classes/${encodeURIComponent(turma.id)}`;

    for (let indice = 0; indice < conceitos.length; indice++) {
      const { nomeAluno, meta, conceito } = conceitos[indice];
      const cpf = String(indice + 1).padStart(11, '0');
      await requisitarApi('POST', '/api/students', 201, { name: nomeAluno, cpf, email: '' });
      await requisitarApi('POST', `${rotaDaTurma}/enroll`, 201, { studentCPF: cpf });
      const matricula = await requisitarApi(
        'PUT', `${rotaDaTurma}/enrollments/${cpf}/evaluation`, 200, { goal: meta, grade: conceito }
      );

      // Confirma que a API realmente aceitou a nota atual antes de abrir o histórico.
      assert.deepEqual(matricula.evaluations, [{ goal: meta, grade: conceito }]);
    }
  }
);

When('o professor seleciona a notificação de {string} da turma {string}',
  async (data: string, turma: string) => {
    const instante = instanteEmBrasilia(data).getTime();
    const registro = historico.listar().find(item =>
      item.turmaRegistrada === turma && item.dataHora.getTime() === instante
    );
    assert(registro);
    idSelecionado = registro.id;
    const botao = `[data-cy="historico-notificacao-${registro.id}"] [data-cy="historico-abrir-detalhes"]`;
    await pagina.waitForSelector(botao, { visible: true });
    await pagina.click(botao); // Seleciona o registro pelo ID, dentro da linha correta.
  }
);

Then('os detalhes da notificação são exibidos abaixo da linha selecionada', async () => {
  assert(idSelecionado);
  const linha = `[data-cy="historico-notificacao-${idSelecionado}"]`;
  const detalhe = `[data-cy="historico-detalhes-${idSelecionado}"]`;

  // O + exige que os detalhes estejam na linha imediatamente abaixo da selecionada.
  await pagina.waitForFunction(seletor =>
    document.querySelector(seletor)?.textContent?.trim() === 'Detalhes da notificação',
  {}, `${linha} + ${detalhe} [data-cy="historico-detalhe-titulo"]`);
});

Then(
  'os detalhes mostram o destinatário {string}, a turma {string}, a data {string}, o motivo {string}, o status {string} e o prazo {string}',
  async (destinatario: string, turma: string, data: string, motivo: string, status: string, prazo: string) => {
    assert(idSelecionado);
    await pagina.waitForFunction((id, campos) => {
      const linha = document.querySelector(`[data-cy="historico-detalhes-${id}"]`);

      // Compara os valores da tentativa selecionada pelos identificadores dos campos.
      return Object.entries(campos).every(([campo, esperado]) =>
        linha?.querySelector(`[data-cy="historico-detalhe-${campo}"]`)?.textContent?.trim() === esperado
      );
    }, {}, idSelecionado, { destinatario, turma, data, motivo, status, prazo });
  }
);

Then('os detalhes preservam a pendência de {string} em {string}',
  async (aluno: string, meta: string) => {
    assert(idSelecionado);
    await pagina.waitForFunction((id, esperado) => {
      const linha = document.querySelector(`[data-cy="historico-detalhes-${id}"]`);

      // Lê a pendência guardada na tentativa, depois do lançamento confirmado pela API.
      return Array.from(linha?.querySelectorAll('[data-cy="historico-detalhe-pendencia"]') ?? [])
        .some(item => item.textContent?.trim() === esperado);
    }, {}, idSelecionado, `${aluno} — ${meta}`);
  }
);

Given(
  'existe uma tentativa com falha para {string} na turma {string}, registrada em {string}, com motivo {string}, prazo {string} e descrição da falha {string}',
  (destinatario: string, turma: string, data: string, motivo: string, prazo: string, descricao: string) => {
    const id = historico.proximoId();

    // Registra a tentativa fictícia antes que o navegador carregue o histórico.
    historico.registrar(new Notificacao(
      id,
      destinatario,
      {
        lembreteId: `lembrete-${id}`,
        turmaRegistrada: turma,
        prazoRegistrado: instanteEmBrasilia(prazo),
        pendenciasRegistradas: []
      },
      instanteEmBrasilia(data),
      'Falha',
      motivo,
      descricao
    ));
  }
);

Then('os detalhes mostram a descrição da falha {string}', async (descricao: string) => {
  assert(idSelecionado);
  const seletor = `[data-cy="historico-detalhes-${idSelecionado}"] [data-cy="historico-detalhe-descricao-falha"]`;

  // Confere a descrição exata dentro da linha que o professor abriu.
  await pagina.waitForFunction((alvo, esperado) =>
    document.querySelector(alvo)?.textContent?.trim() === esperado,
  {}, seletor, descricao);
});

const filtroDisciplina = '[data-cy="historico-filtro-disciplina"]';
const filtroTurma = '[data-cy="historico-filtro-turma"]';

/** Lê as turmas pelas células da tabela identificadas com data-cy. */
async function conferirTurmasVisiveis(esperadas: string[]): Promise<void> {
  await pagina.waitForFunction(turmas => {
    const exibidas = Array.from(document.querySelectorAll('[data-cy="historico-turma"]'))
      .map(celula => celula.textContent?.trim());

    // Exige a lista completa esperada, na mesma ordem.
    return exibidas.length === turmas.length &&
      exibidas.every((turma, indice) => turma === turmas[indice]);
  }, {}, esperadas);
}

Then(
  'o histórico apresenta as turmas {string}, {string} e {string}, nessa ordem',
  (primeira: string, segunda: string, terceira: string) =>
    conferirTurmasVisiveis([primeira, segunda, terceira])
);

When(
  'o professor filtra o histórico pela disciplina {string} e pela turma {string}',
  async (disciplina: string, turma: string) => {
    await pagina.waitForSelector(filtroDisciplina, { visible: true });
    await pagina.select(filtroDisciplina, disciplina);

    // Aguarda a atualização das opções de turma após selecionar a disciplina.
    await pagina.waitForFunction((seletor, valor) =>
      Array.from(document.querySelector<HTMLSelectElement>(seletor)?.options ?? [])
        .some(opcao => opcao.value === valor),
    {}, filtroTurma, turma);

    await pagina.select(filtroTurma, turma);
  }
);

Then(
  'os filtros apresentados são a disciplina {string} e a turma {string}',
  async (disciplina: string, turma: string) => {
    await pagina.waitForFunction((disciplinaSeletor, turmaSeletor, disciplinaEsperada, turmaEsperada) =>
      document.querySelector<HTMLSelectElement>(disciplinaSeletor)?.value === disciplinaEsperada &&
      document.querySelector<HTMLSelectElement>(turmaSeletor)?.value === turmaEsperada,
    {}, filtroDisciplina, filtroTurma, disciplina, turma);
  }
);

Then('o histórico apresenta somente a turma {string}', (turma: string) =>
  conferirTurmasVisiveis([turma]) // Confirma também que as outras duas saíram da lista.
);

When('o professor limpa os filtros do histórico', async () => {
  await pagina.click('[data-cy="historico-limpar-filtros"]');
});
