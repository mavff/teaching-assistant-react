import React, { useState } from 'react';

interface NovoGrupoFormProps {
  /** Alunos cadastrados que ainda não pertencem a nenhum grupo. */
  alunosSemGrupo: string[];
  /** Cria o grupo; resolve true quando deu certo, para o formulário ser limpo. */
  onCriar: (nome: string, alunos: string[]) => Promise<boolean>;
}

/** Formulário de criação de grupo, com os alunos escolhidos numa lista. */
const NovoGrupoForm: React.FC<NovoGrupoFormProps> = ({ alunosSemGrupo, onCriar }) => {
  const [nome, setNome] = useState('');
  const [alunos, setAlunos] = useState<string[]>([]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (await onCriar(nome.trim(), alunos)) {
      setNome('');
      setAlunos([]);
    }
  };

  return (
    <form className="gp-form" onSubmit={enviar} aria-label="New group">
      <div className="gp-rotulo">New group</div>
      <div className="gp-linha">
        <input
          data-cy="novo-grupo-nome"
          aria-label="Group name"
          placeholder="Group name"
          value={nome}
          onChange={e => setNome(e.target.value)}
        />
        <select
          data-cy="novo-grupo-aluno-select"
          aria-label="Student for the new group"
          value=""
          onChange={e => e.target.value && setAlunos([...alunos, e.target.value])}
        >
          <option value="">Add student (optional)</option>
          {alunosSemGrupo.filter(a => !alunos.includes(a)).map(aluno => (
            <option key={aluno} value={aluno}>{aluno}</option>
          ))}
        </select>
        <button type="submit" className="gp-btn gp-btn--primario" data-cy="criar-grupo-btn">
          Create group
        </button>
      </div>
      {alunos.length > 0 && (
        <ul className="gp-escolhidos" aria-label="Students of the new group">
          {alunos.map(aluno => (
            <li key={aluno} className="gp-escolhido" data-cy="novo-grupo-aluno">
              {aluno}
              <button
                type="button"
                className="gp-remover-escolhido"
                aria-label={`Remove ${aluno} from the new group`}
                onClick={() => setAlunos(alunos.filter(a => a !== aluno))}
              >×</button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};

export default NovoGrupoForm;
