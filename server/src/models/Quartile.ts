import { Enrollment } from './Enrollment';
import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';

/**
 * Relative performance group of a student inside a class:
 * 1 = lowest 25%, 2 = 25% to 50%, 3 = 50% to 75%, 4 = highest 25%.
 * It is independent of the MANA/MPA/MA grades.
 */
export type Quartile = 1 | 2 | 3 | 4;

/** Fewer students than this cannot be split into four groups. */
export const MIN_STUDENTS_FOR_QUARTILES = 4;

/**
 * The student's performance: the weighted average of the grades given so far,
 * computed with the class's own specification. Null when there is nothing
 * graded (or the average cannot be computed).
 */
export function performanceOf(enrollment: Enrollment, specification: EspecificacaoDoCalculoDaMedia): number | null {
  const evaluations = enrollment.getEvaluations();
  if (evaluations.length === 0) {
    return null;
  }
  const grades = new Map(evaluations.map(e => [e.getGoal(), e.getGrade()] as const));
  const performance = specification.calc(grades);
  return Number.isFinite(performance) ? performance : null;
}

/**
 * Splits the students of a class into quartiles by their rank, best first.
 * Students with the same performance share the best rank among them, so they
 * always fall in the same quartile. Returns an empty map when fewer than
 * MIN_STUDENTS_FOR_QUARTILES students have a performance.
 *
 * @param performances performance of each student, by CPF
 */
export function classifyQuartiles(performances: Map<string, number>): Map<string, Quartile> {
  const result = new Map<string, Quartile>();
  const total = performances.size;
  if (total < MIN_STUDENTS_FOR_QUARTILES) {
    return result;
  }
  const values = Array.from(performances.values());
  for (const [cpf, performance] of performances) {
    const rank = 1 + values.filter(other => other > performance).length; // 1 = best
    const bandFromTop = Math.ceil((rank * 4) / total); // 1..4, 1 = best
    result.set(cpf, (5 - bandFromTop) as Quartile);
  }
  return result;
}
