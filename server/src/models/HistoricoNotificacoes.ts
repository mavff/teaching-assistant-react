import { Notificacao } from './Notificacao';

/** Histórico das notificações já processadas, na ordem em que foram registradas. */
export class HistoricoNotificacoes {
  private notificacoes: Notificacao[] = [];
  private ultimoId = 0;

  /** Identidade para a próxima Notificacao a registrar. */
  proximoId(): number {
    return ++this.ultimoId;
  }

  /** Acrescenta a notificação ao fim do histórico, na ordem em que foi registrada. */
  registrar(notificacao: Notificacao): void {
    this.notificacoes.push(notificacao);
  }

  /** Devolve uma nova lista na ordem de registro para proteger a lista armazenada. */
  listar(): Notificacao[] {
    return [...this.notificacoes];
  }

  listarDoGrupo(grupo: string): Notificacao[] {
    return this.notificacoes.filter(n => n.grupoRegistrado === grupo);
  }

  /** Localiza pelo ID o registro consultado pela rota de detalhes. */
  buscar(idNotificacao: number): Notificacao | undefined {
    return this.notificacoes.find(n => n.id === idNotificacao);
  }

  /** Prepara cada notificação para gravação e preserva a ordem dos registros. */
  toJSON() {
    return this.notificacoes.map(notificacao => notificacao.toJSON());
  }

  /** Valida os registros salvos e retoma a numeração a partir do maior ID encontrado. */
  restaurar(dados: unknown): void {
    // Arquivos anteriores a este incremento começam com histórico vazio.
    if (dados !== undefined && !Array.isArray(dados)) {
      throw new Error('Histórico de notificações inválido');
    }

    const registros = (dados ?? []).map(Notificacao.fromJSON);
    const ids = new Set(registros.map(registro => registro.id));
    if (ids.size !== registros.length) {
      throw new Error('Identificador de notificação duplicado no histórico');
    }

    // Substitui o histórico somente após validar todos os registros.
    this.notificacoes = registros;
    this.ultimoId = registros.reduce((maior, registro) => Math.max(maior, registro.id), 0);
  }

  /** Esvazia o histórico e reinicia a contagem de IDs. */
  limpar(): void {
    this.notificacoes = [];
    this.ultimoId = 0;
  }
}
