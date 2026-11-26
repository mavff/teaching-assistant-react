import { DomainError } from './DomainError';

/**
 * Grupo de alunos acompanhado por, no máximo, um monitor.
 * Alunos e monitor são identificados pelo nome (login, no caso do monitor).
 */
export class Grupo {
  private readonly _alunos: string[];
  private _monitor: string | null = null;
  private _alocacaoAutomatica = false;

  constructor(readonly nome: string, alunos: string[] = []) {
    if (!nome || !nome.trim()) {
      throw new DomainError('Group name is required');
    }
    this._alunos = [...alunos];
  }

  get alunos(): readonly string[] {
    return this._alunos;
  }

  get monitor(): string | null {
    return this._monitor;
  }

  /** Indica se o monitor atual foi escolhido pela alocação automática. */
  get alocacaoAutomatica(): boolean {
    return this._alocacaoAutomatica;
  }

  /** Alunos e, se houver, o monitor: quem deve ser avisado quando o grupo muda. */
  participantes(): string[] {
    return this._monitor ? [...this._alunos, this._monitor] : [...this._alunos];
  }

  adicionarAluno(aluno: string): void {
    if (!aluno || !aluno.trim()) {
      throw new DomainError('Student name is required');
    }
    if (this._alunos.includes(aluno)) {
      throw new DomainError('The student is already in the group');
    }
    this._alunos.push(aluno);
  }

  alocarMonitor(monitor: string, automatica = false): void {
    this._monitor = monitor;
    this._alocacaoAutomatica = automatica;
  }

  removerMonitor(): void {
    if (!this._monitor) {
      throw new DomainError('The group has no monitor');
    }
    this._monitor = null;
    this._alocacaoAutomatica = false;
  }

  toJSON() {
    return {
      nome: this.nome,
      alunos: [...this._alunos],
      monitor: this._monitor,
      alocacaoAutomatica: this._alocacaoAutomatica
    };
  }
}
