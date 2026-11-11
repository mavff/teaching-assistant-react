import { Notificacao } from './Notificacao';

/** Histórico das notificações já processadas, na ordem em que foram registradas. */
export class HistoricoNotificacoes {
  private notificacoes: Notificacao[] = [];
  private ultimoId = 0;

  /** Identidade para a próxima Notificacao a registrar. */
  proximoId(): number {
    return ++this.ultimoId;
  }

  registrar(notificacao: Notificacao): void {
    this.notificacoes.push(notificacao);
  }

  listar(): Notificacao[] {
    return [...this.notificacoes];
  }

  listarDoGrupo(grupo: string): Notificacao[] {
    return this.notificacoes.filter(n => n.grupoRegistrado === grupo);
  }

  buscar(idNotificacao: number): Notificacao | undefined {
    return this.notificacoes.find(n => n.id === idNotificacao);
  }

  limpar(): void {
    this.notificacoes = [];
    this.ultimoId = 0;
  }
}
