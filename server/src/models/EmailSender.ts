/**
 * Retorno de send: informa a aceitação pelo serviço de email ou a falha com a
 * descrição do erro. Aceitação não significa entrega nem leitura.
 */
export interface ResultadoEnvio {
  aceito: boolean;
  descricaoFalha?: string;
}

/** Contrato de EmailSender do modelo: send(destinatario, assunto, conteudo). */
export interface EmailSender {
  send(destinatario: string, assunto: string, conteudo: string): ResultadoEnvio;
}

/**
 * Implementação simulada (stub): aceita todo envio e guarda as mensagens.
 * Serve até existir um serviço de email real; não é uma funcionalidade pronta.
 */
export class EmailSenderSimulado implements EmailSender {
  readonly enviados: { destinatario: string; assunto: string; conteudo: string }[] = [];

  send(destinatario: string, assunto: string, conteudo: string): ResultadoEnvio {
    this.enviados.push({ destinatario, assunto, conteudo });
    return { aceito: true };
  }
}
