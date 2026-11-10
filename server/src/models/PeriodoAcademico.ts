import { ConfiguracaoLembretes } from './ConfiguracaoLembretes';

export class PeriodoAcademico {
  private readonly ano: number;
  private readonly semestre: number;
  private prazoAcademico: Date | null;

  constructor(ano: number, semestre: number, prazoAcademico: Date | null = null) {
    if (!Number.isSafeInteger(ano) || ano < 1) throw new Error('Ano acadêmico inválido');
    if (semestre !== 1 && semestre !== 2) throw new Error('Semestre acadêmico inválido');
    if (prazoAcademico !== null && !Number.isFinite(prazoAcademico.getTime())) throw new Error('Prazo acadêmico inválido');
    this.ano = ano;
    this.semestre = semestre;
    this.prazoAcademico = prazoAcademico === null ? null : new Date(prazoAcademico.getTime()); // A reconstrução de um registro histórico pode conter um prazo passado.
  }

  getAno(): number { return this.ano; }
  getSemestre(): number { return this.semestre; }
  getIdentificador(): string { return `${this.ano}.${this.semestre}`; } // A identidade é o ano e semestre, não a data do prazo.

  getPrazoAcademico(): Date | null {
    return this.prazoAcademico === null ? null : new Date(this.prazoAcademico.getTime()); // A cópia impede que um consumidor altere a fonte compartilhada sem validação.
  }

  prazoEncerrado(instanteAtual: Date): boolean {
    if (this.prazoAcademico === null) throw new Error('Prazo acadêmico não definido para o período');
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    return instanteAtual.getTime() > this.prazoAcademico.getTime(); // Exatamente no prazo ainda não está encerrado, conforme o DDD.
  }

  definirPrazoAcademico(novoPrazo: Date, instanteAtual: Date, configuracoesDoPeriodo: readonly ConfiguracaoLembretes[]): void {
    if (!Number.isFinite(novoPrazo.getTime())) throw new Error('Prazo acadêmico inválido');
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    if (novoPrazo.getTime() < instanteAtual.getTime()) {
      throw new Error('Prazo acadêmico não pode ser anterior à data atual');
    }
    if (configuracoesDoPeriodo.some(configuracao => configuracao.possuiAgendamentosPendentesApos(novoPrazo))) {
      throw new Error('Prazo acadêmico incompatível com lembretes pendentes');
    }

    this.prazoAcademico = new Date(novoPrazo.getTime()); // Só altera o prazo após validar todas as configurações recebidas; nenhuma delas é modificada.
  }
}
