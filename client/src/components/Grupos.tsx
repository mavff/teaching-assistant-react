import React, { useCallback, useEffect, useState } from 'react';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../services/GrupoService';

const Grupos: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [monitores, setMonitores] = useState<SituacaoMonitor[]>([]);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [escolhidos, setEscolhidos] = useState<Record<string, string>>({});
  const [novosAlunos, setNovosAlunos] = useState<Record<string, string>>({});
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
      <h2>Grupos</h2>
      {erro && <div className="error-message" data-cy="mensagem-erro">{erro}</div>}
      {sucesso && <div className="success-message" data-cy="mensagem-sucesso">{sucesso}</div>}

      {grupos.map(grupo => (
        <div key={grupo.nome} className="grupo-card" data-cy={`grupo-${grupo.nome}`}>
          <h3 data-cy="grupo-nome">{grupo.nome}</h3>
          <p>Monitor: <span data-cy="grupo-monitor">{grupo.monitor ?? 'Sem monitor'}</span></p>
          <ul>
            {grupo.alunos.map(aluno => <li key={aluno} data-cy="grupo-aluno">{aluno}</li>)}
          </ul>

          <select
            data-cy="monitor-select"
            value={escolhidos[grupo.nome] ?? ''}
            onChange={e => setEscolhidos({ ...escolhidos, [grupo.nome]: e.target.value })}
          >
            <option value="">Selecione um monitor</option>
            {monitores.map(m => <option key={m.login} value={m.login}>{m.login}</option>)}
          </select>
          <button
            data-cy="alocar-monitor-btn"
            onClick={() => executar(
              () => grupoService.alocarMonitor(grupo.nome, escolhidos[grupo.nome] || undefined),
              'Monitor alocado com sucesso')}
          >
            Alocar monitor
          </button>
          <button
            data-cy="alocacao-automatica-btn"
            onClick={() => executar(
              () => grupoService.alocarAutomaticamente(grupo.nome),
              'Monitor alocado automaticamente')}
          >
            Alocação automática
          </button>
          <button
            data-cy="remover-monitor-btn"
            onClick={() => executar(
              () => grupoService.removerMonitor(grupo.nome),
              'Monitor removido do grupo')}
          >
            Remover monitor
          </button>

          <input
            data-cy="destino-input"
            placeholder="Grupo de destino"
            value={destinos[grupo.nome] ?? ''}
            onChange={e => setDestinos({ ...destinos, [grupo.nome]: e.target.value })}
          />
          <button
            data-cy="realocar-monitor-btn"
            onClick={() => executar(
              () => grupoService.realocarMonitor(grupo.nome, grupo.monitor ?? '', destinos[grupo.nome] ?? ''),
              'Monitor realocado com sucesso')}
          >
            Realocar monitor
          </button>

          <input
            data-cy="aluno-input"
            placeholder="Nome do aluno"
            value={novosAlunos[grupo.nome] ?? ''}
            onChange={e => setNovosAlunos({ ...novosAlunos, [grupo.nome]: e.target.value })}
          />
          <button
            data-cy="adicionar-aluno-btn"
            onClick={() => executar(
              () => grupoService.adicionarAluno(grupo.nome, novosAlunos[grupo.nome] ?? ''),
              'Aluno adicionado com sucesso')}
          >
            Adicionar aluno
          </button>
        </div>
      ))}

      <h3>Monitores da disciplina</h3>
      <ul data-cy="monitores-lista">
        {monitores.map(m => (
          <li
            key={m.login}
            data-cy="monitor-item"
            data-login={m.login}
            data-situacao={m.situacao}
            data-automatica={String(m.alocacaoAutomatica)}
          >
            <span data-cy="monitor-login">{m.login}</span>{' '}
            <span data-cy="monitor-situacao">{m.situacao === 'livre' ? 'Livre' : 'Alocado'}</span>
            {m.grupos.length > 0 && <> ao grupo <span data-cy="monitor-grupos">{m.grupos.join(', ')}</span></>}
            {m.alocacaoAutomatica && <> (<span data-cy="monitor-automatica">alocação automática</span>)</>}
          </li>
        ))}
      </ul>

      <h3>Notificações enviadas</h3>
      <ul data-cy="notificacoes-lista">
        {notificacoes.map(n => (
          <li key={n.id} data-cy="notificacao-item" data-grupo={n.grupo} data-tipo={n.tipo}>
            <span data-cy="notificacao-destinatario">{n.destinatario}</span>{' '}
            <span data-cy="notificacao-tipo">{n.tipo}</span>: {n.mensagem}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Grupos;
