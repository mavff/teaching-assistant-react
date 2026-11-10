import { ConfiguracaoLembretes } from '../models/ConfiguracaoLembretes';
import { Lembrete } from '../models/Lembrete';
import { PeriodoAcademico } from '../models/PeriodoAcademico';

/**
 * Testes unitários do período: validam prazo e rejeitam conflitos com suas configurações.
 * Implementam as decisões do DDD; o compartilhamento entre turmas e a persistência serão integrados depois.
 */
describe('PeriodoAcademico', () => {
  const instanteAtual = new Date('2026-08-20T08:00:00.000Z');
  const prazo = new Date('2026-08-31T23:59:00.000Z');

  test('identifica o período por ano e semestre sem inventar prazo', () => { // Permite cadastrar o período antes de existirem turmas ou prazo definido.
    const periodo = new PeriodoAcademico(2026, 2);

    expect(periodo.getIdentificador()).toBe('2026.2');
    expect(periodo.getPrazoAcademico()).toBeNull();
    expect(() => periodo.prazoEncerrado(instanteAtual)).toThrow('Prazo acadêmico não definido para o período');
  });

  test.each([
    { ano: 0, semestre: 2, erro: 'Ano acadêmico inválido' },
    { ano: 2026, semestre: 3, erro: 'Semestre acadêmico inválido' }
  ])('rejeita a identidade inválida $ano.$semestre', ({ ano, semestre, erro }) => { // Ano e semestre formam a identidade compartilhada, por isso devem ser válidos.
    expect(() => new PeriodoAcademico(ano, semestre)).toThrow(erro);
  });

  test.each([
    { novoPrazo: new Date('inválida'), agora: instanteAtual, erro: 'Prazo acadêmico inválido' },
    { novoPrazo: prazo, agora: new Date('inválida'), erro: 'Instante atual inválido' },
    { novoPrazo: new Date('2026-08-20T07:59:59.999Z'), agora: instanteAtual, erro: 'Prazo acadêmico não pode ser anterior à data atual' }
  ])('rejeita a atualização: $erro', ({ novoPrazo, agora, erro }) => { // Toda rejeição deve conservar o prazo anterior.
    const periodo = new PeriodoAcademico(2026, 2, prazo);

    expect(() => periodo.definirPrazoAcademico(novoPrazo, agora, [])).toThrow(erro);
    expect(periodo.getPrazoAcademico()).toEqual(prazo);
  });

  test('permite definir o prazo exatamente no instante atual', () => { // Decisão aprovada: rejeitar somente prazos estritamente anteriores ao presente.
    const periodo = new PeriodoAcademico(2026, 2);

    periodo.definirPrazoAcademico(instanteAtual, instanteAtual, []);

    expect(periodo.getPrazoAcademico()).toEqual(instanteAtual);
    expect(periodo.prazoEncerrado(instanteAtual)).toBe(false);
  });

  test.each([
    { instante: '2026-08-31T23:58:59.999Z', encerrado: false },
    { instante: '2026-08-31T23:59:00.000Z', encerrado: false },
    { instante: '2026-08-31T23:59:00.001Z', encerrado: true }
  ])('consulta o encerramento em $instante: $encerrado', ({ instante, encerrado }) => { // Um milissegundo distingue o limite permitido do prazo encerrado.
    const periodo = new PeriodoAcademico(2026, 2, prazo);

    expect(periodo.prazoEncerrado(new Date(instante))).toBe(encerrado);
  });

  test('reconstrói prazo histórico sem aplicar a validação de um novo cadastro', () => { // Reiniciar a aplicação não deve impedir recuperar um período encerrado.
    const prazoHistorico = new Date('2025-06-30T23:59:00.000Z');
    const periodo = new PeriodoAcademico(2025, 1, prazoHistorico);

    expect(periodo.getPrazoAcademico()).toEqual(prazoHistorico);
    expect(periodo.prazoEncerrado(instanteAtual)).toBe(true);
  });

  test.each([
    { descricao: 'agendamento original', data: '2026-08-29', reenvio: null },
    { descricao: 'reenvio programado', data: '2026-08-25', reenvio: new Date('2026-08-29T14:00:00.000Z') }
  ])('rejeita prazo incompatível com $descricao de outra configuração do período', ({ data, reenvio }) => { // Um conflito na segunda configuração também deve rejeitar toda a alteração.
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    const primeira = new ConfiguracaoLembretes([new Lembrete({ id: 'primeiro', data: '2026-08-25', horario: '09:00' })]);
    const segunda = new ConfiguracaoLembretes([new Lembrete({ id: 'segundo', data, horario: '14:00', estado: 'Agendado', proximoReenvioEm: reenvio })]);
    const anteriores = [primeira.listar(), segunda.listar()];

    expect(() => periodo.definirPrazoAcademico(new Date('2026-08-28T23:59:00.000Z'), instanteAtual, [primeira, segunda]))
      .toThrow('Prazo acadêmico incompatível com lembretes pendentes');
    expect(periodo.getPrazoAcademico()).toEqual(prazo);
    expect([primeira.listar(), segunda.listar()]).toEqual(anteriores); // Não cancela ou reagenda lembretes para acomodar o novo prazo.
  });

  test('aceita prazo igual ao último agendamento e preserva as configurações e outro período', () => { // Igualdade é válida; o prazo de um semestre não altera outro semestre.
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    const outroPeriodo = new PeriodoAcademico(2026, 1, new Date('2026-06-30T23:59:00.000Z'));
    const configuracao = new ConfiguracaoLembretes([new Lembrete({ id: 'ultimo', data: '2026-08-29', horario: '14:00' })]);
    const anterior = configuracao.listar();
    const novoPrazo = new Date('2026-08-29T14:00:00.000Z');

    periodo.definirPrazoAcademico(novoPrazo, instanteAtual, [configuracao]);

    expect(periodo.getPrazoAcademico()).toEqual(novoPrazo);
    expect(configuracao.listar()).toEqual(anterior);
    expect(outroPeriodo.getPrazoAcademico()).toEqual(new Date('2026-06-30T23:59:00.000Z'));
  });

  test('impede alterações do prazo por referências externas de Date', () => { // A única alteração válida deve passar por definirPrazoAcademico e suas verificações.
    const entrada = new Date(prazo.getTime());
    const periodo = new PeriodoAcademico(2026, 2, entrada);
    entrada.setUTCDate(1); // Tenta modificar o valor fornecido ao construtor.
    periodo.getPrazoAcademico()?.setUTCDate(2); // Tenta modificar o valor devolvido pelo getter.
    expect(periodo.getPrazoAcademico()).toEqual(prazo);

    const novoPrazo = new Date('2026-09-01T23:59:00.000Z');
    periodo.definirPrazoAcademico(novoPrazo, instanteAtual, []);
    novoPrazo.setUTCDate(3); // A mesma proteção deve valer para o valor recebido na atualização.
    expect(periodo.getPrazoAcademico()).toEqual(new Date('2026-09-01T23:59:00.000Z'));
  });
});
