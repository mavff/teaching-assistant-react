import { ConfiguracaoLembretes, SalvarConfiguracaoLembretes } from '../types/Reminder';

const API_BASE_URL = 'http://localhost:3005';

class ReminderService {
  static async getConfiguration(classId: string): Promise<ConfiguracaoLembretes> {
    const response = await fetch(
      `${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}/lembretes`
    ); // Consulta o prazo e os lembretes da mesma turma; a URL preserva os caracteres do identificador.
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível consultar os lembretes');
    }
    return data;
  }

  static async saveConfiguration(
    classId: string,
    configuration: SalvarConfiguracaoLembretes
  ): Promise<ConfiguracaoLembretes> {
    const response = await fetch(
      `${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}/lembretes`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuration) // Envia quantidade e agendamentos para validação e gravação pelo servidor.
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível salvar os lembretes');
    }
    return data; // Somente a resposta confirmada pelo servidor atualiza o resumo da tela.
  }
}

export default ReminderService;
