import { useEffect, useState } from 'react';
import { consultarHistorico, type LinhaHistoricoNotificacao } from '../services/NotificationHistoryService';

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

type EstadoHistorico =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; registros: LinhaHistoricoNotificacao[] };

export default function NotificationHistory() {
  const [estado, setEstado] = useState<EstadoHistorico>({ tipo: 'carregando' });

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
                </tr>
              </thead>
              <tbody>
                {estado.registros.map(({ id, origem, contexto, dataHora, motivo, resultado }) => {
                  const instante = new Date(dataHora);
                  // Cada origem pode gerar seus próprios identificadores.
                  return (
                    <tr key={`${origem}:${id}`}>
                      <td>{contexto}</td>
                      <td>
                        <time dateTime={dataHora}>
                          {`${dataEmBrasilia.format(instante)} às ${horaEmBrasilia.format(instante)}`}
                        </time>
                      </td>
                      <td>{motivo}</td>
                      <td>{resultado}</td>
                    </tr>
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
