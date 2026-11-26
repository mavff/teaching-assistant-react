import React from 'react';
import { Notificacao } from '../../services/GrupoService';

const ROTULOS_TIPO: Record<string, string> = {
  alocacao: 'Allocation',
  aviso: 'Notice',
  saida: 'Departure',
  entrada: 'Arrival',
  remocao: 'Removal',
  acumulo: 'Multiple groups'
};

/** Lista das notificações enviadas quando os grupos mudam. */
const ListaNotificacoes: React.FC<{ notificacoes: Notificacao[] }> = ({ notificacoes }) => (
  <section className="gp-secao">
    <h3>Sent notifications <span className="gp-contador">{notificacoes.length}</span></h3>
    {notificacoes.length === 0 && <p className="gp-vazio">No notifications sent.</p>}
    <ul className="gp-lista" data-cy="notificacoes-lista">
      {notificacoes.map(n => (
        <li
          key={n.id}
          className="gp-notificacao"
          data-cy="notificacao-item"
          data-grupo={n.grupo}
          data-tipo={n.tipo}
        >
          <span className="gp-tipo" data-cy="notificacao-tipo">{ROTULOS_TIPO[n.tipo] ?? n.tipo}</span>
          <span className="gp-notificacao-texto">
            <span className="gp-destinatario" data-cy="notificacao-destinatario">{n.destinatario}</span>
            <span className="gp-mensagem-texto">{n.mensagem}</span>
          </span>
          <span>
            <span className="gp-grupo-tag">{n.grupo}</span>
            {n.resultado === 'Failed' && <span className="gp-falha" title={n.descricaoFalha}>Failed</span>}
          </span>
        </li>
      ))}
    </ul>
  </section>
);

export default ListaNotificacoes;
