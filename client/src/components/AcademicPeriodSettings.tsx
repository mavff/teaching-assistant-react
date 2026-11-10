import React, { useEffect, useState } from 'react';
import AcademicPeriodService from '../services/AcademicPeriodService';

const toLocalInputValue = (value: string | null): string => {
  if (value === null) return '';
  const date = new Date(value);
  const localTime = date.getTime() - date.getTimezoneOffset() * 60_000; // Ajusta a representação para exibir o horário local em vez do UTC recebido.
  return new Date(localTime).toISOString().slice(0, 16); // Produz o formato YYYY-MM-DDTHH:mm aceito pelo campo.
};

const AcademicPeriodSettings: React.FC = () => {
  const [year, setYear] = useState(String(new Date().getFullYear())); // Inicia com o ano atual e mantém o valor digitado como texto.
  const [semester, setSemester] = useState('1'); // Guarda o semestre escolhido, independentemente do cadastro de turmas.
  const [deadline, setDeadline] = useState(''); // Guarda o prazo em edição; começa sem presumir uma data.
  const [isLoading, setIsLoading] = useState(true); // Aguarda a consulta do período antes de permitir editar ou salvar o prazo.
  const [isSaving, setIsSaving] = useState(false); // Impede novos envios e alterações de período enquanto a gravação está em andamento.
  const [error, setError] = useState(''); // Apresenta o motivo de uma falha na consulta ou no salvamento.
  const [success, setSuccess] = useState(''); // Confirma somente um salvamento aceito pela API.

  useEffect(() => {
    const selectedYear = Number(year);
    if (!year.trim() || !Number.isSafeInteger(selectedYear) || selectedYear < 1) {
      setIsLoading(false); // Não consulta a API com ano vazio ou inválido.
      return;
    }

    let active = true; // Identifica se a consulta ainda pertence ao período apresentado pelo componente.
    setIsLoading(true);
    const loadPeriod = async () => {
      try {
        const period = await AcademicPeriodService.getPeriod(selectedYear, Number(semester));
        if (active) setDeadline(toLocalInputValue(period?.prazoAcademico ?? null));
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Não foi possível consultar o prazo acadêmico');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadPeriod();
    return () => { active = false; }; // Ignora respostas antigas ao trocar o período ou sair da tela.
  }, [year, semester]);

  const resetPeriodDraft = () => {
    setDeadline(''); // Retira o prazo do período anterior assim que o professor altera ano ou semestre.
    setIsLoading(true); // Bloqueia o salvamento até a consulta do novo período terminar.
    setError('');
    setSuccess('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault(); // Envia pela API sem recarregar a página.
    if (isLoading || isSaving) return; // Aguarda a consulta terminar e impede envios simultâneos.

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const parsedDeadline = new Date(deadline); // Interpreta o preenchimento no fuso horário do navegador.
      if (!Number.isFinite(parsedDeadline.getTime())) {
        throw new Error('Prazo acadêmico inválido');
      }

      const saved = await AcademicPeriodService.savePeriod(
        Number(year),
        Number(semester),
        parsedDeadline.toISOString() // Converte o horário local para o instante enviado ao servidor.
      );

      setDeadline(toLocalInputValue(saved.prazoAcademico)); // Apresenta o valor confirmado pela API no horário local.
      setSuccess(`Prazo acadêmico de ${saved.ano}.${saved.semestre} salvo com sucesso`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar o prazo acadêmico');
    } finally {
      setIsSaving(false); // Libera uma nova tentativa após sucesso ou falha.
    }
  };

  return (
    <section className="class-form-container" aria-labelledby="academic-period-title">
      <h3 id="academic-period-title">Prazo acadêmico por semestre</h3>

      <p>O prazo definido será compartilhado por todas as turmas do ano e semestre informados.</p>

      <form onSubmit={handleSave}>{/* Reúne os campos obrigatórios e permite salvar também pelo teclado. */}
        <div className="form-group">
          <label htmlFor="academic-year">Ano</label>
          <input
            id="academic-year"
            type="number"
            min={1}
            step={1}
            required
            disabled={isSaving}
            value={year}
            onChange={event => {
              setYear(event.target.value);
              resetPeriodDraft();
            }}
          />{/* Mantém o ano apresentado sincronizado com o preenchimento. */}
        </div>

        <div className="form-group">
          <label htmlFor="academic-semester">Semestre</label>
          <select
            id="academic-semester"
            required
            disabled={isSaving}
            value={semester}
            onChange={event => {
              setSemester(event.target.value);
              resetPeriodDraft();
            }}
          >{/* Limita a escolha aos dois semestres previstos no domínio. */}
            <option value="1">1º semestre</option>
            <option value="2">2º semestre</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="academic-deadline">Data e horário limite para lançamento das notas</label>
          <input
            id="academic-deadline"
            type="datetime-local"
            required
            disabled={isLoading || isSaving}
            value={deadline}
            onChange={event => {
              setDeadline(event.target.value);
              setError('');
              setSuccess(''); // A confirmação anterior não corresponde ao preenchimento que acabou de ser alterado.
            }}
          />{/* Mantém o horário local em edição; o envio usa a representação ISO do mesmo instante. */}
        </div>

        <button type="submit" disabled={isLoading || isSaving}>{/* Aguarda a consulta ou gravação antes de permitir outro envio. */}
          {isSaving ? 'Salvando…' : 'Salvar prazo acadêmico'}
        </button>
      </form>

      {isLoading && <p role="status">Carregando prazo acadêmico…</p>}
      {error && <p role="alert">{error}</p>}{/* Anuncia o motivo da rejeição sem apagar o preenchimento em edição. */}
      {success && <p role="status">{success}</p>}{/* Apresenta a confirmação somente após a resposta positiva do servidor. */}
    </section>
  );
};

export default AcademicPeriodSettings;
