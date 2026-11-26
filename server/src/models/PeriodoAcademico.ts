type ConsultaDeAgendamentos = {
  possuiAgendamentosPendentesApos(novoPrazo: Date): boolean;
};

export class PeriodoAcademico {
  private readonly ano: number;
  private readonly semestre: number;
  private prazoAcademico: Date | null;

  /** Valida o ano, o semestre e o prazo opcional, que pode vir de um registro histórico. */
  constructor(ano: number, semestre: number, prazoAcademico: Date | null = null) {
    if (!Number.isSafeInteger(ano) || ano < 1) throw new Error('Ano acadêmico inválido');
    if (semestre !== 1 && semestre !== 2) throw new Error('Semestre acadêmico inválido');
    if (prazoAcademico !== null && !Number.isFinite(prazoAcademico.getTime())) throw new Error('Prazo acadêmico inválido');
    this.ano = ano;
    this.semestre = semestre;
    this.prazoAcademico = prazoAcademico === null ? null : new Date(prazoAcademico.getTime());
  }

  getAno(): number { return this.ano; }
  getSemestre(): number { return this.semestre; }
  getIdentificador(): string { return `${this.ano}.${this.semestre}`; } // A identidade é o ano e semestre, não a data do prazo.

  getPrazoAcademico(): Date | null {
    return this.prazoAcademico === null ? null : new Date(this.prazoAcademico.getTime()); // A cópia impede que um consumidor altere a fonte compartilhada sem validação.
  }

  /** Exige prazo definido e considera encerrado somente um instante posterior ao prazo. */
  prazoEncerrado(instanteAtual: Date): boolean {
    if (this.prazoAcademico === null) throw new Error('Prazo acadêmico não definido para o período');
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    return instanteAtual.getTime() > this.prazoAcademico.getTime();
  }

  /** Aceita um novo prazo a partir do instante atual e verifica se há lembretes pendentes após ele. */
  definirPrazoAcademico(
    novoPrazo: Date,
    instanteAtual: Date,
    consultasDoPeriodo: readonly ConsultaDeAgendamentos[]
  ): void {
    if (!Number.isFinite(novoPrazo.getTime())) throw new Error('Prazo acadêmico inválido');
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    if (novoPrazo.getTime() < instanteAtual.getTime()) {
      throw new Error('Prazo acadêmico não pode ser anterior à data atual');
    }
    if (consultasDoPeriodo.some(consulta => consulta.possuiAgendamentosPendentesApos(novoPrazo))) {
      throw new Error('Prazo acadêmico incompatível com lembretes pendentes');
    }

    this.prazoAcademico = new Date(novoPrazo.getTime()); // Só altera o prazo após consultar todos os agendamentos do período.
  }
}
