import { classifyQuartiles, performanceOf, Quartile } from '../models/Quartile';
import { QuartileNotification } from '../models/QuartileNotification';
import { Enrollment } from '../models/Enrollment';
import { Student } from '../models/Student';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

const performancesOf = (count: number) =>
  new Map(Array.from({ length: count }, (_, i) => [`cpf${i + 1}`, 100 - i] as [string, number]));

describe('classifyQuartiles', () => {
  test('splits 40 students into four groups of 10, the best 25% being Q4', () => {
    const quartiles = classifyQuartiles(performancesOf(40));
    for (let rank = 1; rank <= 40; rank++) {
      const expected: Quartile = rank <= 10 ? 4 : rank <= 20 ? 3 : rank <= 30 ? 2 : 1;
      expect(quartiles.get(`cpf${rank}`)).toBe(expected);
    }
  });

  test('does not classify a class with fewer than 4 students', () => {
    expect(classifyQuartiles(performancesOf(3)).size).toBe(0);
  });

  test('students with the same performance share a quartile', () => {
    const quartiles = classifyQuartiles(new Map([['a', 10], ['b', 7], ['c', 7], ['d', 0]]));
    expect(quartiles.get('a')).toBe(4);
    expect(quartiles.get('b')).toBe(quartiles.get('c'));
    expect(quartiles.get('d')).toBe(1);
  });
});

describe('performanceOf', () => {
  const enrollment = () => new Enrollment(new Student('Ana', '11111111111', 'ana@email.com'));

  test('is null while nothing is graded', () => {
    expect(performanceOf(enrollment(), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA)).toBeNull();
  });

  test('uses the class specification: MA=10, MPA=7, MANA=0 over the sum of goal weights', () => {
    const e = enrollment();
    e.addOrUpdateEvaluation('Requirements', 'MA');
    e.addOrUpdateEvaluation('Design', 'MPA');
    expect(performanceOf(e, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA)).toBeCloseTo(17 / 6);
  });

  test('is null when a graded goal has no weight in the specification', () => {
    const e = enrollment();
    e.addOrUpdateEvaluation('Unknown goal', 'MA');
    expect(performanceOf(e, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA)).toBeNull();
  });
});

describe('QuartileNotification.forQuartileChange', () => {
  const quartiles: Quartile[] = [1, 2, 3, 4];
  const transitions = quartiles.flatMap(from => quartiles.filter(to => to !== from).map(to => [from, to] as const));

  test('covers the 12 possible transitions', () => {
    expect(transitions).toHaveLength(12);
  });

  test.each(transitions)('Q%i -> Q%i has the matching direction, quartiles and message', (from, to) => {
    const n = QuartileNotification.forQuartileChange(1, '11111111111', 'ESS-2026-1', from, to, new Date('2026-11-22T10:00:00Z')).toJSON();
    expect(n.previousQuartile).toBe(from);
    expect(n.newQuartile).toBe(to);
    expect(n.reason).toBe(`Mudança de quartil: Q${from} → Q${to}`);
    expect(n.createdAt).toBe('2026-11-22T10:00:00.000Z');
    expect(n.read).toBe(false);
    if (to > from) {
      expect(n.direction).toBe('improvement');
      const ordinal = { 2: 'segundo', 3: 'terceiro', 4: 'quarto' }[to as 2 | 3 | 4];
      expect(n.message).toBe(`Parabéns! Seu desempenho apresentou evolução e você avançou para o ${ordinal} quartil da turma.`);
    } else {
      expect(n.direction).toBe('decline');
      expect(n.message).toBe('Seu desempenho apresentou uma redução em relação à avaliação anterior. Confira os conteúdos e identifique oportunidades de melhoria.');
    }
  });
});
