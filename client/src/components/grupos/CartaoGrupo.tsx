import React, { useState } from 'react';
import { grupoService, Grupo, SituacaoMonitor } from '../../services/GrupoService';

/** Executa uma ação da página, mostra o aviso e recarrega os dados; resolve true quando deu certo. */
export type Executar = (acao: () => Promise<unknown>, mensagemSucesso: string) => Promise<boolean>;

interface CartaoGrupoProps {
  grupo: Grupo;
  monitores: SituacaoMonitor[];
  /** Alunos cadastrados que ainda não pertencem a nenhum grupo. */
  alunosSemGrupo: string[];
  executar: Executar;
}

/** Cartão de um grupo: alunos, monitor e as ações de alocar, realocar, remover e adicionar aluno. */
const CartaoGrupo: React.FC<CartaoGrupoProps> = ({ grupo, monitores, alunosSemGrupo, executar }) => {
  const [monitorEscolhido, setMonitorEscolhido] = useState('');
  const [alunoEscolhido, setAlunoEscolhido] = useState('');
  const [destino, setDestino] = useState('');

  const adicionarAluno = async () => {
    if (await executar(() => grupoService.adicionarAluno(grupo.nome, alunoEscolhido), 'Student added successfully')) {
      setAlunoEscolhido('');
    }
  };

  return (
    <article className="gp-card" data-cy={`grupo-${grupo.nome}`}>
      <header className="gp-card-topo">
        <h3 data-cy="grupo-nome">{grupo.nome}</h3>
        <div className="gp-monitor">
          Monitor
          <span
            className={`gp-pill ${grupo.monitor ? 'gp-pill--ok' : 'gp-pill--vazio'}`}
            data-cy="grupo-monitor"
            data-monitor={grupo.monitor ?? ''}
          >{grupo.monitor ?? 'No monitor'}</span>
        </div>
      </header>

      <div className="gp-card-corpo">
        <div>
          <div className="gp-rotulo">Students</div>
          {grupo.alunos.length === 0
            ? <p className="gp-vazio">No students in this group.</p>
            : (
              <ul className="gp-alunos">
                {grupo.alunos.map(aluno => (
                  <li key={aluno} className="gp-aluno" data-cy="grupo-aluno">{aluno}</li>
                ))}
              </ul>
            )}
        </div>

        <div className="gp-acoes">
          <div>
            <div className="gp-rotulo">Monitor</div>
            <div className="gp-linha">
              <select
                data-cy="monitor-select"
                aria-label="Group monitor"
                value={monitorEscolhido}
                onChange={e => setMonitorEscolhido(e.target.value)}
              >
                <option value="">Select a monitor</option>
                {monitores.map(m => <option key={m.login} value={m.login}>{m.nome} ({m.login})</option>)}
              </select>
              <button
                className="gp-btn gp-btn--primario"
                data-cy="alocar-monitor-btn"
                onClick={() => executar(
                  () => grupoService.alocarMonitor(grupo.nome, monitorEscolhido || undefined),
                  'Monitor allocated successfully')}
              >
                Allocate
              </button>
              <button
                className="gp-btn gp-btn--secundario"
                data-cy="alocacao-automatica-btn"
                onClick={() => executar(
                  () => grupoService.alocarAutomaticamente(grupo.nome),
                  'Monitor allocated automatically')}
              >
                Automatic allocation
              </button>
            </div>
          </div>

          <div>
            <div className="gp-rotulo">Reallocate or remove</div>
            <div className="gp-linha">
              <input
                data-cy="destino-input"
                placeholder="Destination group"
                value={destino}
                onChange={e => setDestino(e.target.value)}
              />
              <button
                className="gp-btn gp-btn--secundario"
                data-cy="realocar-monitor-btn"
                onClick={() => executar(
                  () => grupoService.realocarMonitor(grupo.nome, grupo.monitor ?? '', destino),
                  'Monitor reallocated successfully')}
              >
                Reallocate
              </button>
              <button
                className="gp-btn gp-btn--perigo"
                data-cy="remover-monitor-btn"
                onClick={() => executar(
                  () => grupoService.removerMonitor(grupo.nome),
                  'Monitor removed from the group')}
              >
                Remove monitor
              </button>
            </div>
          </div>

          <div>
            <div className="gp-rotulo">New student</div>
            <div className="gp-linha">
              <select
                data-cy="aluno-select"
                aria-label="Student to add"
                value={alunoEscolhido}
                onChange={e => setAlunoEscolhido(e.target.value)}
              >
                <option value="">Select a student</option>
                {alunosSemGrupo.map(aluno => (
                  <option key={aluno} value={aluno}>{aluno}</option>
                ))}
              </select>
              <button
                className="gp-btn gp-btn--primario"
                data-cy="adicionar-aluno-btn"
                onClick={adicionarAluno}
              >
                Add student
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CartaoGrupo;
