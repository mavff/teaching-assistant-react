import React, { useCallback, useEffect, useState } from 'react';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../services/GrupoService';
import './Grupos.css';

const ROTULOS_TIPO: Record<string, string> = {
  alocacao: 'Alocação',
  aviso: 'Aviso',
  saida: 'Saída',
  entrada: 'Entrada',
  remocao: 'Remoção',
  acumulo: 'Acúmulo'
};

const Grupos: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [monitores, setMonitores] = useState<SituacaoMonitor[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [escolhidos, setEscolhidos] = useState<Record<string, string>>({});
  const [novosAlunos, setNovosAlunos] = useState<Record<string, string>>({});
  const [destinos, setDestinos] = useState<Record<string, string>>({});
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
    carregar().catch(() => setErro('Falha ao carregar os grupos'));
  }, [carregar]);

  const executar = async (acao: () => Promise<unknown>, mensagemSucesso: string) => {
    setErro('');
    setSucesso('');
    try {
      await acao();
      setSucesso(mensagemSucesso);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  return (
    <div className="grupos" data-cy="grupos-pagina">
      <div className="gp-titulo">
        <h2>Grupos</h2>
        <p>Aloque monitores e acompanhe as notificações enviadas quando um grupo muda.</p>
      </div>

      {erro && <div className="gp-mensagem gp-mensagem--erro" data-cy="mensagem-erro">{erro}</div>}
      {sucesso && <div className="gp-mensagem gp-mensagem--sucesso" data-cy="mensagem-sucesso">{sucesso}</div>}

      <section className="gp-secao">
        <h3>Grupos <span className="gp-contador">{grupos.length}</span></h3>
        {grupos.length === 0 && <p className="gp-vazio">Nenhum grupo cadastrado.</p>}
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
                  >{grupo.monitor ?? 'Sem monitor'}</span>
                </div>
              </header>

              <div className="gp-card-corpo">
                <div>
                  <div className="gp-rotulo">Alunos</div>
                  {grupo.alunos.length === 0
                    ? <p className="gp-vazio">Nenhum aluno no grupo.</p>
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
                        value={escolhidos[grupo.nome] ?? ''}
                        onChange={e => setEscolhidos({ ...escolhidos, [grupo.nome]: e.target.value })}
                      >
                        <option value="">Selecione um monitor</option>
                        {monitores.map(m => <option key={m.login} value={m.login}>{m.login}</option>)}
                      </select>
                      <button
                        className="gp-btn gp-btn--primario"
                        data-cy="alocar-monitor-btn"
                        onClick={() => executar(
                          () => grupoService.alocarMonitor(grupo.nome, escolhidos[grupo.nome] || undefined),
                          'Monitor alocado com sucesso')}
                      >
                        Alocar
                      </button>
                      <button
                        className="gp-btn gp-btn--secundario"
                        data-cy="alocacao-automatica-btn"
                        onClick={() => executar(
                          () => grupoService.alocarAutomaticamente(grupo.nome),
                          'Monitor alocado automaticamente')}
                      >
                        Alocação automática
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="gp-rotulo">Realocar ou remover</div>
                    <div className="gp-linha">
                      <input
                        data-cy="destino-input"
                        placeholder="Grupo de destino"
                        value={destinos[grupo.nome] ?? ''}
                        onChange={e => setDestinos({ ...destinos, [grupo.nome]: e.target.value })}
                      />
                      <button
                        className="gp-btn gp-btn--secundario"
                        data-cy="realocar-monitor-btn"
                        onClick={() => executar(
                          () => grupoService.realocarMonitor(grupo.nome, grupo.monitor ?? '', destinos[grupo.nome] ?? ''),
                          'Monitor realocado com sucesso')}
                      >
                        Realocar
                      </button>
                      <button
                        className="gp-btn gp-btn--perigo"
                        data-cy="remover-monitor-btn"
                        onClick={() => executar(
                          () => grupoService.removerMonitor(grupo.nome),
                          'Monitor removido do grupo')}
                      >
                        Remover monitor
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="gp-rotulo">Novo aluno</div>
                    <div className="gp-linha">
                      <input
                        data-cy="aluno-input"
                        placeholder="Nome do aluno"
                        value={novosAlunos[grupo.nome] ?? ''}
                        onChange={e => setNovosAlunos({ ...novosAlunos, [grupo.nome]: e.target.value })}
                      />
                      <button
                        className="gp-btn gp-btn--primario"
                        data-cy="adicionar-aluno-btn"
                        onClick={() => executar(
                          () => grupoService.adicionarAluno(grupo.nome, novosAlunos[grupo.nome] ?? ''),
                          'Aluno adicionado com sucesso')}
                      >
                        Adicionar aluno
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
        <h3>Monitores da disciplina <span className="gp-contador">{monitores.length}</span></h3>
        {monitores.length === 0 && <p className="gp-vazio">Nenhum monitor cadastrado.</p>}
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
              <span className="gp-monitor-login" data-cy="monitor-login">{m.login}</span>
              <span className={`gp-status gp-status--${m.situacao}`} data-cy="monitor-situacao">
                {m.situacao === 'livre' ? 'Livre' : 'Alocado'}
              </span>
              {m.grupos.length > 0 && (
                <span className="gp-monitor-grupos">
                  ao grupo <strong data-cy="monitor-grupos">{m.grupos.join(', ')}</strong>
                </span>
              )}
              {m.alocacaoAutomatica && <span className="gp-tag-auto" data-cy="monitor-automatica">alocação automática</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="gp-secao">
        <h3>Notificações enviadas <span className="gp-contador">{notificacoes.length}</span></h3>
        {notificacoes.length === 0 && <p className="gp-vazio">Nenhuma notificação enviada.</p>}
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
                {n.resultado === 'Falha' && <span className="gp-falha" title={n.descricaoFalha}>Falha</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Grupos;
