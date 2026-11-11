export interface Grupo {
  nome: string;
  alunos: string[];
  monitor: string | null;
  alocacaoAutomatica: boolean;
}

export interface SituacaoMonitor {
  login: string;
  situacao: 'alocado' | 'livre';
  grupos: string[];
  alocacaoAutomatica: boolean;
}

export interface Notificacao {
  id: number;
  grupo: string;
  destinatario: string;
  tipo: string;
  mensagem: string;
  resultado?: string;
  descricaoFalha?: string;
}

const baseUrl = 'http://localhost:3005/api';
const grupoUrl = (nome: string) => `${baseUrl}/grupos/${encodeURIComponent(nome)}`;

/** Sends the request and returns the JSON body; a rejected rule becomes an Error with the server's message. */
async function requisitar<T>(url: string, falha: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let mensagem = falha;
    try {
      mensagem = (await response.json()).error || falha;
    } catch {
      // resposta sem corpo JSON: mantém a mensagem padrão
    }
    throw new Error(mensagem);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const enviar = <T>(metodo: string, url: string, corpo: unknown, falha: string) =>
  requisitar<T>(url, falha, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

/** Access to the groups, monitors and notifications kept by the server. */
export const grupoService = {
  listarGrupos: (): Promise<Grupo[]> =>
    requisitar(`${baseUrl}/grupos`, 'Failed to fetch groups'),

  situacaoDosMonitores: (): Promise<SituacaoMonitor[]> =>
    requisitar(`${baseUrl}/monitores/situacao`, 'Failed to fetch monitor list'),

  listarNotificacoes: (): Promise<Notificacao[]> =>
    requisitar(`${baseUrl}/notificacoes`, 'Failed to fetch notifications'),

  alocarMonitor: (grupo: string, monitor?: string): Promise<Grupo> =>
    enviar('POST', `${grupoUrl(grupo)}/monitor`, { monitor }, 'Failed to allocate monitor'),

  alocarAutomaticamente: (grupo: string): Promise<Grupo> =>
    enviar('POST', `${grupoUrl(grupo)}/alocacao-automatica`, {}, 'Failed to allocate monitor'),

  removerMonitor: (grupo: string): Promise<void> =>
    requisitar(`${grupoUrl(grupo)}/monitor`, 'Failed to remove monitor', { method: 'DELETE' }),

  realocarMonitor: (grupo: string, monitor: string, destino: string): Promise<Grupo> =>
    enviar('POST', `${grupoUrl(grupo)}/realocar-monitor`, { monitor, destino }, 'Failed to move monitor'),

  adicionarAluno: (grupo: string, aluno: string): Promise<Grupo> =>
    enviar('POST', `${grupoUrl(grupo)}/alunos`, { aluno }, 'Failed to add student')
};
