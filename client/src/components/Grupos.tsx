import React, { useCallback, useEffect, useState } from 'react';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../services/GrupoService';
import { studentService } from '../services/StudentService';
import './Grupos.css';

const ROTULOS_TIPO: Record<string, string> = {
  alocacao: 'Allocation',
  aviso: 'Notice',
  saida: 'Departure',
  entrada: 'Arrival',
  remocao: 'Removal',
  acumulo: 'Multiple groups'
};

const MONITOR_VAZIO = { login: '', nome: '', email: '' };

/** Tempo que o aviso de sucesso fica na tela antes de sumir sozinho. */
export const DURACAO_AVISO_SUCESSO_MS = 4000;

const Grupos: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [monitores, setMonitores] = useState<SituacaoMonitor[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [alunosCadastrados, setAlunosCadastrados] = useState<string[]>([]);
  const [escolhidos, setEscolhidos] = useState<Record<string, string>>({});
  const [alunosEscolhidos, setAlunosEscolhidos] = useState<Record<string, string>>({});
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [novoGrupo, setNovoGrupo] = useState<{ nome: string; alunos: string[] }>({ nome: '', alunos: [] });
  const [novoMonitor, setNovoMonitor] = useState(MONITOR_VAZIO);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregar = useCallback(async () => {
    const [g, m, n] = await Promise.all([
      grupoService.listarGrupos(),
      grupoService.situacaoDosMonitores(),
      grupoService.listarNotificacoes(),
    ]);
    setGrupos(g);
    setMonitores(m);
    setNotificacoes(n);
  }, []);

  useEffect(() => {
    carregar().catch(() => setErro('Failed to load groups'));
  }, [carregar]);

  // O aviso de sucesso some sozinho; o de erro fica até ser fechado ou até a próxima ação.
  useEffect(() => {
    if (!sucesso) {
      return undefined;
    }
    const temporizador = setTimeout(() => setSucesso(''), DURACAO_AVISO_SUCESSO_MS);
    return () => clearTimeout(temporizador);
  }, [sucesso]);

  // Alunos cadastrados na aba Students: são as opções ao criar grupo e ao adicionar aluno.
  useEffect(() => {
    studentService.getAllStudents()
      .then(alunos => setAlunosCadastrados(alunos.map(a => a.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => setAlunosCadastrados([]));
  }, []);

  /** Runs the action, shows the outcome and reloads the page; resolves to true on success. */
  const executar = async (acao: () => Promise<unknown>, mensagemSucesso: string) => {
    setErro('');
    setSucesso('');
    try {
      await acao();
      setSucesso(mensagemSucesso);
      await carregar();
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    }
  };

  const criarGrupo = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (await executar(() => grupoService.criarGrupo(novoGrupo.nome.trim(), novoGrupo.alunos), 'Group created successfully')) {
      setNovoGrupo({ nome: '', alunos: [] });
    }
  };

  const cadastrarMonitor = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const { login, nome, email } = novoMonitor;
    if (await executar(() => grupoService.cadastrarMonitor(login.trim(), nome, email), 'Monitor registered successfully')) {
      setNovoMonitor(MONITOR_VAZIO);
    }
  };

  // Um aluno pertence a um único grupo: só os alunos sem grupo aparecem nas listas.
  const alunosEmGrupos = new Set(grupos.flatMap(g => g.alunos));
  const alunosSemGrupo = alunosCadastrados.filter(aluno => !alunosEmGrupos.has(aluno));

  const adicionarAluno = async (nomeGrupo: string) => {
    if (await executar(
      () => grupoService.adicionarAluno(nomeGrupo, alunosEscolhidos[nomeGrupo] ?? ''),
      'Student added successfully'
    )) {
      setAlunosEscolhidos({ ...alunosEscolhidos, [nomeGrupo]: '' });
    }
  };

  return (
    <div className="grupos" data-cy="grupos-pagina">
      <div className="gp-titulo">
        <h2>Groups</h2>
        <p>Allocate monitors and follow the notifications sent when a group changes.</p>
      </div>

      {/* Avisos fixos no canto da janela: visíveis em qualquer ponto da rolagem. */}
      <div className="gp-avisos">
        {erro && (
          <div className="gp-aviso gp-aviso--erro" role="alert">
            <span className="gp-aviso-texto" data-cy="mensagem-erro">{erro}</span>
            <button
              type="button"
              className="gp-aviso-fechar"
              aria-label="Close message"
              onClick={() => setErro('')}
            >×</button>
          </div>
        )}
        {sucesso && (
          <div className="gp-aviso gp-aviso--sucesso" role="status">
            <span className="gp-aviso-texto" data-cy="mensagem-sucesso">{sucesso}</span>
          </div>
        )}
      </div>

      <section className="gp-secao">
        <h3>Registration</h3>
        <div className="gp-cadastro">
          <form className="gp-form" onSubmit={criarGrupo} aria-label="New group">
            <div className="gp-rotulo">New group</div>
            <div className="gp-linha">
              <input
                data-cy="novo-grupo-nome"
                aria-label="Group name"
                placeholder="Group name"
                value={novoGrupo.nome}
                onChange={e => setNovoGrupo({ ...novoGrupo, nome: e.target.value })}
              />
              <select
                data-cy="novo-grupo-aluno-select"
                aria-label="Student for the new group"
                value=""
                onChange={e => e.target.value
                  && setNovoGrupo({ ...novoGrupo, alunos: [...novoGrupo.alunos, e.target.value] })}
              >
                <option value="">Add student (optional)</option>
                {alunosSemGrupo.filter(a => !novoGrupo.alunos.includes(a)).map(aluno => (
                  <option key={aluno} value={aluno}>{aluno}</option>
                ))}
              </select>
              <button type="submit" className="gp-btn gp-btn--primario" data-cy="criar-grupo-btn">
                Create group
              </button>
            </div>
            {novoGrupo.alunos.length > 0 && (
              <ul className="gp-escolhidos" aria-label="Students of the new group">
                {novoGrupo.alunos.map(aluno => (
                  <li key={aluno} className="gp-escolhido" data-cy="novo-grupo-aluno">
                    {aluno}
                    <button
                      type="button"
                      className="gp-remover-escolhido"
                      aria-label={`Remove ${aluno} from the new group`}
                      onClick={() => setNovoGrupo({ ...novoGrupo, alunos: novoGrupo.alunos.filter(a => a !== aluno) })}
                    >×</button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          <form className="gp-form" onSubmit={cadastrarMonitor} aria-label="New monitor">
            <div className="gp-rotulo">New monitor</div>
            <div className="gp-linha">
              <input
                data-cy="novo-monitor-login"
                aria-label="Monitor login"
                placeholder="Login"
                value={novoMonitor.login}
                onChange={e => setNovoMonitor({ ...novoMonitor, login: e.target.value })}
              />
              <input
                data-cy="novo-monitor-nome"
                aria-label="Monitor name"
                placeholder="Name"
                value={novoMonitor.nome}
                onChange={e => setNovoMonitor({ ...novoMonitor, nome: e.target.value })}
              />
              <input
                data-cy="novo-monitor-email"
                aria-label="Monitor email"
                placeholder="Email"
                value={novoMonitor.email}
                onChange={e => setNovoMonitor({ ...novoMonitor, email: e.target.value })}
              />
              <button type="submit" className="gp-btn gp-btn--primario" data-cy="cadastrar-monitor-btn">
                Register monitor
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="gp-secao">
        <h3>Groups <span className="gp-contador">{grupos.length}</span></h3>
        {grupos.length === 0 && <p className="gp-vazio">No groups yet.</p>}
        <div className="gp-grade">
          {grupos.map(grupo => (
            <article key={grupo.nome} className="gp-card" data-cy={`grupo-${grupo.nome}`}>
              <header className="gp-card-topo">
                <h3 data-cy="grupo-nome">{grupo.nome}</h3>
                <div className="gp-monitor">
                  Monitor
                  <span
                    className={`gp-pill ${grupo.monitor ? 'gp-pill--ok' : 'gp-pill--vazio'}`}
                    data-cy="grupo-monitor"
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
                        value={escolhidos[grupo.nome] ?? ''}
                        onChange={e => setEscolhidos({ ...escolhidos, [grupo.nome]: e.target.value })}
                      >
                        <option value="">Select a monitor</option>
                        {monitores.map(m => <option key={m.login} value={m.login}>{m.nome} ({m.login})</option>)}
                      </select>
                      <button
                        className="gp-btn gp-btn--primario"
                        data-cy="alocar-monitor-btn"
                        onClick={() => executar(
                          () => grupoService.alocarMonitor(grupo.nome, escolhidos[grupo.nome] || undefined),
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
                        value={destinos[grupo.nome] ?? ''}
                        onChange={e => setDestinos({ ...destinos, [grupo.nome]: e.target.value })}
                      />
                      <button
                        className="gp-btn gp-btn--secundario"
                        data-cy="realocar-monitor-btn"
                        onClick={() => executar(
                          () => grupoService.realocarMonitor(grupo.nome, grupo.monitor ?? '', destinos[grupo.nome] ?? ''),
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
                        value={alunosEscolhidos[grupo.nome] ?? ''}
                        onChange={e => setAlunosEscolhidos({ ...alunosEscolhidos, [grupo.nome]: e.target.value })}
                      >
                        <option value="">Select a student</option>
                        {alunosSemGrupo.map(aluno => (
                          <option key={aluno} value={aluno}>{aluno}</option>
                        ))}
                      </select>
                      <button
                        className="gp-btn gp-btn--primario"
                        data-cy="adicionar-aluno-btn"
                        onClick={() => adicionarAluno(grupo.nome)}
                      >
                        Add student
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

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
                  in group <strong data-cy="monitor-grupos">{m.grupos.join(', ')}</strong>
                </span>
              )}
              {m.alocacaoAutomatica && <span className="gp-tag-auto" data-cy="monitor-automatica">automatic allocation</span>}
            </li>
          ))}
        </ul>
      </section>

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
    </div>
  );
};

export default Grupos;
