import { DomainError } from '../models/DomainError';
import { EmailSender, ResultadoEnvio } from '../models/EmailSender';
import { Grupos } from '../models/Grupos';
import { HistoricoNotificacoes } from '../models/HistoricoNotificacoes';
import { Monitores } from '../models/Monitores';
import {
  MOTIVO_ACUMULO, MOTIVO_ALOCACAO, MOTIVO_ENTRADA, MOTIVO_REMOCAO, MOTIVO_SAIDA, Services
} from '../models/Services';

const destinatarios = (services: Services, tipo?: string) =>
  services.consultarHistorico()
    .filter(n => !tipo || n.motivo === tipo)
    .map(n => n.nomeDestinatario)
    .sort();

describe('Services (grupos, monitores e notificações)', () => {
  let services: Services;

  beforeEach(async () => {
    services = new Services();
    services.cadastrarMonitor('joaosilva', 'Monitor joaosilva', 'joaosilva@cin.ufpe.br');
    services.criarGrupo('ESS-G3', ['Mariana', 'Pedro']);
  });

  it('notifica alunos e monitor ao alocar o monitor', async () => {
    const grupo = await services.alocarMonitor('ESS-G3', 'joaosilva');

    expect(grupo.monitor).toBe('joaosilva');
    expect(destinatarios(services)).toEqual(['Mariana', 'Pedro', 'joaosilva']);
  });

  it('notifica todos os participantes ao adicionar um aluno a grupo com monitor', async () => {
    await services.alocarMonitor('ESS-G3', 'joaosilva');
    services.historico.limpar();

    await services.adicionarAluno('ESS-G3', 'Carla');

    expect(destinatarios(services)).toEqual(['Carla', 'Mariana', 'Pedro', 'joaosilva']);
    expect(services.grupos.buscar('ESS-G3')!.alunos).toEqual(['Mariana', 'Pedro', 'Carla']);
  });

  it('não notifica nem altera o grupo quando não há monitor disponível', async () => {
    services.monitores.limpar();

    await expect(services.alocarMonitor('ESS-G3')).rejects.toThrow(new DomainError('No monitor available'));
    expect(services.consultarHistorico()).toEqual([]);
    expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
  });

  it('não notifica ao adicionar aluno que já pertence ao grupo', async () => {
    await expect(services.adicionarAluno('ESS-G3', 'Pedro')).rejects.toThrow(new DomainError('The student is already in the group'));
    expect(services.consultarHistorico()).toEqual([]);
    expect(services.grupos.buscar('ESS-G3')!.alunos).toEqual(['Mariana', 'Pedro']);
  });

  it('notifica apenas o monitor quando o grupo não tem alunos', async () => {
    services.criarGrupo('ESS-G6');
    await services.alocarMonitor('ESS-G6', 'joaosilva');

    expect(services.consultarHistorico('ESS-G6').map(n => n.nomeDestinatario)).toEqual(['joaosilva']);
  });

  it('registra Falha, com a descrição, quando o EmailSender não aceita o envio', async () => {
    const recusa: EmailSender = {
      send: (): ResultadoEnvio => ({ aceito: false, descricaoFalha: 'Tempo limite excedido no envio' })
    };
    const comFalha = new Services(new Grupos(), new Monitores(), new HistoricoNotificacoes(), recusa);
    comFalha.cadastrarMonitor('joaosilva', 'Monitor joaosilva', 'joaosilva@cin.ufpe.br');
    comFalha.criarGrupo('ESS-G3', ['Mariana']);

    await comFalha.alocarMonitor('ESS-G3', 'joaosilva');

    const [primeira] = comFalha.consultarHistorico();
    expect(primeira.resultado).toBe('Falha');
    expect(primeira.descricaoFalha).toBe('Tempo limite excedido no envio');
  });

  it('rejeita grupo inexistente', async () => {
    await expect(services.adicionarAluno('ESS-X', 'Ana')).rejects.toThrow(new DomainError('Group does not exist'));
  });

  describe('realocação, remoção, alocação automática e acúmulo', () => {
    const porTipo = (grupo: string, motivo: string) =>
      services.consultarHistorico(grupo).filter(n => n.motivo === motivo).map(n => n.nomeDestinatario).sort();

    beforeEach(async () => {
      await services.alocarMonitor('ESS-G3', 'joaosilva');
      services.criarGrupo('ESS-G4', ['Lucas', 'Beatriz']);
      services.historico.limpar();
    });

    it('realoca o monitor, avisa os alunos dos dois grupos e atualiza os grupos', async () => {
      await services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G4');

      expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
      expect(services.grupos.buscar('ESS-G4')!.monitor).toBe('joaosilva');
      expect(porTipo('ESS-G3', MOTIVO_SAIDA)).toEqual(['Mariana', 'Pedro']);
      expect(porTipo('ESS-G4', MOTIVO_ENTRADA)).toEqual(['Beatriz', 'Lucas']);
    });

    it('não notifica nem altera nada quando o grupo de destino não existe', async () => {
      await expect(services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G9'))
        .rejects.toThrow(new DomainError('Destination group does not exist'));
      expect(services.consultarHistorico()).toEqual([]);
      expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
    });

    it('rejeita realocar monitor que não está no grupo de origem ou destino que já tem monitor', async () => {
      services.cadastrarMonitor('carloseduardo', 'Monitor carloseduardo', 'carloseduardo@cin.ufpe.br');
      await expect(services.realocarMonitor('ESS-G3', 'carloseduardo', 'ESS-G4'))
        .rejects.toThrow(new DomainError('The monitor is not allocated to the source group'));
      await services.alocarMonitor('ESS-G4', 'carloseduardo');
      services.historico.limpar();
      await expect(services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G4'))
        .rejects.toThrow(new DomainError('The destination group already has a monitor'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('remove o monitor sem realocar e avisa apenas os alunos', async () => {
      await services.removerMonitor('ESS-G3');

      expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
      expect(porTipo('ESS-G3', MOTIVO_REMOCAO)).toEqual(['Mariana', 'Pedro']);
      expect(services.consultarHistorico()).toHaveLength(2);
    });

    it('não notifica ao remover monitor de grupo que não tem monitor', async () => {
      await expect(services.removerMonitor('ESS-G4')).rejects.toThrow(new DomainError('The group has no monitor'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('aloca automaticamente o único monitor livre e o mostra na lista de monitores', async () => {
      services.monitores.limpar();
      services.cadastrarMonitor('mariaeduarda', 'Monitor mariaeduarda', 'mariaeduarda@cin.ufpe.br');

      await services.alocarAutomaticamente('ESS-G4');

      expect(services.grupos.buscar('ESS-G4')!.monitor).toBe('mariaeduarda');
      expect(porTipo('ESS-G4', MOTIVO_ALOCACAO)).toEqual(['Beatriz', 'Lucas', 'mariaeduarda']);
      expect(services.situacaoDosMonitores()).toEqual([
        {
          login: 'mariaeduarda', nome: 'Monitor mariaeduarda', email: 'mariaeduarda@cin.ufpe.br',
          situacao: 'alocado', grupos: ['ESS-G4'], alocacaoAutomatica: true
        }
      ]);
    });

    it('alocação automática sem monitor livre é rejeitada sem notificar', async () => {
      await expect(services.alocarAutomaticamente('ESS-G4')).rejects.toThrow(new DomainError('No monitor available'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('avisa os alunos e o monitor quando ele acumula grupos, sem alterar o grupo anterior', async () => {
      services.criarGrupo('ESS-G7', ['Ana', 'Bruno']);

      await services.alocarMonitor('ESS-G7', 'joaosilva');

      expect(porTipo('ESS-G7', MOTIVO_ALOCACAO)).toEqual(['Ana', 'Bruno']);
      expect(porTipo('ESS-G7', MOTIVO_ACUMULO)).toEqual(['joaosilva']);
      expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
      expect(services.consultarHistorico('ESS-G3')).toEqual([]);
    });
    it('não aloca outro monitor a grupo que já tem monitor, nem notifica', async () => {
      services.cadastrarMonitor('carloseduardo', 'Carlos Eduardo', 'carlos@cin.ufpe.br');

      await expect(services.alocarMonitor('ESS-G3', 'carloseduardo'))
        .rejects.toThrow(new DomainError('The group already has a monitor'));
      expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
      expect(services.consultarHistorico()).toEqual([]);
    });
  });

  describe('cadastro de monitores', () => {
    it('guarda login, nome e e-mail e mostra o monitor como livre', async () => {
      services.cadastrarMonitor('carloseduardo', ' Carlos Eduardo ', 'carlos@cin.ufpe.br');

      expect(services.situacaoDosMonitores()).toContainEqual({
        login: 'carloseduardo', nome: 'Carlos Eduardo', email: 'carlos@cin.ufpe.br',
        situacao: 'livre', grupos: [], alocacaoAutomatica: false
      });
    });

    it.each([
      ['', 'Carlos', 'carlos@cin.ufpe.br', 'Monitor login is required'],
      ['carlos', ' ', 'carlos@cin.ufpe.br', 'Monitor name is required'],
      ['carlos', 'Carlos', '', 'Monitor email is required'],
      ['carlos', 'Carlos', 'carlos', 'Invalid monitor email'],
      ['joaosilva', 'Outro João', 'outro@cin.ufpe.br', 'Monitor already registered']
    ])('rejeita login "%s", nome "%s" e e-mail "%s"', async (login, nome, email, mensagem) => {
      expect(() => services.cadastrarMonitor(login, nome, email)).toThrow(new DomainError(mensagem));
      expect(services.monitores.buscar('joaosilva')!.nome).toBe('Monitor joaosilva');
    });
  });

  describe('aluno em um único grupo', () => {
    beforeEach(async () => services.criarGrupo('ESS-G4', ['Lucas', 'Beatriz']));

    it('não adiciona a outro grupo um aluno que já tem grupo, nem notifica', async () => {
      await expect(services.adicionarAluno('ESS-G4', 'Pedro'))
        .rejects.toThrow(new DomainError('Pedro is already in group ESS-G3'));
      expect(services.grupos.buscar('ESS-G4')!.alunos).toEqual(['Lucas', 'Beatriz']);
      expect(services.grupos.buscar('ESS-G3')!.alunos).toEqual(['Mariana', 'Pedro']);
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('mantém a mensagem própria quando o aluno já está no mesmo grupo', async () => {
      await expect(services.adicionarAluno('ESS-G3', 'Pedro'))
        .rejects.toThrow(new DomainError('The student is already in the group'));
    });

    it('não cria grupo com aluno de outro grupo', async () => {
      expect(() => services.criarGrupo('ESS-G8', ['Ana', 'Mariana']))
        .toThrow(new DomainError('Mariana is already in group ESS-G3'));
      expect(services.grupos.buscar('ESS-G8')).toBeUndefined();
    });

    it('volta a aceitar o aluno em outro grupo quando ele não tem grupo', async () => {
      await services.adicionarAluno('ESS-G4', 'Ana');

      expect(services.grupos.grupoDoAluno('Ana')!.nome).toBe('ESS-G4');
      expect(services.grupos.grupoDoAluno('Carla')).toBeUndefined();
    });
  });
});
