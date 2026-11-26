import React from 'react';
import { SituacaoMonitor } from '../../services/GrupoService';

/** Lista dos monitores da disciplina, com a situação e os grupos de cada um. */
const ListaMonitores: React.FC<{ monitores: SituacaoMonitor[] }> = ({ monitores }) => (
  <section className="gp-secao">
    <h3>Course monitors <span className="gp-contador">{monitores.length}</span></h3>
    {monitores.length === 0 && <p className="gp-vazio">No monitors registered.</p>}
    <ul className="gp-lista" data-cy="monitores-lista">
      {monitores.map(m => (
        <li
          key={m.login}
          className="gp-monitor-item"
          data-cy="monitor-item"
          data-login={m.login}
          data-situacao={m.situacao}
          data-automatica={String(m.alocacaoAutomatica)}
        >
          <span className="gp-monitor-nome">
            <strong data-cy="monitor-nome">{m.nome}</strong>
            <span className="gp-monitor-detalhe">
              <span data-cy="monitor-login">{m.login}</span> · <span data-cy="monitor-email">{m.email}</span>
            </span>
          </span>
          <span className={`gp-status gp-status--${m.situacao}`} data-cy="monitor-situacao">
            {m.situacao === 'livre' ? 'Available' : 'Allocated'}
          </span>
          {m.grupos.length > 0 && (
            <span className="gp-monitor-grupos">
              {m.grupos.length > 1 ? 'in groups' : 'in group'} <strong data-cy="monitor-grupos">{m.grupos.join(', ')}</strong>
            </span>
          )}
          {m.alocacaoAutomatica && <span className="gp-tag-auto" data-cy="monitor-automatica">automatic allocation</span>}
        </li>
      ))}
    </ul>
  </section>
);

export default ListaMonitores;
