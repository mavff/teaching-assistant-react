const API_BASE_URL = 'http://localhost:3005';

export interface LinhaHistoricoNotificacao {
  id: number;
  origem: 'lembrete';
  contexto: string;
  dataHora: string;
  motivo: string;
  resultado: 'Enviado' | 'Falha' | 'Ignorado';
}

/** Inclui o contexto guardado na tentativa para exibição na linha de detalhes. */
export interface DetalhesHistoricoNotificacao extends LinhaHistoricoNotificacao {
  destinatario: string;
  descricaoFalha?: string;
  prazoRegistrado: string | null;
  pendenciasRegistradas: { nomeAluno: string; meta: string }[];
}

/** Consulta as linhas de resumo do agendador e permite cancelar ao sair da aba. */
export async function consultarHistorico(signal: AbortSignal): Promise<LinhaHistoricoNotificacao[]> {
  const resposta = await fetch(`${API_BASE_URL}/api/notificacoes/historico`, { signal });
  if (!resposta.ok) throw new Error('Não foi possível carregar o histórico');
  return resposta.json();
}

/** Consulta uma tentativa pelo ID e permite cancelar quando a linha é recolhida. */
export async function consultarDetalhesNotificacao(
  id: number,
  signal: AbortSignal
): Promise<DetalhesHistoricoNotificacao> {
  const resposta = await fetch(`${API_BASE_URL}/api/notificacoes/historico/${id}`, { signal });
  if (!resposta.ok) throw new Error('Não foi possível carregar os detalhes da notificação');
  return resposta.json();
}
