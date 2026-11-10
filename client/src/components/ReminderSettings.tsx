import React from 'react';
import { Class } from '../types/Class';

interface ReminderSettingsProps { // Define o contrato das propriedades (props) que a tela de origem deve fornecer.
  classInfo: Class; // Recebe a turma; Class exige a estrutura já definida no projeto, incluindo ano, semestre e disciplina.
  onBack: () => void; // Recebe uma função sem argumentos; void indica que o componente não espera um valor de retorno.
}

const ReminderSettings: React.FC<ReminderSettingsProps> = ({ // const declara o componente; React.FC indica um componente de função com as props de ReminderSettingsProps.
  classInfo, // A desestruturação extrai a turma das props para acessar seus campos diretamente pelo nome classInfo.
  onBack // Extrai a função de retorno sem executá-la; a tela de origem define o que deve acontecer ao voltar.
}) => {
  return ( // Devolve o JSX: sintaxe semelhante a HTML que o React transforma nos elementos apresentados na interface.
    <section aria-labelledby="reminder-settings-title">{/* section agrupa o conteúdo; aria-labelledby usa o id do título para nomear a seção nos leitores de tela. */}
      <h2 id="reminder-settings-title">{/* h2 define um título de nível 2; id identifica esse elemento e o conecta à seção acima. */}
        Configuração de lembretes
      </h2>

      <p>{/* p apresenta em um parágrafo a identificação da turma cujos lembretes serão configurados. */}
        Turma: <strong>{/* strong dá destaque semântico à identificação da turma, normalmente exibida em negrito. */}
          {classInfo.year}.{classInfo.semester} de {classInfo.topic}{/* As chaves inserem os valores de classInfo no texto: ano.semestre de disciplina, como 2026.2 de ESS. */}
        </strong>
      </p>

      <button type="button" onClick={onBack}>{/* type="button" evita enviar formulários; onClick recebe a função onBack para executá-la quando houver um clique. */}
        Voltar para turmas
      </button>
    </section>
  );
};

export default ReminderSettings; // Define a exportação principal do arquivo, permitindo importar o componente sem chaves no import.
