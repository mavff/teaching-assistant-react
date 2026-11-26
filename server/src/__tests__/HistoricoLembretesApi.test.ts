import request from 'supertest';
import { app, historicoLembretes, services } from '../server';
import { Notificacao } from '../models/Notificacao';

describe('API do histórico de notificações', () => {
  const rota = '/api/notificacoes/historico';

  afterEach(() => {
    historicoLembretes.limpar();
    services.historico.limpar();
  });

  test('lista todos os registros do agendador em ordem de data e id', async () => {
    const registros = [
      { id: 1, contexto: '2026.2 de ESS', dataHora: '2026-08-25T12:00:00.000Z',
        motivo: 'Notas pendentes', resultado: 'Falha' },
      { id: 2, contexto: '2026.2 de Introdução a Programação', dataHora: '2026-08-27T12:00:00.000Z',
        motivo: 'Notas pendentes', resultado: 'Falha' },
      { id: 3, contexto: '2026.2 de ESS', dataHora: '2026-08-27T12:00:00.000Z',
        motivo: 'Nenhuma nota pendente', resultado: 'Ignorado' },
      { id: 4, contexto: '2026.2 de ESS', dataHora: '2026-08-28T12:00:00.000Z',
        motivo: 'Notas pendentes', resultado: 'Enviado' }
    ] as const;

    for (const registro of registros) {
      historicoLembretes.registrar(new Notificacao(
        registro.id,
        'professor@example.test',
        {
          lembreteId: `lembrete-${registro.id}`,
          turmaRegistrada: registro.contexto,
          prazoRegistrado: new Date('2026-09-01T02:59:00Z'),
          pendenciasRegistradas: []
        },
        new Date(registro.dataHora),
        registro.resultado,
        registro.motivo
      )); // Given: inclui horários iguais e um Enviado mais recente.
    }

    const resposta = await request(app).get(rota).expect(200); // When: consulta a listagem.
    expect(resposta.body).toEqual([
      { ...registros[3], origem: 'lembrete' }, // Enviado é o registro mais recente.
      { ...registros[2], origem: 'lembrete' },
      { ...registros[1], origem: 'lembrete' },
      { ...registros[0], origem: 'lembrete' }
    ]); // Then: confere os campos, os status exibidos, a ordem e o desempate.
    expect(historicoLembretes.listar().map(({ id }) => id)).toEqual([1, 2, 3, 4]); // A leitura preserva a fonte.
  });

  test('devolve os dados históricos da notificação selecionada pelo ID', async () => {
    const pendenciasRegistradas = [
      { nomeAluno: 'João da Silva', meta: 'Prova 2' },
      { nomeAluno: 'Maria Souza', meta: 'Projeto 1' }
    ];

    historicoLembretes.registrar(new Notificacao(
      7,
      'professor@example.test',
      {
        lembreteId: 'lembrete-7',
        turmaRegistrada: '2026.2 de ESS',
        prazoRegistrado: new Date('2026-09-01T02:59:00.000Z'),
        pendenciasRegistradas
      },
      new Date('2026-08-25T12:00:00.000Z'),
      'Enviado',
      'Notas pendentes'
    )); // Given: o registro contém o contexto original.

    const resposta = await request(app).get(`${rota}/7`).expect(200); // When: consulta pelo ID.

    expect(resposta.body).toEqual({
      id: 7,
      origem: 'lembrete',
      contexto: '2026.2 de ESS',
      dataHora: '2026-08-25T12:00:00.000Z',
      motivo: 'Notas pendentes',
      resultado: 'Enviado',
      destinatario: 'professor@example.test',
      prazoRegistrado: '2026-09-01T02:59:00.000Z',
      pendenciasRegistradas
    }); // Then: devolve os valores guardados.
  });

  test('devolve a descrição original da falha da tentativa selecionada', async () => {
    const descricao = 'Tempo limite excedido no envio';
    historicoLembretes.registrar(new Notificacao(
      8,
      'professor@example.test',
      {
        lembreteId: 'lembrete-8',
        turmaRegistrada: '2026.2 de ESS',
        prazoRegistrado: new Date('2026-09-01T02:59:00.000Z'),
        pendenciasRegistradas: []
      },
      new Date('2026-08-23T12:00:00.000Z'),
      'Falha',
      'Notas pendentes',
      descricao
    )); // Given: a tentativa tem motivo e descrição da falha distintos.

    const resposta = await request(app).get(`${rota}/8`).expect(200); // When: consulta pelo ID.

    expect(resposta.body).toMatchObject({
      id: 8,
      resultado: 'Falha',
      motivo: 'Notas pendentes',
      descricaoFalha: descricao
    }); // Then: devolve os dois campos com os valores registrados.
  });

  test.each(['99', 'abc', '1e0', '0'])('retorna 404 para o ID %s sem registro válido', async id => {
    const resposta = await request(app).get(`${rota}/${id}`).expect(404);
    expect(resposta.body).toEqual({ error: 'Notificação não encontrada' });
  });

  test('devolve lista vazia quando só existe uma falha no fluxo de grupos', async () => {
    services.historico.registrar(new Notificacao(
      1, 'monitor@example.test', 'Grupo A', new Date('2026-08-28T12:00:00Z'),
      'Falha', 'Alocação de monitor'
    )); // Given: o único registro é de outra origem.

    const resposta = await request(app).get(rota).expect(200);
    expect(resposta.body).toEqual([]); // Then: nesta entrega, a aba lista lembretes.
    await request(app).get(`${rota}/1`).expect(404);
  });
});
