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
  const [savedDates, setSavedDates] = useState<string[] | null>(null); // Guarda uma cópia das datas salvas; null indica que ainda não houve salvamento.
  const [saveError, setSaveError] = useState(''); // Guarda a mensagem apresentada quando a configuração está incompleta ou inválida.
  const [saveSuccess, setSaveSuccess] = useState(''); // Guarda a confirmação do último salvamento.

  const count = Number(reminderCount); // Converte a quantidade digitada de texto para número.
  const visibleCount = Number.isSafeInteger(count) && count >= 0 ? count : 0; // Só gera campos quando a quantidade é um número inteiro não negativo.

  const handleDateChange = (index: number, value: string) => { // Recebe a posição do lembrete e a data e horário preenchidos.
    setSaveError(''); // Retira uma mensagem de erro que pode não corresponder mais ao preenchimento atual.
    setSaveSuccess(''); // Retira a confirmação, pois a edição atual ainda não foi salva novamente.
    setReminderDates(previousDates => { // Usa a versão mais recente das datas guardadas no estado.
      const updatedDates = [...previousDates]; // Copia a lista para preservar os outros valores sem modificar diretamente o estado.
      updatedDates[index] = value; // Atualiza somente o lembrete que o professor está editando.
      return updatedDates; // Entrega a nova lista ao React para atualizar a interface.
    });
  };

  const handleSave = () => { // Executa as verificações antes de guardar a configuração.
    setSaveError(''); // Remove o erro da tentativa anterior.
    setSaveSuccess(''); // Remove a confirmação anterior antes de verificar os novos dados.

    if (reminderCount.trim() === '' || !Number.isSafeInteger(count) || count < 0) {
      setSaveError('Informe uma quantidade inteira não negativa de lembretes');
      return; // Interrompe o salvamento e preserva a configuração anteriormente salva.
    }

    const datesToSave = Array.from(
      { length: count },
      (_, index) => reminderDates[index] ?? ''
    ); // Copia somente as datas correspondentes à quantidade atual, incluindo posições ainda vazias.

    if (datesToSave.some(date => date === '')) { // some verifica se pelo menos um lembrete está sem data e horário.
      setSaveError(`Selecione exatamente ${count} datas e horários`);
      return; // Preserva a configuração anterior quando o preenchimento está incompleto.
    }

    setSavedDates(datesToSave); // Guarda a cópia em memória, sem alterar os campos que estão em edição.
    setSaveSuccess('Configuração salva com sucesso'); // Apresenta a confirmação exigida pelo cenário.
  };

  const formatReminderDate = (value: string) => { // Recebe o texto fornecido pelo campo datetime-local.
    const [date, time] = value.split('T'); // Separa a data do horário; exemplo: 2026-08-25 e 09:00.
    return `${date.split('-').reverse().join('/')} às ${time}`; // Apresenta o valor como 25/08/2026 às 09:00, sem converter o fuso horário.
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
          onChange={(event) => {
            setReminderCount(event.target.value); // Atualiza a quantidade digitada, mantendo o resumo salvo separado da edição.
            setSaveError(''); // Retira uma mensagem de erro que pode não corresponder mais ao preenchimento atual.
            setSaveSuccess(''); // Retira a confirmação, pois a edição atual ainda não foi salva novamente.
          }}
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

      <button type="button" onClick={handleSave}>{/* Executa a verificação e o salvamento local ao clicar. */}
        Salvar configuração
      </button>

      {saveError && <p role="alert">{saveError}</p>}{/* Apresenta o erro e permite que leitores de tela o anunciem. */}
      {saveSuccess && <p role="status">{saveSuccess}</p>}{/* Apresenta a confirmação sem deslocar o professor para outra tela. */}

      {savedDates !== null && ( // Apresenta o resumo somente depois de um salvamento bem-sucedido.
        <section aria-labelledby="saved-reminders-title">
          <h3 id="saved-reminders-title">Configuração salva</h3>
          <p>Quantidade de lembretes: {savedDates.length}</p>

          <ol>{/* Organiza os lembretes salvos em uma lista numerada. */}
            {savedDates.map((date, index) => ( // Transforma cada data salva em um item da lista.
              <li key={index}>{formatReminderDate(date)}</li>
            ))}
          </ol>
        </section>
      )}

      <button type="button" onClick={onBack}>{/* type="button" evita enviar formulários; onClick recebe a função onBack para executá-la quando houver um clique. */}
        Voltar para turmas
      </button>
    </section>
  );
};

export default ReminderSettings; // Define a exportação principal do arquivo, permitindo importar o componente sem chaves no import.
