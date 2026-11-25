import { After, Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import {
  alocarMonitor, cadastrarAluno, cadastrarMonitor, comGrupo, comNotificacoes, criarGrupo, limparNotificacoes,
  monitoresLivres, removerAlunosCriados, requisitar, tipoDaNotificacao
} from '../grupos-api';

// Seletores estáveis (data-cy) escopados pelo grupo, sem depender de classes CSS.
const grupo = (nome: string, interno = '') => `[data-cy="grupo-${nome}"] ${interno}`.trim();
const dc = (nome: string) => `[data-cy="${nome}"]`;

const textos = ($els: JQuery<HTMLElement>) => $els.toArray().map(el => (el.textContent || '').trim());
const iguaisA = (esperados: string[]) => ($els: JQuery<HTMLElement>) =>
  expect(textos($els).sort()).to.deep.equal([...esperados].sort());

const notificacoesNaTela = (tipo: string, nomeGrupo?: string) => {
  const filtroGrupo = nomeGrupo ? `[data-grupo="${nomeGrupo}"]` : '';
  return cy.get(`[data-cy="notificacao-item"]${filtroGrupo}[data-tipo="${tipo}"] [data-cy="notificacao-destinatario"]`);
};

const monitorNaTela = (nome: string) => cy.get(grupo(nome, dc('grupo-monitor')));

Before(() => {
  requisitar('POST', '/api/test/reset'); // cada cenário começa com o sistema vazio
});

After(() => {
  removerAlunosCriados(); // tira do cadastro de alunos os criados pelo cenário
});

// ---------- Given (preparam o estado pela API; usados também pelos cenários de serviço) ----------
Given('o grupo {string} existe com os alunos {string} e {string} e sem monitor definido',
  (nome: string, aluno1: string, aluno2: string) => {
    criarGrupo(nome, [aluno1, aluno2]);
  });

Given('o grupo {string} existe com os alunos {string} e {string} e o monitor {string}',
  (nome: string, aluno1: string, aluno2: string, monitor: string) => {
    cadastrarMonitor(monitor);
    criarGrupo(nome, [aluno1, aluno2]);
    alocarMonitor(nome, monitor);
    limparNotificacoes(); // a alocação inicial faz parte da preparação, não do cenário
  });

Given('o grupo {string} existe sem nenhum aluno e sem monitor definido', (nome: string) => {
  criarGrupo(nome, []);
});

Given('o monitor {string} está cadastrado e livre', (monitor: string) => {
  cadastrarMonitor(monitor);
  monitoresLivres().should('include', monitor);
});

Given('o monitor {string} é o único monitor livre no momento', (monitor: string) => {
  cadastrarMonitor(monitor);
  monitoresLivres().should('deep.equal', [monitor]);
});

Given('o monitor {string} está alocado ao grupo {string}', (monitor: string, nome: string) => {
  cadastrarMonitor(monitor);
  criarGrupo(nome, []);
  alocarMonitor(nome, monitor);
  limparNotificacoes();
});

Given('o aluno {string} está cadastrado no sistema', (nome: string) => {
  cadastrarAluno(nome);
});

Given('o grupo {string} não existe no sistema', (nome: string) => {
  requisitar('GET', '/api/grupos').its('body').should((grupos: { nome: string }[]) => {
    expect(grupos.map(g => g.nome)).not.to.include(nome);
  });
});

Given('não há nenhum monitor disponível no momento', () => {
  monitoresLivres().should('deep.equal', []);
});

// Aba que abre cada página citada nos cenários (independe do idioma do rótulo)
const ABAS: Record<string, string> = { Groups: 'groups-tab' };

const abrirPagina = (pagina: string) => {
  cy.visit('/');
  cy.get(`[data-testid="${ABAS[pagina]}"]`).click();
  cy.get(dc('grupos-pagina')).should('be.visible');
};

Given('eu estou na página {string}', abrirPagina);

When('eu abro a página {string}', abrirPagina);

// ---------- When (ações do professor pela interface) ----------
const realocar = (monitor: string, origem: string, destino: string) => {
  monitorNaTela(origem).should('have.text', monitor);
  cy.get(grupo(origem, dc('destino-input'))).type(destino);
  cy.get(grupo(origem, dc('realocar-monitor-btn'))).click();
};

const opcaoDeAluno = (nome: string, aluno: string) =>
  grupo(nome, `${dc('aluno-select')} option[value="${aluno}"]`);

const cadastrarMonitorPelaTela = (login: string, nome: string, email: string) => {
  cy.get(dc('novo-monitor-login')).type(login);
  cy.get(dc('novo-monitor-nome')).type(nome);
  cy.get(dc('novo-monitor-email')).type(email);
  cy.get(dc('cadastrar-monitor-btn')).click();
};

const alocarPelaTela = (monitor: string, nome: string) => {
  cy.get(grupo(nome, `${dc('monitor-select')} option[value="${monitor}"]`)).should('exist');
  cy.get(grupo(nome, dc('monitor-select'))).select(monitor);
  cy.get(grupo(nome, dc('alocar-monitor-btn'))).click();
};

When('o professor aloca o monitor {string} (também )ao grupo {string}', alocarPelaTela);

When('o professor tenta alocar o monitor {string} ao grupo {string}', alocarPelaTela);

When('o professor cria o grupo {string} com os alunos {string} e {string}',
  (nome: string, aluno1: string, aluno2: string) => {
    cy.get(dc('novo-grupo-nome')).type(nome);
    [aluno1, aluno2].forEach(aluno => cy.get(dc('novo-grupo-aluno-select')).select(aluno));
    cy.get(dc('novo-grupo-aluno')).should('have.length', 2);
    cy.get(dc('criar-grupo-btn')).click();
  });

When('o professor tenta criar o grupo {string} sem alunos', (nome: string) => {
  cy.get(dc('novo-grupo-nome')).type(nome);
  cy.get(dc('criar-grupo-btn')).click();
});

When('o professor cadastra o monitor {string} com nome {string} e e-mail {string}', cadastrarMonitorPelaTela);

When('o professor tenta cadastrar o monitor {string} com nome {string} e e-mail {string}', cadastrarMonitorPelaTela);

When('o professor tenta alocar um monitor ao grupo {string}', (nome: string) => {
  cy.get(grupo(nome, dc('alocar-monitor-btn'))).click();
});

When('o professor adiciona o aluno {string} ao grupo {string}', (aluno: string, nome: string) => {
  cy.get(opcaoDeAluno(nome, aluno)).should('exist');
  cy.get(grupo(nome, dc('aluno-select'))).select(aluno);
  cy.get(grupo(nome, dc('adicionar-aluno-btn'))).click();
});

When('o professor realoca o monitor {string} do grupo {string} para o grupo {string}', realocar);

When('o professor tenta realocar o monitor {string} do grupo {string} para o grupo {string}', realocar);

When('o sistema de alocação automática é executado para o grupo {string}', (nome: string) => {
  cy.get(grupo(nome, dc('alocacao-automatica-btn'))).click();
});

When('o professor remove o monitor {string} do grupo {string} sem realocá-lo', (monitor: string, nome: string) => {
  monitorNaTela(nome).should('have.text', monitor);
  cy.get(grupo(nome, dc('remover-monitor-btn'))).click();
});

// ---------- Then (o que o professor vê na página) ----------
Then('o sistema envia uma notificação de alocação para {string}, {string} e {string}',
  (d1: string, d2: string, d3: string) => {
    notificacoesNaTela('alocacao').should(iguaisA([d1, d2, d3]));
  });

Then('o sistema envia uma notificação de aviso para {string}, {string}, {string} e {string}',
  (d1: string, d2: string, d3: string, d4: string) => {
    notificacoesNaTela('aviso').should(iguaisA([d1, d2, d3, d4]));
  });

Then('o sistema envia uma notificação de {word} do grupo {string} para {string} e {string}',
  (tipo: string, nome: string, d1: string, d2: string) => {
    notificacoesNaTela(tipoDaNotificacao(tipo), nome).should(iguaisA([d1, d2]));
  });

Then('o sistema envia uma notificação de {word} do grupo {string} apenas para {string}',
  (tipo: string, nome: string, destinatario: string) => {
    notificacoesNaTela(tipoDaNotificacao(tipo), nome).should(iguaisA([destinatario]));
    cy.get(dc('notificacao-item')).should('have.length', 1);
  });

Then('o sistema envia uma notificação para {string} informando o acúmulo de grupos', (monitor: string) => {
  notificacoesNaTela('acumulo').should(iguaisA([monitor]));
});

Then('o histórico de notificações do grupo {string} registra a notificação de saída para {string} e {string}',
  (nome: string, a1: string, a2: string) => {
    comNotificacoes(nome, historico => {
      const saidas = historico.filter(n => n.tipo === 'saida');
      expect(saidas.map(n => n.destinatario).sort()).to.deep.equal([a1, a2].sort());
      expect(saidas.every(n => n.resultado === 'Enviado')).to.equal(true);
    });
  });

Then('o grupo {string} passa a ter {string} como monitor', (nome: string, monitor: string) => {
  monitorNaTela(nome).should('have.text', monitor);
});

Then('o grupo {string} passa a ter {string}, {string} e {string} como alunos',
  (nome: string, a1: string, a2: string, a3: string) => {
    cy.get(grupo(nome, dc('grupo-aluno'))).should(iguaisA([a1, a2, a3]));
  });

Then('o grupo {string} passa a ter {string} e {string} como alunos', (nome: string, a1: string, a2: string) => {
  cy.get(grupo(nome, dc('grupo-aluno'))).should(iguaisA([a1, a2]));
});

Then('a lista de alunos para adicionar ao grupo {string} oferece {string} e não oferece {string}',
  (nome: string, oferecido: string, naoOferecido: string) => {
    cy.get(opcaoDeAluno(nome, oferecido)).should('exist');
    cy.get(opcaoDeAluno(nome, naoOferecido)).should('not.exist');
  });

Then('a lista de alunos do novo grupo oferece {string} e não oferece {string}',
  (oferecido: string, naoOferecido: string) => {
    const opcao = (aluno: string) => `${dc('novo-grupo-aluno-select')} option[value="${aluno}"]`;
    cy.get(opcao(oferecido)).should('exist');
    cy.get(opcao(naoOferecido)).should('not.exist');
  });

Then('o grupo {string} mantém apenas {string} e {string} como alunos', (nome: string, a1: string, a2: string) => {
  cy.get(grupo(nome, dc('grupo-aluno'))).should(iguaisA([a1, a2]));
});

const semMonitorNaTela = (nome: string) => monitorNaTela(nome).should('have.text', 'No monitor');
Then('o grupo {string} continua sem monitor definido', semMonitorNaTela);
Then('o grupo {string} passa a não ter monitor definido', semMonitorNaTela);
Then('o grupo {string} está sem monitor definido', semMonitorNaTela);

Then('o monitor {string} permanece alocado ao grupo {string}', (monitor: string, nome: string) => {
  monitorNaTela(nome).should('have.text', monitor);
  comGrupo(nome, g => expect(g.monitor).to.equal(monitor));
});

Then('o sistema exibe uma mensagem informando que não há monitor disponível', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'No monitor available');
});

Then('o sistema exibe uma mensagem informando que o aluno já pertence ao grupo', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'The student is already in the group');
});

Then('o sistema exibe uma mensagem informando que o grupo de destino não existe', () => {
  cy.get(dc('mensagem-erro')).should('have.text', 'Destination group does not exist');
});

Then('o sistema exibe a mensagem de erro {string}', (mensagem: string) => {
  cy.get(dc('mensagem-erro')).should('have.text', mensagem);
});

Then('nenhuma notificação é enviada', () => {
  cy.get(dc('notificacao-item')).should('not.exist');
  comNotificacoes(null, lista => expect(lista).to.deep.equal([]));
});

Then('nenhuma notificação do grupo {string} é enviada', (nome: string) => {
  cy.get(`[data-cy="notificacao-item"][data-grupo="${nome}"]`).should('not.exist');
  comNotificacoes(nome, lista => expect(lista).to.deep.equal([]));
});

Then('a lista de monitores da disciplina mostra {string} como alocado ao grupo {string} por alocação automática',
  (monitor: string, nome: string) => {
    const item = `[data-cy="monitor-item"][data-login="${monitor}"][data-situacao="alocado"][data-automatica="true"]`;
    cy.get(item).should('exist');
    cy.get(`${item} [data-cy="monitor-grupos"]`).should('have.text', nome);
  });

Then('a lista de monitores da disciplina mostra {string}, com login {string} e e-mail {string}, como livre',
  (nome: string, login: string, email: string) => {
    const item = `[data-cy="monitor-item"][data-login="${login}"][data-situacao="livre"]`;
    cy.get(`${item} [data-cy="monitor-nome"]`).should('have.text', nome);
    cy.get(`${item} [data-cy="monitor-email"]`).should('have.text', email);
  });

Then('a lista de monitores da disciplina não mostra {string}', (login: string) => {
  cy.get(dc('monitores-lista')).should('exist');
  cy.get(`[data-cy="monitor-item"][data-login="${login}"]`).should('not.exist');
});

Then('a lista de monitores da disciplina não mostra monitores livres', () => {
  cy.get(dc('monitor-item')).should('exist');
  cy.get('[data-cy="monitor-item"][data-situacao="livre"]').should('not.exist');
});
