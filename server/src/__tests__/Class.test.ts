import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

/**
 * Testes unitários de Class: prazo acadêmico e limites de encerramento.
 * Apoiam o bloqueio de criação e a interrupção de reenvios após o prazo, conforme o DDD.
 * Datas fixas são exemplos; os testes não cobrem GUI, HTTP, arquivos ou cenários completos.
 */
describe('Prazo acadêmico da turma', () => {
  let turma: Class;
  const prazoAcademico = new Date('2026-08-31T23:59:00-03:00'); // Usa um fuso explícito para manter os testes independentes do computador.

  beforeEach(() => { // Recria a turma antes de cada caso para impedir que alterações de um teste afetem outro.
    turma = new Class('ESS', 2, 2026, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA); // Mantém o construtor existente e isola a turma de cada teste.
  });

  // Verifica a compatibilidade com turmas criadas antes da inclusão do prazo acadêmico.
  // Sem prazo cadastrado, a entidade deve informar a ausência em vez de presumir que o prazo está aberto ou encerrado.
  test('não presume um prazo para uma turma que ainda não o possui', () => {
    expect(turma.getPrazoAcademico()).toBeNull(); // toBeNull confirma que nenhum prazo foi atribuído automaticamente.
    expect(() => turma.prazoEncerrado(prazoAcademico)) // A função adia a execução para que o Jest possa verificar o erro lançado.
      .toThrow('Prazo acadêmico não definido para a turma');
  });

  // Verifica a integridade da entidade: uma tentativa de cadastrar uma data inválida não pode apagar o prazo válido.
  // new Date('data inválida') produz um objeto Date cujo getTime retorna NaN; a validação deve rejeitá-lo antes da alteração.
  test('rejeita um prazo inválido sem alterar o prazo anteriormente definido', () => {
    turma.setPrazoAcademico(prazoAcademico);

    expect(() => turma.setPrazoAcademico(new Date('data inválida'))) // toThrow verifica se a rejeição produz o erro esperado.
      .toThrow('Prazo acadêmico inválido');
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // A rejeição deve preservar o prazo já cadastrado.
  });

  // Verifica o contrato do instante recebido pelo método: uma data inválida deve ser rejeitada.
  // Uma comparação com NaN retornaria false e poderia indicar incorretamente que o prazo ainda está aberto.
  test('rejeita um instante atual inválido sem alterar o prazo', () => {
    turma.setPrazoAcademico(prazoAcademico);

    expect(() => turma.prazoEncerrado(new Date('data inválida')))
      .toThrow('Instante atual inválido');
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // toEqual compara o valor das datas, mesmo sendo objetos diferentes.
  });

  // test.each executa o mesmo teste para três instantes; cada linha abaixo conta como um teste independente.
  // Os limites de um milissegundo distinguem a regra "posterior ao prazo" de "no prazo ou depois".
  // Esses casos verificam a consulta usada pelos dois cenários citados no comentário inicial, sem testar criação ou reenvio.
  test.each([
    { descricao: 'antes do prazo', instante: '2026-08-31T23:58:59.999-03:00', encerrado: false }, // Um milissegundo antes: o prazo ainda está aberto.
    { descricao: 'exatamente no prazo', instante: '2026-08-31T23:59:00-03:00', encerrado: false }, // No limite: o DDD determina que o prazo ainda não encerrou.
    { descricao: 'depois do prazo', instante: '2026-08-31T23:59:00.001-03:00', encerrado: true } // Um milissegundo depois: o encerramento deve ser identificado.
  ])('$descricao: encerrado deve ser $encerrado', ({ instante, encerrado }) => {
    turma.setPrazoAcademico(prazoAcademico);

    expect(turma.prazoEncerrado(new Date(instante))).toBe(encerrado); // Compara o resultado com o booleano esperado para a linha atual.
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // Consultar o encerramento não modifica o prazo da turma.
  });

});
