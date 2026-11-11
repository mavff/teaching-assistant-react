import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AcademicPeriodSettings from '../../components/AcademicPeriodSettings';
import { AcademicPeriod } from '../../services/AcademicPeriodService';

/**
 * Testes de integração do componente com uma API simulada: salvamento, recuperação e rejeição do prazo.
 * Protegem a confirmação de sucesso e a identificação do período; a gravação real é verificada no servidor.
 */
describe('Formulário de prazo acadêmico', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
  const deadlineLabel = 'Data e horário limite para lançamento das notas';
  const response = (status: number, body: unknown): Response => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response); // Fornece as partes da resposta HTTP usadas pelo serviço, sem abrir conexões reais.

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock; // Isola as chamadas HTTP de cada teste.
  });

  afterEach(() => {
    global.fetch = originalFetch; // Restaura a função original após a desmontagem automática do componente.
  });

  test('confirma após a resposta da API e recupera o prazo ao abrir novamente', async () => { // Exercita o caminho completo entre o formulário e o contrato HTTP.
    const year = new Date().getFullYear();
    const localDeadline = '2099-08-25T09:00'; // Exemplo de preenchimento; a aplicação não recebe um prazo fixo desse teste.
    const saved: AcademicPeriod = { ano: year, semestre: 1, prazoAcademico: new Date(localDeadline).toISOString() };
    let stored: AcademicPeriod | null = null;
    let finishSave: (value: Response) => void = () => { throw new Error('A gravação ainda não foi iniciada'); };
    fetchMock.mockImplementation((_, options) => options?.method === 'PUT'
      ? new Promise<Response>(resolve => { finishSave = resolve; }) // Mantém a resposta pendente para conferir o comportamento durante o envio.
      : Promise.resolve(response(stored ? 200 : 404, stored ?? {})));

    const firstView = render(<AcademicPeriodSettings />);
    const saveButton = screen.getByRole('button', { name: 'Salvar prazo acadêmico' }) as HTMLButtonElement;
    await waitFor(() => expect(saveButton.disabled).toBe(false));
    fireEvent.change(screen.getByLabelText(deadlineLabel), { target: { value: localDeadline } });
    fireEvent.click(saveButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3005/api/periodos-academicos/${year}/1`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ prazoAcademico: saved.prazoAcademico }) })
    )); // Confere o período na URL e a conversão do horário local para ISO no corpo.
    expect(saveButton.disabled).toBe(true);
    expect(screen.queryByText(/salvo com sucesso/)).toBeNull(); // Uma requisição ainda pendente não pode produzir confirmação.

    await act(async () => {
      stored = saved;
      finishSave(response(200, saved));
    });
    await screen.findByText(`Prazo acadêmico de ${year}.1 salvo com sucesso`);

    firstView.unmount();
    render(<AcademicPeriodSettings />); // Simula sair e abrir novamente, sem reaproveitar o estado do formulário anterior.
    await waitFor(() => expect((screen.getByLabelText(deadlineLabel) as HTMLInputElement).value).toBe(localDeadline));
  });

  test('mostra a rejeição do servidor sem confirmar sucesso ou apagar a edição', async () => { // O professor deve poder corrigir o valor rejeitado.
    const message = 'Prazo acadêmico não pode ser anterior à data atual';
    fetchMock.mockImplementation((_, options) => Promise.resolve(
      options?.method === 'PUT' ? response(400, { error: message }) : response(404, {})
    ));
    render(<AcademicPeriodSettings />);
    const saveButton = screen.getByRole('button', { name: 'Salvar prazo acadêmico' }) as HTMLButtonElement;
    const input = screen.getByLabelText(deadlineLabel) as HTMLInputElement;
    await waitFor(() => expect(saveButton.disabled).toBe(false));
    fireEvent.change(input, { target: { value: '2000-01-01T09:00' } });
    fireEvent.click(saveButton);

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.queryByText(/salvo com sucesso/)).toBeNull();
    expect(input.value).toBe('2000-01-01T09:00');
    expect(saveButton.disabled).toBe(false);
  });

  test('ignora a consulta antiga quando o professor troca o período', async () => { // Uma resposta atrasada não pode apresentar o prazo de outro ano.
    const initialYear = new Date().getFullYear();
    const latest: AcademicPeriod = { ano: 2099, semestre: 1, prazoAcademico: '2099-08-31T12:00:00.000Z' };
    let finishOldQuery: (value: Response) => void = () => { throw new Error('A consulta ainda não foi iniciada'); };
    fetchMock.mockImplementation(input => String(input).endsWith('/2099/1')
      ? Promise.resolve(response(200, latest))
      : new Promise<Response>(resolve => { finishOldQuery = resolve; }));
    render(<AcademicPeriodSettings />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`http://localhost:3005/api/periodos-academicos/${initialYear}/1`));
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2099' } });
    const input = screen.getByLabelText(deadlineLabel) as HTMLInputElement;
    await waitFor(() => expect(input.value).not.toBe(''));
    expect(new Date(input.value).toISOString()).toBe(latest.prazoAcademico); // Confere o instante sem depender do fuso do computador que executa os testes.

    await act(async () => {
      finishOldQuery(response(200, { ano: initialYear, semestre: 1, prazoAcademico: '2099-08-20T12:00:00.000Z' }));
    });

    expect(new Date(input.value).toISOString()).toBe(latest.prazoAcademico);
    expect((screen.getByLabelText('Ano') as HTMLInputElement).value).toBe('2099');
  });
});
