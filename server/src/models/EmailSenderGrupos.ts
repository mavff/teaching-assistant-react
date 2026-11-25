import { EmailSenderSimulado, EmailSenderSmtp, ResultadoEnvio } from './EmailSender';

/** Valor de NOTIFICACOES_GRUPO_EMAIL que liga o envio real das notificações de grupo. */
export const ENVIO_REAL_GRUPOS = 'smtp';

/**
 * Remetente das notificações de grupos e monitores.
 *
 * Envia de verdade, pelo Gmail (EmailSenderSmtp), somente quando o ambiente tem
 * NOTIFICACOES_GRUPO_EMAIL=smtp; sem isso, usa o envio simulado. Assim o uso
 * normal e os testes automáticos não mandam e-mails para endereços de teste.
 * O ambiente é lido a cada envio, porque o servidor carrega o .env depois de
 * criar os serviços.
 */
export class EmailSenderGrupos {
  private smtp: Pick<EmailSenderSmtp, 'send'> | undefined;
  private readonly simulado = new EmailSenderSimulado();

  constructor(
    private readonly ambiente: NodeJS.ProcessEnv = process.env,
    private readonly criarSmtp: () => Pick<EmailSenderSmtp, 'send'> = () => new EmailSenderSmtp()
  ) {}

  usaEnvioReal(): boolean {
    return this.ambiente.NOTIFICACOES_GRUPO_EMAIL === ENVIO_REAL_GRUPOS;
  }

  async send(destinatario: string, assunto: string, conteudo: string): Promise<ResultadoEnvio> {
    if (!this.usaEnvioReal()) {
      return this.simulado.send(destinatario, assunto, conteudo);
    }
    this.smtp ??= this.criarSmtp();
    return this.smtp.send(destinatario, assunto, conteudo);
  }
}
