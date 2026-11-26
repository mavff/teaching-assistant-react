import request from 'supertest';
import { app, classes, historicoLembretes, periodosAcademicos } from '../server';
import { Class } from '../models/Class';
import { EmailSenderSmtp } from '../models/EmailSender';
import { Lembrete } from '../models/Lembrete';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

/**
 * Integração HTTP: cobre o primeiro cenário de configuração e as rejeições que devem preservar os dados.
 * Usa armazenamento em memória. A gravação em disco é verificada em NotificacaoPersistencia.test.ts.
 */
describe('API de configuração de lembretes', () => {
  const rota = '/api/classes/ESS-2099-2/lembretes';
  const proposta = {
    quantidade: 2,
    lembretes: [
      { id: 'primeiro', data: '2099-08-25', horario: '12:00' },
      { id: 'segundo', data: '2099-08-29', horario: '17:00' }
    ]
  };

  /** Recria duas turmas do mesmo período e cadastra o destinatário exigido pela rota. */
  beforeEach(() => {
    classes.definirEmailDasTurmas('contato@example.com'); // Prepara uma aplicação com o pré-requisito de cadastro atendido.
    classes.getAllClasses().forEach(turma => classes.removeClass(turma.getClassId()));
    periodosAcademicos.clear();
    const periodo = new PeriodoAcademico(2099, 2, new Date('2099-09-01T02:59:00.000Z'));
    periodosAcademicos.set(periodo.getIdentificador(), periodo);
    classes.addClass(new Class('ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
    classes.addClass(new Class('IP', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
  });

  test('salva dois lembretes e consulta as mesmas identidades, datas e prazo', async () => { // Caminho válido do primeiro cenário.
    const salva = await request(app).put(rota).send(proposta).expect(200);
    expect(salva.body).toEqual({
      turmaId: 'ESS-2099-2',
      prazoAcademico: '2099-09-01T02:59:00.000Z',
      lembretes: proposta.lembretes.map(lembrete => ({
        ...lembrete, estado: 'Não enviado', motivo: null, proximoReenvioEm: null
      }))
    });
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body).toEqual(salva.body);
    const outra = await request(app).get('/api/classes/IP-2099-2/lembretes').expect(200);
    expect(outra.body.lembretes).toEqual([]); // O prazo é compartilhado; a configuração de lembretes é exclusiva da turma.
  });

  test('rejeita data após o prazo sem modificar a configuração anterior', async () => { // Protege a configuração já confirmada.
    const anterior = await request(app).put(rota).send(proposta).expect(200);
    const rejeitada = await request(app).put(rota).send({
      quantidade: 1, lembretes: [{ id: 'primeiro', data: '2099-09-02', horario: '12:00' }]
    }).expect(400);
    expect(rejeitada.body.error).toBe('Data posterior ao prazo acadêmico');
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body).toEqual(anterior.body);
  });

  test('rejeita a criação após o prazo e preserva o lembrete enviado', async () => {
    jest.useFakeTimers({
      now: new Date('2099-09-01T08:00:00-03:00'),
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout']
    }); // Given: o relógio já passou do prazo da turma de teste.

    const enviarEmail = jest.spyOn(EmailSenderSmtp.prototype, 'send')
      .mockResolvedValue({ aceito: true }); // Registra qualquer chamada ao transporte, sem enviar um e-mail real.

    try {
      const turma = classes.findClassById('ESS-2099-2');
      if (!turma) throw new Error('Turma de teste não encontrada');

      classes.definirEmailDasTurmas('paulo.borba@example.com');
      turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test')); // Given: há notas pendentes.

      const agendamentoEnviado = proposta.lembretes[0];
      const enviado = new Lembrete({ ...agendamentoEnviado, estado: 'Enviado' });
      turma.obterConfiguracaoLembretes().add(enviado); // Given: a turma tem um único lembrete, já enviado.

      const anterior = await request(app).get(rota).expect(200);
      const historicoAnterior = historicoLembretes.toJSON(); // Guarda o histórico antes da solicitação.

      const rejeitada = await request(app).put(rota).send({
        quantidade: 2,
        lembretes: [
          agendamentoEnviado,
          { id: 'novo-apos-prazo', data: '2099-09-01', horario: '12:00' }
        ]
      }); // When: solicita um novo lembrete para 09h de Brasília.

      expect(rejeitada.status).toBe(400);
      expect(rejeitada.body.error).toBe('Prazo acadêmico encerrado'); // Then: confirma o motivo da rejeição.

      const consulta = await request(app).get(rota).expect(200);
      expect(consulta.body).toEqual(anterior.body);
      expect(consulta.body.lembretes).toEqual([enviado.toJSON()]); // Then: só o lembrete anterior continua na turma.
      expect(enviarEmail).not.toHaveBeenCalled(); // Then: a solicitação não acionou o transporte.
      expect(historicoLembretes.toJSON()).toEqual(historicoAnterior); // Then: nenhuma tentativa foi acrescentada.
    } finally {
      enviarEmail.mockRestore();
      jest.useRealTimers();
    }
  });

  test('rejeita quantidade incompatível sem criar lembretes', async () => { // Mantém a mensagem prevista no cenário de preenchimento incompleto.
    const rejeitada = await request(app).put(rota).send({ ...proposta, quantidade: 3 }).expect(400);
    expect(rejeitada.body.error).toBe('Selecione exatamente 3 datas e horários');
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body.lembretes).toEqual([]);
  });

  test('não permite configurar lembretes sem prazo acadêmico', async () => { // Impede agendamento sem o limite oficial.
    await request(app).post('/api/classes').send({ topic: 'SemPrazo', year: 2099, semester: 1 }).expect(201);
    const rejeitada = await request(app).put('/api/classes/SemPrazo-2099-1/lembretes').send(proposta).expect(400);
    expect(rejeitada.body.error).toBe('Prazo acadêmico não definido para o período');
  });

  test('os lembretes salvos passam a proteger a edição do prazo compartilhado', async () => { // Verifica a integração com o cadastro de períodos existente.
    await request(app).put(rota).send(proposta).expect(200);
    const rejeitada = await request(app).put('/api/periodos-academicos/2099/2')
      .send({ prazoAcademico: '2099-08-26T23:59:00.000Z' }).expect(400);
    expect(rejeitada.body.error).toBe('Prazo acadêmico incompatível com lembretes pendentes');
    const consulta = await request(app).get(rota).expect(200);
    expect(consulta.body.prazoAcademico).toBe('2099-09-01T02:59:00.000Z');
  });

  test('consulta e salvamento de uma turma inexistente retornam 404', async () => { // Não cria uma turma como efeito do salvamento.
    await request(app).get('/api/classes/inexistente/lembretes').expect(404);
    await request(app).put('/api/classes/inexistente/lembretes').send(proposta).expect(404);
  });
});
