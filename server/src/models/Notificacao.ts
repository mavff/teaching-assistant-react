/** Resultado do processamento: Enviado/Falha é uma tentativa de envio, Ignorado é processamento sem envio. */
export type ResultadoNotificacao = 'Enviado' | 'Falha' | 'Ignorado';

/**
 * Registro de uma notificação para um destinatário.
 *
 * Os campos seguem o modelo DDD (id, nomeDestinatario, dataHora, resultado,
 * motivo, descricaoFalha). Para notificações de grupo, o grupo é registrado em
 * grupoRegistrado, que cumpre aqui o papel de turmaRegistrada.
 */
export class Notificacao {
  constructor(
    readonly id: number,
    readonly nomeDestinatario: string,
    readonly grupoRegistrado: string,
    readonly dataHora: Date,
    readonly resultado: ResultadoNotificacao,
    readonly motivo: string,
    readonly descricaoFalha?: string
  ) {}
}
