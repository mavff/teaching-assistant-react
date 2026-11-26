import { Fragment, useEffect, useState } from 'react';
import {
  consultarDetalhesNotificacao,
  consultarHistorico,
  type DetalhesHistoricoNotificacao,
  type LinhaHistoricoNotificacao
} from '../services/NotificationHistoryService';

// A API devolve instantes em UTC. A tabela usa Brasília em qualquer navegador.
const dataEmBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const horaEmBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function formatarDataHora(dataHora: string): string {
  const instante = new Date(dataHora);
  return `${dataEmBrasilia.format(instante)} às ${horaEmBrasilia.format(instante)}`;
}

type EstadoDetalhes =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; registro: DetalhesHistoricoNotificacao };

function DetalhesNotificacao({ id }: { id: number }) {
  const [estado, setEstado] = useState<EstadoDetalhes>({ tipo: 'carregando' });

  useEffect(() => {
    const consulta = new AbortController();
    consultarDetalhesNotificacao(id, consulta.signal)
      .then(registro => {
        if (!consulta.signal.aborted) setEstado({ tipo: 'pronto', registro });
      })
      .catch(() => {
        if (!consulta.signal.aborted) setEstado({ tipo: 'erro' });
      });

    return () => consulta.abort(); // Recolher a linha cancela a consulta em andamento.
  }, [id]);

  return (
    <section aria-labelledby={`historico-detalhe-titulo-${id}`}>
      <h3 id={`historico-detalhe-titulo-${id}`} data-cy="historico-detalhe-titulo">
        Detalhes da notificação
      </h3>
      {estado.tipo === 'carregando' && <p role="status">Carregando detalhes…</p>}
      {estado.tipo === 'erro' && <p role="alert">Não foi possível carregar os detalhes da notificação</p>}
      {estado.tipo === 'pronto' && (
        <>
          <dl>
            <dt>Destinatário</dt>
            <dd data-cy="historico-detalhe-destinatario">{estado.registro.destinatario}</dd>
            <dt>Turma</dt>
            <dd data-cy="historico-detalhe-turma">{estado.registro.contexto}</dd>
            <dt>Data e hora</dt>
            <dd data-cy="historico-detalhe-data">{formatarDataHora(estado.registro.dataHora)}</dd>
            <dt>Motivo</dt>
            <dd data-cy="historico-detalhe-motivo">{estado.registro.motivo}</dd>
            <dt>Status</dt>
            <dd data-cy="historico-detalhe-status">{estado.registro.resultado}</dd>
            <dt>Prazo registrado</dt>
            <dd data-cy="historico-detalhe-prazo">
              {estado.registro.prazoRegistrado
                ? formatarDataHora(estado.registro.prazoRegistrado)
                : 'Não registrado'}
            </dd>
          </dl>

          <h4>Pendências registradas</h4>
          {estado.registro.pendenciasRegistradas.length === 0 ? (
            <p>Nenhuma pendência registrada</p>
          ) : (
            <ul>
              {estado.registro.pendenciasRegistradas.map(({ nomeAluno, meta }, indice) => (
                <li key={indice} data-cy="historico-detalhe-pendencia">
                  {nomeAluno} — {meta}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

type EstadoHistorico =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; registros: LinhaHistoricoNotificacao[] };

export default function NotificationHistory() {
  const [estado, setEstado] = useState<EstadoHistorico>({ tipo: 'carregando' });
  const [idAberto, setIdAberto] = useState<number | null>(null);

  useEffect(() => {
    const consulta = new AbortController();
    consultarHistorico(consulta.signal)
      .then(registros => {
        if (!consulta.signal.aborted) setEstado({ tipo: 'pronto', registros });
      })
      .catch(() => {
        if (!consulta.signal.aborted) setEstado({ tipo: 'erro' });
      });

    return () => consulta.abort(); // Cancela a busca se o usuário sair da aba.
  }, []);

  return (
    <section id="notification-history" aria-labelledby="notification-history-title">
      <h2 id="notification-history-title">Histórico de notificações</h2>
      {estado.tipo === 'carregando' && <p role="status">Carregando histórico…</p>}
      {estado.tipo === 'erro' && <p role="alert">Não foi possível carregar o histórico</p>}
      {estado.tipo === 'pronto' && (
        estado.registros.length === 0 ? (
          <p>Nenhuma notificação registrada</p>
        ) : (
          <div className="table-container">
            <table aria-labelledby="notification-history-title">
              <thead>
                <tr>
                  <th scope="col">Turma</th>
                  <th scope="col">Data e hora</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {estado.registros.map(({ id, origem, contexto, dataHora, motivo, resultado }) => {
                  const expandido = idAberto === id;
                  const idDetalhes = `historico-detalhes-${id}`;

                  // O mesmo registro agrupa sua linha de resumo e, quando aberta, a linha de detalhes.
                  return (
                    <Fragment key={`${origem}:${id}`}>
                      <tr data-cy={`historico-notificacao-${id}`}>
                        <td data-cy="historico-turma">{contexto}</td>
                        <td data-cy="historico-data">
                          <time dateTime={dataHora}>{formatarDataHora(dataHora)}</time>
                        </td>
                        <td data-cy="historico-motivo">{motivo}</td>
                        <td data-cy="historico-status">{resultado}</td>
                        <td>
                          <button
                            type="button"
                            data-cy="historico-abrir-detalhes"
                            aria-expanded={expandido}
                            aria-controls={expandido ? idDetalhes : undefined}
                            onClick={() => setIdAberto(atual => atual === id ? null : id)}
                          >
                            {expandido ? 'Recolher' : 'Detalhes'}
                          </button>
                        </td>
                      </tr>
                      {expandido && (
                        <tr id={idDetalhes} data-cy={idDetalhes}>
                          <td colSpan={5}>
                            <DetalhesNotificacao id={id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
