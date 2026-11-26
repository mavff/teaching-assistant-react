import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'node:test';
import { launch, type Browser, type Page } from 'puppeteer';
import type { ConfiguracaoLembretes } from '../types/Reminder';
import { Lembrete } from '../../../server/src/models/Lembrete';

// Tipifica a busca da turma e a inserção de registros históricos no servidor de teste.
interface ClassesDaApiDeTeste {
  findClassById(id: string): {
    obterConfiguracaoLembretes(): { add(lembrete: Lembrete): void };
  } | undefined;
}

type TurmaDoCenario = {
  id: string;
  ano: string;
  semestre: string;
  rota: string;
  anterior?: ConfiguracaoLembretes;
};

// Guarda a rota e a configuração original de cada turma do cenário.
const turmasDoCenario = new Map<string, TurmaDoCenario>();

const tags = '@lembretes-configuracao-gui';
const fuso = 'America/Sao_Paulo';
function dataCy(nome: string): string {
  // Mantém válido o seletor se o ID da turma contiver aspas ou barras invertidas.
  const valor = nome.replace(/["\\\n\r\f]/g, caractere =>
    `\\${caractere.charCodeAt(0).toString(16)} `
  );
  return `[data-cy="${valor}"]`;
}

const SELETORES = {
  abaClasses: '[data-testid="classes-tab"]',
  turmasPagina: dataCy('turmas-pagina'),
  turmasTitulo: dataCy('turmas-titulo'),
  turma: (id: string) => dataCy(`turma-${id}`),
  configurarLembretes: dataCy('configurar-lembretes'),
  configuracaoPagina: dataCy('config-lembretes-pagina'),
  configuracaoTitulo: dataCy('config-lembretes-titulo'),
  configuracaoTurma: dataCy('config-lembretes-turma'),
  prazoAcademico: dataCy('prazo-academico'),
  quantidadeLembretes: dataCy('quantidade-lembretes'),
  lembreteLinha: dataCy('lembrete-linha'),
  lembreteData: dataCy('lembrete-data'),
  lembreteRemover: dataCy('lembrete-remover'),
  lembreteEstado: dataCy('lembrete-estado'),
  adicionarLembrete: dataCy('adicionar-lembrete'),
  salvarConfiguracao: dataCy('salvar-configuracao'),
  mensagemErro: dataCy('mensagem-erro'),
  mensagemSucesso: dataCy('mensagem-sucesso'),
  quantidadeSalva: dataCy('lembretes-salvos-quantidade'),
  lembreteSalvo: dataCy('lembrete-salvo'),
  editarLembretes: dataCy('editar-lembretes')
};

function naConfiguracao(seletor: string): string {
  return `${SELETORES.configuracaoPagina} ${seletor}`;
}

let pasta: string | undefined;
let servidor: Server | undefined;
let navegador: Browser | undefined;
let pagina: Page;
let api: string;
let turmaSelecionada: string;
let relogioAtivo = false;

// Converte o texto do cenário no formato local aceito pelo campo.
function dataParaCampo(data: string): string {
  const [dia, mes, ano, horario] = data.split(/\/| às /);
  return `${ano}-${mes}-${dia}T${horario}`;
}

async function requisitar(
  metodo: string,
  rota: string,
  status: number,
  corpo?: object
): Promise<Response> {
  const resposta = await fetch(`${api}${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  assert.equal(resposta.status, status, `${metodo} ${rota}`);
  return resposta;
}

async function clicar(seletor: string): Promise<void> {
  const botao = await pagina.waitForSelector(`${seletor}:enabled`, { visible: true });
  assert(botao);
  await botao.click();
}

async function preencher(seletor: string, valor: string, indiceDaLinha?: number): Promise<void> {
  const alvo = await pagina.waitForFunction((campo, linhas, indice) => {
    // Com índice, a busca pelo campo acontece dentro da linha escolhida.
    const contexto = indice === undefined ? document : document.querySelectorAll(linhas)[indice];
    return contexto?.querySelector<HTMLInputElement>(`${campo}:enabled`);
  }, {}, seletor, naConfiguracao(SELETORES.lembreteLinha), indiceDaLinha);

  const elemento = alvo.asElement();
  assert(elemento);

  await elemento.evaluate((campo, texto) => {
    // Preserva o setter e os eventos que o React usa para detectar a edição.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      ?.set?.call(campo, texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }, valor);
}

async function conferirTexto(seletor: string, esperado: string, indice = 0): Promise<void> {
  await pagina.waitForFunction((alvo, texto, posicao) =>
    document.querySelectorAll(alvo)[posicao]?.textContent?.trim() === texto,
  {}, seletor, esperado, indice);
}

function obterTurmaDoCenario(nome: string): TurmaDoCenario {
  const turma = turmasDoCenario.get(nome);
  assert(turma, `Turma ainda não preparada: ${nome}`);
  return turma;
}

async function cadastrarTurmaDoCenario(nome: string): Promise<void> {
  const identificacao = /^(\d{4})\.([12]) de (.+)$/.exec(nome);
  assert(identificacao, `Identificação de turma inválida: ${nome}`);
  const [, ano, semestre, topic] = identificacao;

  const resposta = await requisitar('POST', '/api/classes', 201, {
    topic, year: Number(ano), semester: Number(semestre)
  });
  const { id } = await resposta.json();

  turmasDoCenario.set(nome, {
    id, ano, semestre, rota: `/api/classes/${encodeURIComponent(id)}/lembretes`
  });
}

async function prepararLembretes(nome: string, datas: string[]): Promise<void> {
  const turma = obterTurmaDoCenario(nome);
  const lembretes = datas.map((data, indice) => {
    const instante = new Date(dataParaCampo(data)).toISOString();
    return {
      id: `lembrete-existente-${indice + 1}`,
      data: instante.slice(0, 10),
      horario: instante.slice(11, 16)
    };
  });

  // Guarda o retorno da API para comparar IDs, horários e estados depois do salvamento pela GUI.
  const resposta = await requisitar('PUT', turma.rota, 200, {
    quantidade: lembretes.length, lembretes
  });
  turma.anterior = await resposta.json();
}

Before({ tags, timeout: 30_000 }, async function () {
  turmasDoCenario.clear();
  pasta = mkdtempSync(join(tmpdir(), 'ta-lembretes-gui-'));
  const anterior = process.cwd();
  const caminhoServidor = require.resolve('../../../server/src/server');

  // O servidor resolve o caminho do arquivo de dados na inicialização.
  const http = (() => {
    process.chdir(pasta);
    try {
      delete require.cache[caminhoServidor];
      return createServer(require(caminhoServidor).app);
    } finally {
      process.chdir(anterior);
    }
  })();
  servidor = http;

  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve); // Escolhe uma porta livre para a API de teste.
  });
  const endereco = http.address();
  assert(endereco && typeof endereco !== 'string');
  api = `http://127.0.0.1:${endereco.port}`;
});

After({ tags, timeout: 30_000 }, async function () {
  try {
    await navegador?.close();
  } finally {
    try {
      if (servidor) {
        await new Promise<void>(resolve => servidor!.close(() => resolve()));
      }
    } finally {
      if (relogioAtivo) mock.timers.reset();
      if (pasta) rmSync(pasta, { recursive: true, force: true });
      navegador = undefined;
      servidor = undefined;
      pasta = undefined;
      relogioAtivo = false;
    }
  }
});

Given('a data atual é {string}', { timeout: 30_000 }, async (data: string) => {
  const agora = new Date(dataParaCampo(data));
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, fuso);
  mock.timers.enable({ apis: ['Date'], now: agora });
  relogioAtivo = true;

  navegador = await launch({
    executablePath: process.env.CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  pagina = await navegador.newPage();
  await pagina.emulateTimezone(fuso);
  await pagina.evaluateOnNewDocument((origem, instante) => {
    // Redireciona as chamadas da interface para o servidor temporário.
    const fetchOriginal = window.fetch.bind(window);
    const apiPadrao = 'http://localhost:3005';
    window.fetch = (entrada, opcoes) => fetchOriginal(
      typeof entrada === 'string' && entrada.startsWith(`${apiPadrao}/`)
        ? origem + entrada.slice(apiPadrao.length)
        : entrada,
      opcoes
    );

    // Fixa o relógio do navegador no mesmo instante usado pelo servidor.
    window.Date = new Proxy(window.Date, {
      construct(alvo, args, construtor) {
        return Reflect.construct(alvo, args.length ? args : [instante], construtor);
      },
      apply(alvo) {
        return new alvo(instante).toString();
      },
      get(alvo, chave, receptor) {
        return chave === 'now' ? () => instante : Reflect.get(alvo, chave, receptor);
      }
    });
  }, api, agora.getTime());
});

Given('há um e-mail válido cadastrado em {string}', async (campo: string) => {
  assert.equal(campo, 'E-mail para as turmas');
  const emailDasTurmas = 'contato@example.com';
  const resposta = await requisitar('PUT', '/api/classes/email', 200, { emailDasTurmas });
  assert.deepEqual(await resposta.json(), { emailDasTurmas });
});

Given(
  'o professor {string} está na tela {string}, onde possui acesso à turma {string}, pela qual é responsável',
  { timeout: 30_000 },
  async (_professor: string, tela: string, turma: string) => {
    assert.equal(tela, 'Turmas');
    await cadastrarTurmaDoCenario(turma);
    turmaSelecionada = turma;

    await pagina.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' });
    await clicar(SELETORES.abaClasses); // Usa o atributo que a aba já possui.
    await conferirTexto(`${SELETORES.turmasPagina} ${SELETORES.turmasTitulo}`, 'Class Management');
  }
);

Given('a turma {string} também está cadastrada', cadastrarTurmaDoCenario);

Given('a turma {string} não possui lembretes configurados', async (turma: string) => {
  const { rota } = obterTurmaDoCenario(turma);
  const resposta = await requisitar('GET', rota, 200);
  assert.deepEqual((await resposta.json()).lembretes, []);
});

Given('o prazo acadêmico da turma {string} é {string}', async (turma: string, data: string) => {
  const { ano, semestre } = obterTurmaDoCenario(turma);
  const prazoAcademico = new Date(dataParaCampo(data)).toISOString();
  await requisitar('PUT', `/api/periodos-academicos/${ano}/${semestre}`, 200, { prazoAcademico });
});

When('{string} acessa a tela {string} da turma {string}',
  async (_professor: string, tela: string, turma: string) => {
    assert.equal(turma, turmaSelecionada);
    const { id } = obterTurmaDoCenario(turma);

    // O botão é procurado dentro da linha identificada pelo ID retornado pela API.
    await clicar(`${SELETORES.turmasPagina} ${SELETORES.turma(id)} ${SELETORES.configurarLembretes}`);
    await conferirTexto(naConfiguracao(SELETORES.configuracaoTitulo), tela);
  }
);

When('inicia a edição dos lembretes', () =>
  clicar(naConfiguracao(SELETORES.editarLembretes)) // Localiza o botão pelo atributo.
);

When('informa {string} como quantidade de lembretes', (quantidade: string) =>
  preencher(naConfiguracao(SELETORES.quantidadeLembretes), quantidade)
);

When('adiciona {int} lembrete(s)', async (quantidade: number) => {
  for (let adicionado = 0; adicionado < quantidade; adicionado++) {
    await clicar(naConfiguracao(SELETORES.adicionarLembrete)); // Espera o botão a cada clique.
  }
});

When('marca o lembrete de {string} para remoção', async (data: string) => {
  const alvo = await pagina.waitForFunction((linhas, campo, remover, valor) => {
    const linha = Array.from(document.querySelectorAll(linhas)).find(item =>
      item.querySelector<HTMLInputElement>(campo)?.value === valor
    );

    // Procura o botão habilitado só na linha que contém a data solicitada.
    return linha?.querySelector<HTMLButtonElement>(`${remover}:enabled`);
  }, {}, naConfiguracao(SELETORES.lembreteLinha), SELETORES.lembreteData,
  SELETORES.lembreteRemover, dataParaCampo(data));

  const elemento = alvo.asElement();
  assert(elemento);
  const botao = await elemento.toElement('button');
  await botao.click();
});

// O formulário e a lista salva usam a mesma ordem, com índices a partir de zero.
const indicesDosLembretes = { primeiro: 0, segundo: 1, terceiro: 2 };
type OrdemLembrete = keyof typeof indicesDosLembretes;

When(/^define o (primeiro|segundo|terceiro) lembrete para "([^"]+)"$/,
  (ordem: OrdemLembrete, data: string) =>
    preencher(SELETORES.lembreteData, dataParaCampo(data), indicesDosLembretes[ordem])
);

When('salva a configuração', () =>
  clicar(naConfiguracao(SELETORES.salvarConfiguracao))
);

Then('{string} permanece na tela {string} da turma {string}',
  async (_professor: string, tela: string, turma: string) => {
    await conferirTexto(naConfiguracao(SELETORES.configuracaoTitulo), tela);
    await conferirTexto(naConfiguracao(SELETORES.configuracaoTurma), turma);
  }
);

Then('a tela apresenta a confirmação {string}', (mensagem: string) =>
  conferirTexto(naConfiguracao(SELETORES.mensagemSucesso), mensagem)
);

Then('a quantidade de lembretes configurados é {string}', (quantidade: string) =>
  conferirTexto(naConfiguracao(SELETORES.quantidadeSalva), `Quantidade de lembretes: ${quantidade}`)
);

Then(/^o (primeiro|segundo|terceiro) lembrete está programado para "([^"]+)"$/,
  (ordem: OrdemLembrete, data: string) =>
    conferirTexto(naConfiguracao(SELETORES.lembreteSalvo), data, indicesDosLembretes[ordem])
);

Then('o prazo acadêmico apresentado é {string}', (prazo: string) =>
  conferirTexto(naConfiguracao(SELETORES.prazoAcademico), prazo)
);

Given('a turma {string} possui um lembrete não enviado para {string}',
  (turma: string, data: string) => prepararLembretes(turma, [data])
);

Given('a turma {string} possui dois lembretes não enviados para {string} e {string}',
  (turma: string, primeiraData: string, segundaData: string) =>
    prepararLembretes(turma, [primeiraData, segundaData])
);

async function prepararLembretesComEnvio(
  nome: string,
  dataEnviada: string,
  datasPendentes: string[]
): Promise<void> {
  const turma = obterTurmaDoCenario(nome);

  // Usa o servidor isolado do cenário para preparar um envio que já ocorreu.
  const { classes } = require('../../../server/src/server') as { classes: ClassesDaApiDeTeste };
  const turmaNoServidor = classes.findClassById(turma.id);
  assert(turmaNoServidor, `Turma não encontrada no servidor de teste: ${nome}`);

  const configuracao = turmaNoServidor.obterConfiguracaoLembretes();
  const registros = [
    { dataLocal: dataEnviada, estado: 'Enviado' as const },
    ...datasPendentes.map(dataLocal => ({ dataLocal, estado: 'Não enviado' as const }))
  ];

  registros.forEach(({ dataLocal, estado }, indice) => {
    const instante = new Date(dataParaCampo(dataLocal)).toISOString();
    configuracao.add(new Lembrete({
      id: `lembrete-existente-${indice + 1}`,
      data: instante.slice(0, 10),
      horario: instante.slice(11, 16),
      estado
    }));
  });

  // Guarda os registros iniciais para a comparação pela API no Then.
  const resposta = await requisitar('GET', turma.rota, 200);
  turma.anterior = await resposta.json();
}

Given(
  'a turma {string} possui um lembrete enviado em {string} e dois não enviados para {string} e {string}',
  (nome: string, dataEnviada: string, primeiraPendente: string, segundaPendente: string) =>
    prepararLembretesComEnvio(nome, dataEnviada, [primeiraPendente, segundaPendente])
);

Given(
  'a turma {string} possui um lembrete enviado em {string} e um não enviado para {string}',
  (nome: string, dataEnviada: string, dataPendente: string) =>
    prepararLembretesComEnvio(nome, dataEnviada, [dataPendente])
);

When('deixa o terceiro lembrete sem data e horário', async () => {
  await pagina.waitForFunction((linhas, campo, indice) =>
    document.querySelectorAll(linhas)[indice]
      ?.querySelector<HTMLInputElement>(campo)?.value === '',
  {}, naConfiguracao(SELETORES.lembreteLinha), SELETORES.lembreteData, indicesDosLembretes.terceiro);
  // Só passa quando o terceiro campo existe e está vazio.
});

Then('a tela apresenta o erro {string}', (mensagem: string) =>
  conferirTexto(naConfiguracao(SELETORES.mensagemErro), mensagem)
);

Then('a configuração gravada permanece igual à anterior', async () => {
  const { rota, anterior } = obterTurmaDoCenario(turmaSelecionada);
  assert(anterior);
  const resposta = await requisitar('GET', rota, 200);
  assert.deepEqual(await resposta.json(), anterior);
});

Then('o lembrete de {string} aparece como {string} com a edição bloqueada',
  async (data: string, estado: string) => {
    await pagina.waitForFunction((linhas, campo, estadoExibido, remover, valor, estadoEsperado) =>
      Array.from(document.querySelectorAll(linhas)).some(linha => {
        const input = linha.querySelector<HTMLInputElement>(campo);

        // A data, o bloqueio, o estado e a ausência do botão pertencem à mesma linha.
        return input?.value === valor && input.disabled &&
          linha.querySelector(estadoExibido)?.textContent?.trim() === estadoEsperado &&
          !linha.querySelector(remover);
      }),
    {}, naConfiguracao(SELETORES.lembreteLinha), SELETORES.lembreteData,
    SELETORES.lembreteEstado, SELETORES.lembreteRemover, dataParaCampo(data), estado);
  }
);

Then('o lembrete pendente de {string} continua editável', async (data: string) => {
  await pagina.waitForFunction((linhas, campo, valor) =>
    Array.from(document.querySelectorAll(linhas)).some(linha =>
      linha.querySelector<HTMLInputElement>(`${campo}:enabled`)?.value === valor
    ),
  {}, naConfiguracao(SELETORES.lembreteLinha), SELETORES.lembreteData, dataParaCampo(data));
  // A data esperada precisa estar em um campo habilitado.
});

Then(
  'somente a data e o horário do primeiro lembrete da turma {string} mudam para {string}, preservando a configuração da turma {string}',
  async (nomeEditada: string, novaData: string, nomeOutra: string) => {
    const editada = obterTurmaDoCenario(nomeEditada);
    const outra = obterTurmaDoCenario(nomeOutra);
    assert(editada.anterior && outra.anterior);

    const instante = new Date(dataParaCampo(novaData)).toISOString();
    const [primeiro, ...demais] = editada.anterior.lembretes;

    // Compara toda a configuração de ESS, alterando na expectativa apenas a data e o horário.
    const respostaEditada = await requisitar('GET', editada.rota, 200);
    assert.deepEqual(await respostaEditada.json(), {
      ...editada.anterior,
      lembretes: [
        { ...primeiro, data: instante.slice(0, 10), horario: instante.slice(11, 16) },
        ...demais
      ]
    });

    const respostaOutra = await requisitar('GET', outra.rota, 200);
    assert.deepEqual(await respostaOutra.json(), outra.anterior);
  }
);

Then(
  'os lembretes anteriores de {string} permanecem iguais e o único novo está não enviado para {string}',
  async (nome: string, data: string) => {
    const { rota, anterior } = obterTurmaDoCenario(nome);
    assert(anterior);

    const resposta = await requisitar('GET', rota, 200);
    const atual: ConfiguracaoLembretes = await resposta.json();
    assert.equal(atual.lembretes.length, anterior.lembretes.length + 1);

    // Compara os registros anteriores inteiros, incluindo IDs, datas e estados.
    assert.deepEqual(atual.lembretes.slice(0, -1), anterior.lembretes);

    const novo = atual.lembretes[atual.lembretes.length - 1];
    const instante = new Date(dataParaCampo(data)).toISOString();
    assert(anterior.lembretes.every(lembrete => lembrete.id !== novo.id));
    assert.equal(novo.estado, 'Não enviado');
    assert.equal(novo.data, instante.slice(0, 10));
    assert.equal(novo.horario, instante.slice(11, 16));
  }
);

Then('somente o lembrete de {string} é removido da configuração gravada da turma {string}',
  async (data: string, nome: string) => {
    const { rota, anterior } = obterTurmaDoCenario(nome);
    assert(anterior);

    const instante = new Date(dataParaCampo(data)).toISOString();
    const removido = anterior.lembretes.find(lembrete =>
      lembrete.data === instante.slice(0, 10) && lembrete.horario === instante.slice(11, 16)
    );
    assert(removido);

    const resposta = await requisitar('GET', rota, 200);

    // Confere que saiu exatamente o ID escolhido e que os outros registros ficaram intactos.
    assert.deepEqual(await resposta.json(), {
      ...anterior,
      lembretes: anterior.lembretes.filter(lembrete => lembrete.id !== removido.id)
    });
  }
);
