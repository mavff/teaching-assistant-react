export interface AcademicPeriod {
  ano: number;
  semestre: number;
  prazoAcademico: string | null; // Descreve a resposta da API; não cria outra entidade de domínio.
}

const API_BASE_URL = 'http://localhost:3005';

class AcademicPeriodService {
  /** Consulta o prazo oficial do período identificado pelo ano e semestre. */
  static async getPeriod(ano: number, semestre: number): Promise<AcademicPeriod | null> {
    const response = await fetch(`${API_BASE_URL}/api/periodos-academicos/${ano}/${semestre}`);

    if (response.status === 404) return null; // Um período ainda não cadastrado deixa o formulário vazio.

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível consultar o prazo acadêmico');
    }

    return data;
  }

  /** Atualiza somente o prazo do período identificado na URL. */
  static async savePeriod(ano: number, semestre: number, prazoAcademico: string): Promise<AcademicPeriod> {
    const response = await fetch(`${API_BASE_URL}/api/periodos-academicos/${ano}/${semestre}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prazoAcademico })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível salvar o prazo acadêmico');
    }

    return data; // Retorna a confirmação produzida após a gravação pelo servidor.
  }
}

export default AcademicPeriodService;
