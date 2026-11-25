const API_BASE_URL = 'http://localhost:3005';

export interface LinhaHistoricoNotificacao {
  id: number;
  origem: 'lembrete';
  contexto: string;
  dataHora: string;
  motivo: string;
  resultado: 'Enviado' | 'Falha' | 'Ignorado';
}

export async function consultarHistorico(signal: AbortSignal): Promise<LinhaHistoricoNotificacao[]> {
  const resposta = await fetch(`${API_BASE_URL}/api/notificacoes/historico`, { signal });
  if (!resposta.ok) throw new Error('Não foi possível carregar o histórico');
  return resposta.json();
}
