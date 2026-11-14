import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const apiUrl = () => Cypress.env('apiUrl') as string;

// Seletores estáveis (data-cy) escopados pelo grupo, sem depender de classes CSS.
const grupo = (nome: string, interno = '') => `[data-cy="grupo-${nome}"] ${interno}`.trim();
const dc = (nome: string) => `[data-cy="${nome}"]`;

const requisitar = (method: string, caminho: string, body?: object) =>
  cy.request({ method, url: `${apiUrl()}${caminho}`, body, failOnStatusCode: false });

const textos = ($els: JQuery<HTMLElement>) => $els.toArray().map(el => (el.textContent || '').trim());

const cadastrarMonitor = (login: string) =>
  requisitar('POST', '/api/monitores', { login }).its('status').should('eq', 201);

const criarGrupo = (nome: string, alunos: string[]) =>
  requisitar('POST', '/api/grupos', { nome, alunos }).its('status').should('eq', 201);

const alocarPelaApi = (nome: string, monitor: string) =>
  requisitar('POST', `/api/grupos/${nome}/monitor`, { monitor }).its('status').should('eq', 201);

const abrirTelaDeGrupos = (nome: string) => {
  cy.visit('/');
  cy.get('[data-testid="groups-tab"]').click();
  cy.get(grupo(nome)).should('exist');
};

const notificacoesNaTela = (nomeGrupo: string, tipo: string) =>
  cy.get(`[data-cy="notificacao-item"][data-grupo="${nomeGrupo}"][data-tipo="${tipo}"] [data-cy="notificacao-destinatario"]`);

const selecionarMonitor = (nome: string, monitor: string) => {
  cy.get(grupo(nome, `${dc('monitor-select')} option[value="${monitor}"]`)).should('exist');
  cy.get(grupo(nome, dc('monitor-select'))).select(monitor);
};

const comAlunosDoGrupo = (nome: string, verificar: (alunos: string[]) => void) =>
  requisitar('GET', '/api/grupos').its('body').then((grupos: { nome: string; alunos: string[] }[]) => {
    verificar(grupos.find(g => g.nome === nome)!.alunos.slice().sort());
  });

Before(() => {
  requisitar('POST', '/api/test/reset'); // cada cenário começa com o estado limpo
});

// ---------- Given ----------
Given('o grupo {string} existe com os alunos {string} e {string} e o monitor {string}',
  (nome: string, aluno1: string, aluno2: string, monitor: string) => {
    cadastrarMonitor(monitor);
    criarGrupo(nome, [aluno1, aluno2]);
    alocarPelaApi(nome, monitor);
    requisitar('POST', '/api/test/reset-notificacoes'); // a alocação inicial não faz parte do cenário
  });

Given('o grupo {string} existe com os alunos {string} e {string} e sem monitor definido',
  (nome: string, aluno1: string, aluno2: string) => {
    cadastrarMonitor('joaosilva');
    criarGrupo(nome, [aluno1, aluno2]);
  });

Given('o grupo {string} existe sem nenhum aluno e sem monitor definido', (nome: string) => {
  criarGrupo(nome, []);
});

Given('o monitor {string} é o único monitor livre no momento', (monitor: string) => {
  requisitar('POST', '/api/test/reset-monitores');
  cadastrarMonitor(monitor);
  requisitar('GET', '/api/monitores').its('body').should('deep.equal', [monitor]);
});

Given('o monitor {string} está alocado ao grupo {string}', (monitor: string, nome: string) => {
  cadastrarMonitor(monitor);
  criarGrupo(nome, []);
  alocarPelaApi(nome, monitor);
  requisitar('POST', '/api/test/reset-notificacoes');
});

Given('o monitor {string} já está alocado ao grupo {string}', (monitor: string, nome: string) => {
  cadastrarMonitor(monitor);
  criarGrupo(nome, []);
  alocarPelaApi(nome, monitor);
  requisitar('POST', '/api/test/reset-notificacoes');
});

Given('o grupo {string} não existe no sistema', (nome: string) => {
  requisitar('GET', '/api/grupos').its('body').should((grupos: { nome: string }[]) => {
    expect(grupos.map(g => g.nome)).not.to.include(nome);
  });
});

Given('não há nenhum monitor disponível no momento', () => {
  requisitar('POST', '/api/test/reset-monitores');
  requisitar('GET', '/api/monitores').its('body').should('deep.equal', []);
});

// ---------- When ----------
When('o professor aloca o monitor {string} ao grupo {string}', (monitor: string, nome: string) => {
  cadastrarMonitor(monitor);
  abrirTelaDeGrupos(nome);
  selecionarMonitor(nome, monitor);
  cy.get(grupo(nome, dc('alocar-monitor-btn'))).click();
});

When('o professor aloca o monitor {string} também ao grupo {string}', (monitor: string, nome: string) => {
  abrirTelaDeGrupos(nome);
  selecionarMonitor(nome, monitor);
  cy.get(grupo(nome, dc('alocar-monitor-btn'))).click();
});

When('o professor tenta alocar um monitor ao grupo {string}', (nome: string) => {
  abrirTelaDeGrupos(nome);
  cy.get(grupo(nome, dc('alocar-monitor-btn'))).click();
});

When('o professor adiciona o aluno {string} ao grupo {string}', (aluno: string, nome: string) => {
  abrirTelaDeGrupos(nome);
  cy.intercept('POST', `**/api/grupos/${nome}/alunos`).as('adicionarAluno');
  cy.get(grupo(nome, dc('aluno-input'))).type(aluno);
  cy.get(grupo(nome, dc('adicionar-aluno-btn'))).click();
  cy.wait('@adicionarAluno').its('response.statusCode').should('eq', 201); // interface -> API
});

When('o professor tenta adicionar o aluno {string} novamente ao grupo {string}', (aluno: string, nome: string) => {
  abrirTelaDeGrupos(nome);
  cy.get(grupo(nome, dc('aluno-input'))).type(aluno);
  cy.get(grupo(nome, dc('adicionar-aluno-btn'))).click();
});

When('o professor realoca o monitor {string} do grupo {string} para o grupo {string}',
  (monitor: string, origem: string, destino: string) => {
    abrirTelaDeGrupos(origem);
    cy.get(grupo(origem, dc('grupo-monitor'))).should('have.text', monitor);
    cy.get(grupo(origem, dc('destino-input'))).type(destino);
    cy.get(grupo(origem, dc('realocar-monitor-btn'))).click();
  });

When('o professor tenta realocar o monitor {string} do grupo {string} para o grupo {string}',
  (monitor: string, origem: string, destino: string) => {
    abrirTelaDeGrupos(origem);
    cy.get(grupo(origem, dc('grupo-monitor'))).should('have.text', monitor);
    cy.get(grupo(origem, dc('destino-input'))).type(destino);
    cy.get(grupo(origem, dc('realocar-monitor-btn'))).click();
  });

When('o sistema de alocação automática é executado para o grupo {string}', (nome: string) => {
  abrirTelaDeGrupos(nome);
  cy.get(grupo(nome, dc('alocacao-automatica-btn'))).click();
});

When('o professor remove o monitor {string} do grupo {string} sem realocá-lo', (monitor: string, nome: string) => {
  abrirTelaDeGrupos(nome);
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', monitor);
  cy.get(grupo(nome, dc('remover-monitor-btn'))).click();
});

// ---------- Then ----------
Then('o sistema envia uma notificação de alocação para {string}, {string} e {string}',
  (d1: string, d2: string, d3: string) => {
    cy.get('[data-cy="notificacao-item"][data-tipo="alocacao"] [data-cy="notificacao-destinatario"]')
      .should($els => expect(textos($els).sort()).to.deep.equal([d1, d2, d3].sort()));
  });

Then('o sistema envia uma notificação de aviso para {string}, {string}, {string} e {string}',
  (d1: string, d2: string, d3: string, d4: string) => {
    requisitar('GET', '/api/grupos/ESS-G3/notificacoes').its('body') // API -> serviço de notificação
      .then((notificacoes: { tipo: string; destinatario: string }[]) => {
        const avisos = notificacoes.filter(n => n.tipo === 'aviso').map(n => n.destinatario).sort();
        expect(avisos).to.deep.equal([d1, d2, d3, d4].sort());
      });
  });

Then('o grupo {string} passa a ter {string} como monitor', (nome: string, monitor: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', monitor);
});

Then('o grupo {string} passa a ter {string}, {string} e {string} como alunos',
  (nome: string, a1: string, a2: string, a3: string) => {
    cy.get(grupo(nome, dc('grupo-aluno')))                           // API -> interface
      .should($els => expect(textos($els).sort()).to.deep.equal([a1, a2, a3].sort()));
  });

Then('o sistema exibe uma mensagem informando que não há monitor disponível', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'Não há monitor disponível');
});

Then('o sistema exibe uma mensagem informando que o aluno já pertence ao grupo', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'O aluno já pertence ao grupo');
});

Then('o sistema exibe uma mensagem informando que o grupo de destino não existe', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'Grupo de destino não existe');
});

Then('nenhuma notificação é enviada', () => {
  cy.get(dc('notificacao-item')).should('not.exist');
  requisitar('GET', '/api/notificacoes').its('body').should('deep.equal', []);
});

Then('o grupo {string} continua sem monitor definido', (nome: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', 'Sem monitor');
});

Then('o grupo {string} passa a não ter monitor definido', (nome: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', 'Sem monitor');
});

Then('o grupo {string} mantém apenas {string} e {string} como alunos', (nome: string, a1: string, a2: string) => {
  cy.get(grupo(nome, dc('grupo-aluno')))
    .should($els => expect(textos($els).sort()).to.deep.equal([a1, a2].sort()));
});

Then('o sistema envia uma notificação de saída para os alunos do grupo {string}', (nome: string) => {
  comAlunosDoGrupo(nome, alunos => {
    notificacoesNaTela(nome, 'saida').should($els => expect(textos($els).sort()).to.deep.equal(alunos));
  });
});

Then('o sistema envia uma notificação de entrada para os alunos do grupo {string}', (nome: string) => {
  comAlunosDoGrupo(nome, alunos => {
    notificacoesNaTela(nome, 'entrada').should($els => expect(textos($els).sort()).to.deep.equal(alunos));
  });
});

Then('o histórico de notificações do grupo {string} registra a notificação de saída para {string} e {string}',
  (nome: string, a1: string, a2: string) => {
    requisitar('GET', `/api/grupos/${nome}/notificacoes`).its('body') // API -> histórico
      .then((historico: { tipo: string; destinatario: string; resultado: string }[]) => {
        const saidas = historico.filter(n => n.tipo === 'saida');
        expect(saidas.map(n => n.destinatario).sort()).to.deep.equal([a1, a2].sort());
        expect(saidas.every(n => n.resultado === 'Enviado')).to.equal(true);
      });
  });

Then('o sistema aloca o monitor {string} ao grupo {string}', (monitor: string, nome: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', monitor);
});

Then('a lista de monitores da disciplina mostra {string} como alocado ao grupo {string} por alocação automática',
  (monitor: string, nome: string) => {
    const item = `[data-cy="monitor-item"][data-login="${monitor}"][data-situacao="alocado"][data-automatica="true"]`;
    cy.get(item).should('exist');
    cy.get(`${item} [data-cy="monitor-grupos"]`).should('have.text', nome);
  });

Then('a lista de monitores da disciplina não mostra monitores livres', () => {
  cy.get('[data-cy="monitor-item"]').should('exist');
  cy.get('[data-cy="monitor-item"][data-situacao="livre"]').should('not.exist');
});

Then('o sistema envia uma notificação de remoção para {string} e {string}', (a1: string, a2: string) => {
  notificacoesNaTela('ESS-G3', 'remocao').should($els => expect(textos($els).sort()).to.deep.equal([a1, a2].sort()));
});

Then('o monitor {string} permanece alocado ao grupo {string}', (monitor: string, nome: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', monitor);
  requisitar('GET', '/api/grupos').its('body').then((grupos: { nome: string; monitor: string }[]) => {
    expect(grupos.find(g => g.nome === nome)!.monitor).to.equal(monitor);
  });
});

Then('o sistema envia uma notificação de alocação apenas para {string}', (monitor: string) => {
  notificacoesNaTela('ESS-G6', 'alocacao').should($els => expect(textos($els).sort()).to.deep.equal([monitor]));
  cy.get(dc('notificacao-item')).should('have.length', 1);
});

Then('o sistema envia uma notificação para os alunos do grupo {string}', (nome: string) => {
  comAlunosDoGrupo(nome, alunos => {
    notificacoesNaTela(nome, 'alocacao').should($els => expect(textos($els).sort()).to.deep.equal(alunos));
  });
});

Then('o sistema envia uma notificação para {string} informando o acúmulo de grupos', (monitor: string) => {
  notificacoesNaTela('ESS-G7', 'acumulo').should($els => expect(textos($els).sort()).to.deep.equal([monitor]));
});

Then('o grupo {string} permanece com {string} como monitor, sem alteração', (nome: string, monitor: string) => {
  cy.get(grupo(nome, dc('grupo-monitor'))).should('have.text', monitor);
  requisitar('GET', `/api/grupos/${nome}/notificacoes`).its('body').should('deep.equal', []);
});
