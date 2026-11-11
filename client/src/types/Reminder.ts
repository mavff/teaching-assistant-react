export type EstadoLembrete = 'Não enviado' | 'Agendado' | 'Enviado' | 'Ignorado' | 'Cancelado';

export interface LembreteProposto {
  id: string; // Mantém a identidade do lembrete entre consultas e edições.
  data: string; // Data UTC; o componente converte o preenchimento local antes do envio.
  horario: string; // Horário UTC, com precisão de minutos.
}

export interface Lembrete extends LembreteProposto {
  estado: EstadoLembrete; // Estado retornado pelo servidor; não é editável na configuração.
  motivo: string | null;
  proximoReenvioEm: string | null; // Instante ISO ou null quando não existe reenvio programado.
}

export interface ConfiguracaoLembretes {
  turmaId: string;
  prazoAcademico: string | null; // Prazo oficial consultado pelo servidor para a turma.
  lembretes: Lembrete[]; // A quantidade é derivada da lista recebida.
}

export interface SalvarConfiguracaoLembretes {
  quantidade: number;
  lembretes: LembreteProposto[]; // O cliente não recebe permissão para definir estado ou reenvio.
}
