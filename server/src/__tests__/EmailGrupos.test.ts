import { ResultadoEnvio } from '../models/EmailSender';
import { EmailSenderGrupos } from '../models/EmailSenderGrupos';
import { Grupos } from '../models/Grupos';
import { HistoricoNotificacoes } from '../models/HistoricoNotificacoes';
import { Monitores } from '../models/Monitores';
import { Services } from '../models/Services';

/** Remetente falso no lugar do SMTP: anota os envios e recusa o que não é endereço de e-mail. */
const remetenteFalso = () => {
  const enviados: { destinatario: string; assunto: string }[] = [];
  return {
    enviados,
    send: async (destinatario: string, assunto: string): Promise<ResultadoEnvio> => {
      if (!destinatario.includes('@')) {
        return { aceito: false, descricaoFalha: 'Informe um único endereço de e-mail válido.' };
      }
      enviados.push({ destinatario, assunto });
      return { aceito: true };
    }
  };
};

describe('EmailSenderGrupos', () => {
  it('usa o envio simulado quando NOTIFICACOES_GRUPO_EMAIL não pede o envio real', async () => {
    const smtp = remetenteFalso();
    const remetente = new EmailSenderGrupos({}, () => smtp);

    expect(remetente.usaEnvioReal()).toBe(false);
    expect(await remetente.send('joao@cin.ufpe.br', 'Assunto', 'Texto')).toEqual({ aceito: true });
    expect(smtp.enviados).toEqual([]);
  });

  it('envia pelo SMTP quando NOTIFICACOES_GRUPO_EMAIL=smtp', async () => {
    const smtp = remetenteFalso();
    const remetente = new EmailSenderGrupos({ NOTIFICACOES_GRUPO_EMAIL: 'smtp' }, () => smtp);

    expect(remetente.usaEnvioReal()).toBe(true);
    expect(await remetente.send('joao@cin.ufpe.br', 'Assunto', 'Texto')).toEqual({ aceito: true });
    expect(smtp.enviados).toEqual([{ destinatario: 'joao@cin.ufpe.br', assunto: 'Assunto' }]);
  });

  it('lê o ambiente a cada envio, porque o .env é carregado depois de criar os serviços', async () => {
    const ambiente: NodeJS.ProcessEnv = {};
    const smtp = remetenteFalso();
    const remetente = new EmailSenderGrupos(ambiente, () => smtp);

    ambiente.NOTIFICACOES_GRUPO_EMAIL = 'smtp';
    await remetente.send('joao@cin.ufpe.br', 'Assunto', 'Texto');

    expect(smtp.enviados).toHaveLength(1);
  });
});

describe('Endereço de e-mail das notificações de grupo', () => {
  const emails: Record<string, string> = { Mariana: 'mariana@cin.ufpe.br', Pedro: '' };

  const criar = () => {
    const smtp = remetenteFalso();
    const services = new Services(new Grupos(), new Monitores(), new HistoricoNotificacoes(), smtp, smtp,
      nome => emails[nome]);
    services.cadastrarMonitor('joaosilva', 'João Silva', 'joao@cin.ufpe.br');
    return { services, smtp };
  };

  it('envia ao monitor no e-mail dele e ao aluno no e-mail do cadastro de alunos', async () => {
    const { services, smtp } = criar();
    services.criarGrupo('ESS-G3', ['Mariana']);

    await services.alocarMonitor('ESS-G3', 'joaosilva');

    expect(smtp.enviados.map(e => e.destinatario)).toEqual(['mariana@cin.ufpe.br', 'joao@cin.ufpe.br']);
    expect(smtp.enviados[0].assunto).toBe('Alocação de monitor - ESS-G3');
    expect(services.consultarHistorico().map(n => [n.nomeDestinatario, n.resultado]))
      .toEqual([['Mariana', 'Enviado'], ['joaosilva', 'Enviado']]);
  });

  it('registra Falha, com a descrição, para aluno sem e-mail ou sem cadastro, e envia aos demais', async () => {
    const { services, smtp } = criar();
    services.criarGrupo('ESS-G3', ['Pedro', 'Carla', 'Mariana']);

    await services.alocarMonitor('ESS-G3', 'joaosilva');

    const historico = services.consultarHistorico();
    expect(historico.map(n => [n.nomeDestinatario, n.resultado])).toEqual([
      ['Pedro', 'Falha'], ['Carla', 'Falha'], ['Mariana', 'Enviado'], ['joaosilva', 'Enviado']
    ]);
    expect(historico[0].descricaoFalha).toBe('Informe um único endereço de e-mail válido.');
    expect(smtp.enviados.map(e => e.destinatario)).toEqual(['mariana@cin.ufpe.br', 'joao@cin.ufpe.br']);
    expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
  });
});
