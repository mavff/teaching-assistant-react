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

  beforeEach(() => {
    services = new Services();
    services.cadastrarMonitor('joaosilva');
    services.criarGrupo('ESS-G3', ['Mariana', 'Pedro']);
  });

  it('notifica alunos e monitor ao alocar o monitor', () => {
    const grupo = services.alocarMonitor('ESS-G3', 'joaosilva');

    expect(grupo.monitor).toBe('joaosilva');
    expect(destinatarios(services)).toEqual(['Mariana', 'Pedro', 'joaosilva']);
  });

  it('notifica todos os participantes ao adicionar um aluno a grupo com monitor', () => {
    services.alocarMonitor('ESS-G3', 'joaosilva');
    services.historico.limpar();

    services.adicionarAluno('ESS-G3', 'Carla');

    expect(destinatarios(services)).toEqual(['Carla', 'Mariana', 'Pedro', 'joaosilva']);
    expect(services.grupos.buscar('ESS-G3')!.alunos).toEqual(['Mariana', 'Pedro', 'Carla']);
  });

  it('não notifica nem altera o grupo quando não há monitor disponível', () => {
    services.monitores.limpar();

    expect(() => services.alocarMonitor('ESS-G3')).toThrow(new DomainError('Não há monitor disponível'));
    expect(services.consultarHistorico()).toEqual([]);
    expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
  });

  it('não notifica ao adicionar aluno que já pertence ao grupo', () => {
    expect(() => services.adicionarAluno('ESS-G3', 'Pedro')).toThrow(new DomainError('O aluno já pertence ao grupo'));
    expect(services.consultarHistorico()).toEqual([]);
    expect(services.grupos.buscar('ESS-G3')!.alunos).toEqual(['Mariana', 'Pedro']);
  });

  it('notifica apenas o monitor quando o grupo não tem alunos', () => {
    services.criarGrupo('ESS-G6');
    services.alocarMonitor('ESS-G6', 'joaosilva');

    expect(services.consultarHistorico('ESS-G6').map(n => n.nomeDestinatario)).toEqual(['joaosilva']);
  });

  it('registra Falha, com a descrição, quando o EmailSender não aceita o envio', () => {
    const recusa: EmailSender = {
      send: (): ResultadoEnvio => ({ aceito: false, descricaoFalha: 'Tempo limite excedido no envio' })
    };
    const comFalha = new Services(new Grupos(), new Monitores(), new HistoricoNotificacoes(), recusa);
    comFalha.cadastrarMonitor('joaosilva');
    comFalha.criarGrupo('ESS-G3', ['Mariana']);

    comFalha.alocarMonitor('ESS-G3', 'joaosilva');

    const [primeira] = comFalha.consultarHistorico();
    expect(primeira.resultado).toBe('Falha');
    expect(primeira.descricaoFalha).toBe('Tempo limite excedido no envio');
  });

  it('rejeita grupo inexistente', () => {
    expect(() => services.adicionarAluno('ESS-X', 'Ana')).toThrow(new DomainError('Grupo não existe'));
  });

  describe('realocação, remoção, alocação automática e acúmulo', () => {
    const porTipo = (grupo: string, motivo: string) =>
      services.consultarHistorico(grupo).filter(n => n.motivo === motivo).map(n => n.nomeDestinatario).sort();

    beforeEach(() => {
      services.alocarMonitor('ESS-G3', 'joaosilva');
      services.criarGrupo('ESS-G4', ['Lucas', 'Beatriz']);
      services.historico.limpar();
    });

    it('realoca o monitor, avisa os alunos dos dois grupos e atualiza os grupos', () => {
      services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G4');

      expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
      expect(services.grupos.buscar('ESS-G4')!.monitor).toBe('joaosilva');
      expect(porTipo('ESS-G3', MOTIVO_SAIDA)).toEqual(['Mariana', 'Pedro']);
      expect(porTipo('ESS-G4', MOTIVO_ENTRADA)).toEqual(['Beatriz', 'Lucas']);
    });

    it('não notifica nem altera nada quando o grupo de destino não existe', () => {
      expect(() => services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G9'))
        .toThrow(new DomainError('Grupo de destino não existe'));
      expect(services.consultarHistorico()).toEqual([]);
      expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
    });

    it('rejeita realocar monitor que não está no grupo de origem ou destino que já tem monitor', () => {
      services.cadastrarMonitor('carloseduardo');
      expect(() => services.realocarMonitor('ESS-G3', 'carloseduardo', 'ESS-G4'))
        .toThrow(new DomainError('O monitor não está alocado ao grupo de origem'));
      services.alocarMonitor('ESS-G4', 'carloseduardo');
      services.historico.limpar();
      expect(() => services.realocarMonitor('ESS-G3', 'joaosilva', 'ESS-G4'))
        .toThrow(new DomainError('O grupo de destino já possui monitor'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('remove o monitor sem realocar e avisa apenas os alunos', () => {
      services.removerMonitor('ESS-G3');

      expect(services.grupos.buscar('ESS-G3')!.monitor).toBeNull();
      expect(porTipo('ESS-G3', MOTIVO_REMOCAO)).toEqual(['Mariana', 'Pedro']);
      expect(services.consultarHistorico()).toHaveLength(2);
    });

    it('não notifica ao remover monitor de grupo que não tem monitor', () => {
      expect(() => services.removerMonitor('ESS-G4')).toThrow(new DomainError('O grupo não possui monitor'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('aloca automaticamente o único monitor livre e o mostra na lista de monitores', () => {
      services.monitores.limpar();
      services.cadastrarMonitor('mariaeduarda');

      services.alocarAutomaticamente('ESS-G4');

      expect(services.grupos.buscar('ESS-G4')!.monitor).toBe('mariaeduarda');
      expect(porTipo('ESS-G4', MOTIVO_ALOCACAO)).toEqual(['Beatriz', 'Lucas', 'mariaeduarda']);
      expect(services.situacaoDosMonitores()).toEqual([
        { login: 'mariaeduarda', situacao: 'alocado', grupos: ['ESS-G4'], alocacaoAutomatica: true }
      ]);
    });

    it('alocação automática sem monitor livre é rejeitada sem notificar', () => {
      expect(() => services.alocarAutomaticamente('ESS-G4')).toThrow(new DomainError('Não há monitor disponível'));
      expect(services.consultarHistorico()).toEqual([]);
    });

    it('avisa os alunos e o monitor quando ele acumula grupos, sem alterar o grupo anterior', () => {
      services.criarGrupo('ESS-G7', ['Ana', 'Bruno']);

      services.alocarMonitor('ESS-G7', 'joaosilva');

      expect(porTipo('ESS-G7', MOTIVO_ALOCACAO)).toEqual(['Ana', 'Bruno']);
      expect(porTipo('ESS-G7', MOTIVO_ACUMULO)).toEqual(['joaosilva']);
      expect(services.grupos.buscar('ESS-G3')!.monitor).toBe('joaosilva');
      expect(services.consultarHistorico('ESS-G3')).toEqual([]);
    });
  });
});
