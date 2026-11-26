const API_BASE_URL = 'http://localhost:3005';

export interface LinhaHistoricoNotificacao {
  id: number;
  origem: 'lembrete';
  contexto: string;
  dataHora: string;
  motivo: string;
  resultado: 'Enviado' | 'Falha' | 'Ignorado';
}

export interface DetalhesHistoricoNotificacao extends LinhaHistoricoNotificacao {
  destinatario: string;
  prazoRegistrado: string | null;
  pendenciasRegistradas: { nomeAluno: string; meta: string }[];
}

export async function consultarHistorico(signal: AbortSignal): Promise<LinhaHistoricoNotificacao[]> {
  const resposta = await fetch(`${API_BASE_URL}/api/notificacoes/historico`, { signal });
  if (!resposta.ok) throw new Error('Não foi possível carregar o histórico');
  return resposta.json();
}

export async function consultarDetalhesNotificacao(
  id: number,
  signal: AbortSignal
): Promise<DetalhesHistoricoNotificacao> {
  const resposta = await fetch(`${API_BASE_URL}/api/notificacoes/historico/${id}`, { signal });
  if (!resposta.ok) throw new Error('Não foi possível carregar os detalhes da notificação');
  return resposta.json();
}
