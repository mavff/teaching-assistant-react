import request from 'supertest';
import { app, classes, periodosAcademicos } from '../server';
import { Class } from '../models/Class';
import { Lembrete } from '../models/Lembrete';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

/**
 * Testes de integração HTTP: validam cadastro, consulta e edição do prazo usado na configuração de lembretes.
 * Protegem o prazo e as configurações em rejeições; não exercitam a GUI.
 * NODE_ENV=test mantém os dados em memória; a gravação real é verificada separadamente em pasta temporária.
 */
describe('API de períodos acadêmicos', () => {
  const rota = '/api/periodos-academicos/2099/2';
  const prazoOriginal = '2099-08-31T23:59:00.000Z'; // Datas futuras de exemplo para estes testes; não definem o prazo da aplicação.
  const prazoNovo = '2099-08-28T23:59:00.000Z';

  beforeEach(() => {
    periodosAcademicos.clear(); // Cada teste começa sem os períodos criados pelos anteriores.
    classes.getAllClasses().forEach(turma => classes.removeClass(turma.getClassId())); // Isola as configurações consultadas pela rota.
  });

  test('informa a ausência de um período sem cadastrá-lo durante a consulta', async () => { // Consultar não deve presumir prazo nem criar dados.
    const resposta = await request(app).get(rota).expect(404);

    expect(resposta.body).toEqual({ error: 'Período acadêmico não cadastrado' });
    expect(periodosAcademicos.size).toBe(0);
  });

  test('rejeita uma identificação de período inválida na consulta', async () => { // Confere a conversão dos parâmetros HTTP e a resposta à rejeição do domínio.
    const resposta = await request(app).get('/api/periodos-academicos/2099/3').expect(400);

    expect(resposta.body).toEqual({ error: 'Semestre acadêmico inválido' });
    expect(periodosAcademicos.size).toBe(0);
  });

  test('cadastra um prazo antes de existirem turmas e permite consultá-lo em ISO', async () => { // O período não depende do cadastro de uma turma.
    const resposta = await request(app).put(rota)
      .send({ prazoAcademico: '2099-08-31T20:59:00-03:00' }).expect(200); // O fuso explícito representa o mesmo instante de prazoOriginal.

    expect(resposta.body).toEqual({ ano: 2099, semestre: 2, prazoAcademico: prazoOriginal });
    expect(classes.getCount()).toBe(0);
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body).toEqual(resposta.body);
  });

  test('edita o prazo preservando o objeto compartilhado e outro período', async () => { // Uma edição não deve substituir referências existentes ou alterar outro semestre.
    const anterior = new PeriodoAcademico(2099, 2, new Date(prazoOriginal));
    const outro = new PeriodoAcademico(2099, 1, new Date('2099-06-30T23:59:00.000Z'));
    periodosAcademicos.set(anterior.getIdentificador(), anterior);
    periodosAcademicos.set(outro.getIdentificador(), outro);

    await request(app).put(rota).send({ prazoAcademico: prazoNovo }).expect(200);

    expect(periodosAcademicos.get('2099.2')).toBe(anterior); // A identidade do objeto é mantida para quem já possui sua referência.
    expect(anterior.getPrazoAcademico()).toEqual(new Date(prazoNovo));
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body.prazoAcademico).toBe(prazoNovo);
    expect(outro.getPrazoAcademico()).toEqual(new Date('2099-06-30T23:59:00.000Z'));
  });

  test.each([
    { descricao: 'não informado', corpo: {}, erro: 'Prazo acadêmico inválido' },
    { descricao: 'texto inválido', corpo: { prazoAcademico: 'data inválida' }, erro: 'Prazo acadêmico inválido' },
    { descricao: 'anterior ao presente', corpo: { prazoAcademico: '2000-01-01T00:00:00.000Z' }, erro: 'Prazo acadêmico não pode ser anterior à data atual' }
  ])('rejeita prazo $descricao e preserva o valor anteriormente cadastrado', async ({ corpo, erro }) => { // Confere que rejeições HTTP não publicam a proposta inválida.
    const anterior = new PeriodoAcademico(2099, 2, new Date(prazoOriginal));
    periodosAcademicos.set(anterior.getIdentificador(), anterior);

    const resposta = await request(app).put(rota).send(corpo).expect(400);

    expect(resposta.body).toEqual({ error: erro });
    expect(periodosAcademicos.get('2099.2')).toBe(anterior);
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body.prazoAcademico).toBe(prazoOriginal);
  });

  test('não cadastra o período quando o primeiro prazo é rejeitado', async () => { // Protege também o caso sem prazo anterior para preservar.
    await request(app).put(rota).send({ prazoAcademico: '2000-01-01T00:00:00.000Z' }).expect(400);

    await request(app).get(rota).expect(404);
    expect(periodosAcademicos.size).toBe(0);
  });

  test.each([
    { descricao: 'agendamento original', data: '2099-08-29', reenvio: null },
    { descricao: 'reenvio programado', data: '2099-08-25', reenvio: new Date('2099-08-29T14:00:00.000Z') }
  ])('rejeita conflito com $descricao de outra turma do mesmo período', async ({ data, reenvio }) => { // A rota deve fornecer ao domínio as configurações de todas as turmas afetadas.
    const anterior = new PeriodoAcademico(2099, 2, new Date(prazoOriginal));
    periodosAcademicos.set(anterior.getIdentificador(), anterior);
    const primeira = new Class('ESS', 2, 2099, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const segunda = new Class('Introdução a Programação', 2, 2099, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    primeira.obterConfiguracaoLembretes().add(new Lembrete({ id: 'primeiro', data: '2099-08-25', horario: '09:00' }));
    segunda.obterConfiguracaoLembretes().add(new Lembrete({ id: 'segundo', data, horario: '14:00', estado: 'Agendado', proximoReenvioEm: reenvio }));
    classes.addClass(primeira);
    classes.addClass(segunda);
    const configuracoesAnteriores = [primeira.obterConfiguracaoLembretes().listar(), segunda.obterConfiguracaoLembretes().listar()];

    const resposta = await request(app).put(rota).send({ prazoAcademico: prazoNovo }).expect(400);

    expect(resposta.body).toEqual({ error: 'Prazo acadêmico incompatível com lembretes pendentes' });
    expect(anterior.getPrazoAcademico()).toEqual(new Date(prazoOriginal));
    expect([primeira.obterConfiguracaoLembretes().listar(), segunda.obterConfiguracaoLembretes().listar()])
      .toEqual(configuracoesAnteriores); // A rejeição não cancela, remove nem reagenda os lembretes envolvidos.
  });

  test('não inclui turmas de outro ano ou semestre na validação do prazo', async () => { // Lembretes de outros períodos não podem bloquear o período editado.
    const outroSemestre = new Class('ESS', 1, 2099, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const outroAno = new Class('ESS', 2, 2098, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    for (const turma of [outroSemestre, outroAno]) {
      turma.obterConfiguracaoLembretes().add(new Lembrete({ id: turma.getClassId(), data: '2099-08-29', horario: '14:00' }));
      classes.addClass(turma);
    }
    const configuracoesAnteriores = [outroSemestre.obterConfiguracaoLembretes().listar(), outroAno.obterConfiguracaoLembretes().listar()];

    await request(app).put(rota).send({ prazoAcademico: prazoNovo }).expect(200);

    expect(periodosAcademicos.get('2099.2')?.getPrazoAcademico()).toEqual(new Date(prazoNovo));
    expect([outroSemestre.obterConfiguracaoLembretes().listar(), outroAno.obterConfiguracaoLembretes().listar()])
      .toEqual(configuracoesAnteriores);
  });
});
