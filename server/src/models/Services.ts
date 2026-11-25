import { DomainError } from './DomainError';
import { EmailSender, EmailSenderSimulado, EmailSenderSmtp } from './EmailSender';
import { EmailSenderGrupos } from './EmailSenderGrupos';
import { GradeNotification } from './GradeNotification';
import { Grupo } from './Grupo';
import { Grupos } from './Grupos';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Monitor, Monitores } from './Monitores';
import { Notificacao } from './Notificacao';
import { NotificacaoService } from './NotificacaoService';

export const MOTIVO_ALOCACAO = 'Alocação de monitor';
export const MOTIVO_AVISO = 'Aviso de alteração do grupo';
export const MOTIVO_SAIDA = 'Saída de monitor do grupo';
export const MOTIVO_ENTRADA = 'Entrada de monitor no grupo';
export const MOTIVO_REMOCAO = 'Remoção de monitor do grupo';
export const MOTIVO_ACUMULO = 'Acúmulo de grupos do monitor';

/** Situação de um monitor na lista de monitores da disciplina. */
export interface SituacaoMonitor {
  login: string;
  nome: string;
  email: string;
  situacao: 'alocado' | 'livre';
  grupos: string[];
  alocacaoAutomatica: boolean;
}

/**
 * Serviços do servidor para grupos e monitores: coordena as coleções e solicita
 * ao NotificacaoService as notificações das mudanças bem-sucedidas.
 * Uma operação rejeitada não altera o grupo nem envia notificação.
 */
export class Services {
  readonly notificacaoService: NotificacaoService;
  readonly gradeNotificationService: GradeNotification;
  readonly gradeNotificationSender: EmailSender | Pick<EmailSenderSmtp, 'send'>;
  private readonly remetenteGrupos: EmailSender | Pick<EmailSenderSmtp, 'send'>;

  constructor(
    readonly grupos: Grupos = new Grupos(),
    readonly monitores: Monitores = new Monitores(),
    readonly historico: HistoricoNotificacoes = new HistoricoNotificacoes(),
    // Nos testes automáticos o envio de grupos é sempre simulado; fora deles,
    // EmailSenderGrupos só envia de verdade com NOTIFICACOES_GRUPO_EMAIL=smtp.
    emailSender: EmailSender | Pick<EmailSenderSmtp, 'send'> =
      process.env.NODE_ENV === 'test' ? new EmailSenderSimulado() : new EmailSenderGrupos(),
    gradeNotificationSender: EmailSender | Pick<EmailSenderSmtp, 'send'> =
      process.env.NODE_ENV === 'test' ? emailSender : new EmailSenderSmtp(),
    /** E-mail de um aluno pelo nome, vindo do cadastro de alunos (aba Students). */
    private readonly emailDoAluno: (nome: string) => string | undefined = () => undefined
  ) {
    this.remetenteGrupos = emailSender;
    this.notificacaoService = new NotificacaoService(historico, emailSender);
    this.gradeNotificationSender = gradeNotificationSender;
    this.gradeNotificationService = new GradeNotification(gradeNotificationSender);
  }

  /** Cria o grupo; cada aluno informado não pode pertencer a outro grupo. */
  criarGrupo(nome: string, alunos: string[] = []): Grupo {
    alunos.forEach(aluno => this.exigirAlunoSemGrupo(aluno, nome));
    return this.grupos.adicionar(new Grupo(nome, alunos));
  }

  cadastrarMonitor(login: string, nome: string, email: string): Monitor {
    return this.monitores.cadastrar(login, nome, email);
  }

  /** Monitores que ainda não estão alocados a nenhum grupo. */
  monitoresDisponiveis(): string[] {
    const alocados = this.grupos.monitoresAlocados();
    return this.monitores.listar().filter(m => !alocados.has(m));
  }

  /** Lista de monitores da disciplina, com os grupos pelos quais cada um responde. */
  situacaoDosMonitores(): SituacaoMonitor[] {
    return this.monitores.listar().map(login => {
      const grupos = this.grupos.gruposDoMonitor(login);
      const { nome, email } = this.monitores.buscar(login)!;
      return {
        login,
        nome,
        email,
        situacao: grupos.length ? 'alocado' : 'livre',
        grupos: grupos.map(g => g.nome),
        alocacaoAutomatica: grupos.some(g => g.alocacaoAutomatica)
      };
    });
  }

  /**
   * Aloca o monitor informado ao grupo, ou o primeiro monitor livre quando nenhum é
   * informado. Um monitor já alocado a outro grupo pode acumular o novo grupo; nesse
   * caso ele recebe uma notificação própria informando o acúmulo. Um grupo que já tem
   * monitor não recebe outro: para trocar, o monitor atual é removido ou realocado antes.
   */
  alocarMonitor(nomeGrupo: string, monitor?: string): Promise<Grupo> {
    return this.alocar(nomeGrupo, monitor, false);
  }

  /** Alocação automática: escolhe um monitor livre para o grupo. */
  alocarAutomaticamente(nomeGrupo: string): Promise<Grupo> {
    return this.alocar(nomeGrupo, undefined, true);
  }

  private async alocar(nomeGrupo: string, monitor: string | undefined, automatica: boolean): Promise<Grupo> {
    const grupo = this.obterGrupo(nomeGrupo);
    if (grupo.monitor) {
      throw new DomainError('The group already has a monitor');
    }
    const escolhido = monitor || this.monitoresDisponiveis()[0];
    if (!escolhido) {
      throw new DomainError('No monitor available');
    }
    if (!this.monitores.existe(escolhido)) {
      throw new DomainError('Monitor does not exist');
    }
    const outrosGrupos = this.grupos.gruposDoMonitor(escolhido).filter(g => g.nome !== nomeGrupo);
    grupo.alocarMonitor(escolhido, automatica);
    const conteudo = `O monitor ${escolhido} foi alocado ao grupo ${nomeGrupo}`;
    if (outrosGrupos.length === 0) {
      await this.notificar(nomeGrupo, MOTIVO_ALOCACAO, grupo.participantes(), conteudo);
    } else {
      const todos = [...outrosGrupos.map(g => g.nome), nomeGrupo].join(', ');
      await this.notificar(nomeGrupo, MOTIVO_ALOCACAO, [...grupo.alunos], conteudo);
      await this.notificar(nomeGrupo, MOTIVO_ACUMULO, [escolhido],
        `Você agora é responsável pelos grupos ${todos}`);
    }
    return grupo;
  }

  /** Remove o monitor do grupo sem realocá-lo; avisa os alunos do grupo. */
  async removerMonitor(nomeGrupo: string): Promise<Grupo> {
    const grupo = this.obterGrupo(nomeGrupo);
    const monitor = grupo.monitor;
    grupo.removerMonitor();
    await this.notificar(nomeGrupo, MOTIVO_REMOCAO, [...grupo.alunos],
      `O monitor ${monitor} foi removido do grupo ${nomeGrupo}`);
    return grupo;
  }

  /** Move o monitor de um grupo para outro; avisa os alunos dos dois grupos. */
  async realocarMonitor(nomeOrigem: string, monitor: string, nomeDestino: string): Promise<Grupo> {
    const origem = this.obterGrupo(nomeOrigem);
    const destino = this.grupos.buscar(nomeDestino);
    if (!destino) {
      throw new DomainError('Destination group does not exist');
    }
    if (origem.monitor !== monitor) {
      throw new DomainError('The monitor is not allocated to the source group');
    }
    if (destino.monitor) {
      throw new DomainError('The destination group already has a monitor');
    }
    origem.removerMonitor();
    destino.alocarMonitor(monitor);
    await this.notificar(nomeOrigem, MOTIVO_SAIDA, [...origem.alunos],
      `O monitor ${monitor} deixou o grupo ${nomeOrigem}`);
    await this.notificar(nomeDestino, MOTIVO_ENTRADA, [...destino.alunos],
      `O monitor ${monitor} passou a acompanhar o grupo ${nomeDestino}`);
    return destino;
  }

  async adicionarAluno(nomeGrupo: string, aluno: string): Promise<Grupo> {
    const grupo = this.obterGrupo(nomeGrupo);
    this.exigirAlunoSemGrupo(aluno, nomeGrupo);
    grupo.adicionarAluno(aluno);
    await this.notificar(nomeGrupo, MOTIVO_AVISO, grupo.participantes(),
      `${aluno} foi adicionado ao grupo ${nomeGrupo}`);
    return grupo;
  }

  /**
   * Garante que nenhuma notificação de grupo saia por e-mail real, mesmo com
   * NOTIFICACOES_GRUPO_EMAIL=smtp. Os testes de aceitação chamam ao zerar os dados,
   * porque usam endereços inventados.
   */
  forcarEnvioSimulado(): void {
    if (this.remetenteGrupos instanceof EmailSenderGrupos) {
      this.remetenteGrupos.forcarSimulado();
    }
  }

  consultarHistorico(grupo?: string): Notificacao[] {
    return grupo ? this.historico.listarDoGrupo(grupo) : this.historico.listar();
  }

  /**
   * Notifica os destinatários de uma mudança no grupo. O e-mail vai para o endereço
   * cadastrado: o do monitor pelo login, o do aluno pelo cadastro de alunos. Sem
   * endereço conhecido, o nome é repassado e o envio real o recusa como Falha.
   */
  private notificar(grupo: string, motivo: string, destinatarios: string[], conteudo: string) {
    return this.notificacaoService.notificarGrupo(grupo, motivo, destinatarios, conteudo, destinatario =>
      this.monitores.buscar(destinatario)?.email || this.emailDoAluno(destinatario) || destinatario);
  }

  /** Um aluno pertence a um único grupo; o próprio grupo trata a repetição dentro dele. */
  private exigirAlunoSemGrupo(aluno: string, nomeGrupo: string): void {
    const atual = this.grupos.grupoDoAluno(aluno);
    if (atual && atual.nome !== nomeGrupo) {
      throw new DomainError(`${aluno} is already in group ${atual.nome}`);
    }
  }

  private obterGrupo(nome: string): Grupo {
    const grupo = this.grupos.buscar(nome);
    if (!grupo) {
      throw new DomainError('Group does not exist');
    }
    return grupo;
  }
}
