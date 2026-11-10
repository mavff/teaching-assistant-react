import React, { useState } from 'react';
import { Class } from '../types/Class';

interface ReminderSettingsProps { // Define o contrato das propriedades (props) que a tela de origem deve fornecer.
  classInfo: Class; // Recebe a turma; Class exige a estrutura já definida no projeto, incluindo ano, semestre e disciplina.
  onBack: () => void; // Recebe uma função sem argumentos; void indica que o componente não espera um valor de retorno.
}

const ReminderSettings: React.FC<ReminderSettingsProps> = ({ // const declara o componente; React.FC indica um componente de função com as props de ReminderSettingsProps.
  classInfo, // A desestruturação extrai a turma das props para acessar seus campos diretamente pelo nome classInfo.
  onBack // Extrai a função de retorno sem executá-la; a tela de origem define o que deve acontecer ao voltar.
}) => {
  const [reminderCount, setReminderCount] = useState(''); // Guarda a quantidade digitada; começa vazia para permitir o preenchimento.
  const [reminderDates, setReminderDates] = useState<string[]>([]); // Guarda uma lista de datas e horários; cada posição corresponde a um lembrete.

  const count = Number(reminderCount); // Converte a quantidade digitada de texto para número.
  const visibleCount = Number.isSafeInteger(count) && count >= 0 ? count : 0; // Só gera campos quando a quantidade é um número inteiro não negativo.

  const handleDateChange = (index: number, value: string) => { // Recebe a posição do lembrete e a data e horário preenchidos.
    setReminderDates(previousDates => { // Usa a versão mais recente das datas guardadas no estado.
      const updatedDates = [...previousDates]; // Copia a lista para preservar os outros valores sem modificar diretamente o estado.
      updatedDates[index] = value; // Atualiza somente o lembrete que o professor está editando.
      return updatedDates; // Entrega a nova lista ao React para atualizar a interface.
    });
  };

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

      <div className="form-group">{/* Reutiliza os estilos dos campos existentes no projeto. */}
        <label htmlFor="reminder-count">{/* Associa o rótulo ao campo pelo id. */}
          Quantidade de lembretes
        </label>

        <input
          id="reminder-count"
          type="number"
          min={0}
          step={1}
          value={reminderCount}
          onChange={(event) => setReminderCount(event.target.value)}
        />{/* value apresenta o estado atual; onChange atualiza esse estado a cada edição. */}
      </div>

      {Array.from({ length: visibleCount }, (_, index) => ( // Cria um campo para cada lembrete; index identifica sua posição.
        <div className="form-group" key={index}>{/* Reutiliza os estilos existentes; key identifica cada grupo para o React. */}
          <label htmlFor={`reminder-date-${index}`}>{/* Liga o rótulo ao campo usando um identificador diferente para cada lembrete. */}
            Data e horário do lembrete {index + 1}
          </label>

          <input
            id={`reminder-date-${index}`}
            type="datetime-local"
            value={reminderDates[index] ?? ''}
            onChange={(event) => handleDateChange(index, event.target.value)}
          />{/* datetime-local permite escolher data e horário; value apresenta o valor guardado e onChange registra a edição. */}
        </div>
      ))}

      <button type="button" onClick={onBack}>{/* type="button" evita enviar formulários; onClick recebe a função onBack para executá-la quando houver um clique. */}
        Voltar para turmas
      </button>
    </section>
  );
};

export default ReminderSettings; // Define a exportação principal do arquivo, permitindo importar o componente sem chaves no import.
