import React, { useCallback, useEffect, useState } from 'react';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../services/GrupoService';
import { studentService } from '../services/StudentService';
import Avisos from './grupos/Avisos';
import CartaoGrupo from './grupos/CartaoGrupo';
import ListaMonitores from './grupos/ListaMonitores';
import ListaNotificacoes from './grupos/ListaNotificacoes';
import NovoGrupoForm from './grupos/NovoGrupoForm';
import NovoMonitorForm from './grupos/NovoMonitorForm';
import './Grupos.css';

/** Tempo que o aviso de sucesso fica na tela antes de sumir sozinho. */
export const DURACAO_AVISO_SUCESSO_MS = 4000;

/**
 * Aba Groups: carrega grupos, monitores, notificações e alunos cadastrados, e
 * coordena as ações das partes da página e os avisos de sucesso e erro.
 */
const Grupos: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [monitores, setMonitores] = useState<SituacaoMonitor[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [alunosCadastrados, setAlunosCadastrados] = useState<string[]>([]);
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

  // Um aluno pertence a um único grupo: só os alunos sem grupo aparecem nas listas.
  const alunosEmGrupos = new Set(grupos.flatMap(g => g.alunos));
  const alunosSemGrupo = alunosCadastrados.filter(aluno => !alunosEmGrupos.has(aluno));

  return (
    <div className="grupos" data-cy="grupos-pagina">
      <div className="gp-titulo">
        <h2>Groups</h2>
        <p>Allocate monitors and follow the notifications sent when a group changes.</p>
      </div>

      <Avisos erro={erro} sucesso={sucesso} onFecharErro={() => setErro('')} />

      <section className="gp-secao">
        <h3>Registration</h3>
        <div className="gp-cadastro">
          <NovoGrupoForm
            alunosSemGrupo={alunosSemGrupo}
            onCriar={(nome, alunos) => executar(() => grupoService.criarGrupo(nome, alunos), 'Group created successfully')}
          />
          <NovoMonitorForm
            onCadastrar={(login, nome, email) => executar(
              () => grupoService.cadastrarMonitor(login, nome, email), 'Monitor registered successfully')}
          />
        </div>
      </section>

      <section className="gp-secao">
        <h3>Groups <span className="gp-contador">{grupos.length}</span></h3>
        {grupos.length === 0 && <p className="gp-vazio">No groups yet.</p>}
        <div className="gp-grade">
          {grupos.map(grupo => (
            <CartaoGrupo
              key={grupo.nome}
              grupo={grupo}
              monitores={monitores}
              alunosSemGrupo={alunosSemGrupo}
              executar={executar}
            />
          ))}
        </div>
      </section>

      <ListaMonitores monitores={monitores} />
      <ListaNotificacoes notificacoes={notificacoes} />
    </div>
  );
};

export default Grupos;
