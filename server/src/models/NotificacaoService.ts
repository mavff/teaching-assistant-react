import { EmailSender } from './EmailSender';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Notificacao } from './Notificacao';

/**
 * Serviço compartilhado de notificações. Para cada destinatário, solicita o
 * envio a EmailSender e registra o resultado em HistoricoNotificacoes.
 */
export class NotificacaoService {
  constructor(
    private readonly historico: HistoricoNotificacoes,
    private readonly emailSender: EmailSender
  ) {}

  /** Notifica cada destinatário sobre uma mudança na composição de um grupo. */
  notificarGrupo(grupo: string, motivo: string, destinatarios: string[], conteudo: string): Notificacao[] {
    return destinatarios.map(destinatario => {
      const envio = this.emailSender.send(destinatario, `${motivo} - ${grupo}`, conteudo);
      const notificacao = new Notificacao(
        this.historico.proximoId(),
        destinatario,
        grupo,
        new Date(),
        envio.aceito ? 'Enviado' : 'Falha',
        motivo,
        envio.descricaoFalha
      );
      this.historico.registrar(notificacao);
      return notificacao;
    });
  }
}
