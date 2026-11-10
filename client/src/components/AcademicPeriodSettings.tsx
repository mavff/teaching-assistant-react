import React, { useState } from 'react';

const AcademicPeriodSettings: React.FC = () => {
  const [year, setYear] = useState(String(new Date().getFullYear())); // Inicia com o ano atual e mantém o valor digitado como texto.
  const [semester, setSemester] = useState('1'); // Guarda o semestre escolhido, independentemente do cadastro de turmas.
  const [deadline, setDeadline] = useState(''); // Guarda o prazo em edição; começa sem presumir uma data.

  return (
    <section className="class-form-container" aria-labelledby="academic-period-title">
      <h3 id="academic-period-title">Prazo acadêmico por semestre</h3>

      <p>O prazo definido será compartilhado por todas as turmas do ano e semestre informados.</p>

      <div className="form-group">
        <label htmlFor="academic-year">Ano</label>
        <input
          id="academic-year"
          type="number"
          min={1}
          step={1}
          value={year}
          onChange={event => setYear(event.target.value)}
        />{/* Mantém o ano apresentado sincronizado com o preenchimento. */}
      </div>

      <div className="form-group">
        <label htmlFor="academic-semester">Semestre</label>
        <select
          id="academic-semester"
          value={semester}
          onChange={event => setSemester(event.target.value)}
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
          value={deadline}
          onChange={event => setDeadline(event.target.value)}
        />{/* Recebe data e horário locais; a conversão para envio será feita na integração com a API. */}
      </div>
    </section>
  );
};

export default AcademicPeriodSettings;
