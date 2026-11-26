// Acesso à API de grupos usado pelos steps de GUI e de serviço.

export interface GrupoJson { nome: string; alunos: string[]; monitor: string | null; alocacaoAutomatica: boolean }
export interface NotificacaoJson { grupo: string; destinatario: string; tipo: string; resultado: string }

const apiUrl = () => Cypress.env('apiUrl') as string;

export const requisitar = (method: string, caminho: string, body?: object) =>
  cy.request({ method, url: `${apiUrl()}${caminho}`, body, failOnStatusCode: false });

/** Sem nome e e-mail informados no cenário, usa o login como nome e um e-mail derivado dele. */
export const cadastrarMonitor = (login: string, nome = login, email = `${login}@cin.ufpe.br`) =>
  requisitar('POST', '/api/monitores', { login, nome, email }).its('status').should('eq', 201);

// Alunos criados pelos cenários na aba Students; removidos ao fim de cada cenário
// para não deixar dados de teste no cadastro de alunos.
const alunosCriados: string[] = [];

export const cadastrarAluno = (nome: string) => {
  const cpf = String(90000000000 + Math.floor(Math.random() * 9999999999)).slice(0, 11);
  return requisitar('POST', '/api/students', { name: nome, cpf, email: `aluno${cpf}@teste.com` })
    .then(resposta => {
      expect(resposta.status, `cadastro do aluno ${nome}`).to.equal(201);
      alunosCriados.push(cpf);
    });
};

export const removerAlunosCriados = () => {
  while (alunosCriados.length) {
    requisitar('DELETE', `/api/students/${alunosCriados.pop()}`);
  }
};

export const criarGrupo = (nome: string, alunos: string[]) =>
  requisitar('POST', '/api/grupos', { nome, alunos }).its('status').should('eq', 201);

export const alocarMonitor = (nome: string, monitor: string) =>
  requisitar('POST', `/api/grupos/${nome}/monitor`, { monitor }).its('status').should('eq', 201);

export const limparNotificacoes = () => requisitar('POST', '/api/test/reset-notificacoes');

export const monitoresLivres = () => requisitar('GET', '/api/monitores').its('body');

export const comGrupo = (nome: string, verificar: (grupo: GrupoJson) => void) =>
  requisitar('GET', '/api/grupos').its('body').then((grupos: GrupoJson[]) => {
    const grupo = grupos.find(g => g.nome === nome);
    expect(grupo, `grupo ${nome}`).to.exist;
    verificar(grupo!);
  });

export const comNotificacoes = (grupo: string | null, verificar: (lista: NotificacaoJson[]) => void) =>
  requisitar('GET', grupo ? `/api/grupos/${grupo}/notificacoes` : '/api/notificacoes').its('body').then(verificar);

/** Destinatários das notificações de um tipo, em ordem alfabética. */
export const destinatarios = (lista: NotificacaoJson[], tipo: string) =>
  lista.filter(n => n.tipo === tipo).map(n => n.destinatario).sort();

/** "saída" -> "saida", "remoção" -> "remocao": o tipo como a API o expõe. */
export const tipoDaNotificacao = (palavra: string) =>
  palavra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
