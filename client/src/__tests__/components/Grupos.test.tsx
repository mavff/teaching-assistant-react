import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Grupos, { DURACAO_AVISO_SUCESSO_MS } from '../../components/Grupos';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../../services/GrupoService';
import { studentService } from '../../services/StudentService';

jest.mock('../../services/GrupoService', () => ({
  grupoService: {
    listarGrupos: jest.fn(),
    situacaoDosMonitores: jest.fn(),
    listarNotificacoes: jest.fn(),
    criarGrupo: jest.fn(),
    cadastrarMonitor: jest.fn(),
    alocarMonitor: jest.fn(),
    alocarAutomaticamente: jest.fn(),
    removerMonitor: jest.fn(),
    realocarMonitor: jest.fn(),
    adicionarAluno: jest.fn()
  }
}));

jest.mock('../../services/StudentService', () => ({
  studentService: { getAllStudents: jest.fn() }
}));

/**
 * Componente da aba Groups com o GrupoService e o StudentService simulados: verifica que
 * as ações do professor chamam o serviço certo, que a tela é recarregada com as
 * notificações enviadas e que uma regra rejeitada aparece como mensagem de erro.
 * O fluxo completo com servidor real fica nos cenários Cypress.
 */
describe('GUI de notificação de alocação de monitor e aluno', () => {
  const servico = grupoService as jest.Mocked<typeof grupoService>;
  const alunosDoSistema = studentService.getAllStudents as jest.MockedFunction<typeof studentService.getAllStudents>;

  const g3: Grupo = { nome: 'ESS-G3', alunos: ['Mariana', 'Pedro'], monitor: null, alocacaoAutomatica: false };
  const joao: SituacaoMonitor = {
    login: 'joaosilva', nome: 'João Silva', email: 'joao@cin.ufpe.br',
    situacao: 'livre', grupos: [], alocacaoAutomatica: false
  };
  const cadastrados = ['Pedro', 'Carla', 'Ana'].map((name, i) => ({ name, cpf: String(i), email: `${i}@x.com` }));
  const alocacao = (id: number, destinatario: string): Notificacao => ({
    id, grupo: 'ESS-G3', destinatario, tipo: 'alocacao', mensagem: 'Alocação de monitor', resultado: 'Enviado'
  });

  const estado = (grupos: Grupo[], monitores: SituacaoMonitor[], notificacoes: Notificacao[]) => {
    servico.listarGrupos.mockResolvedValue(grupos);
    servico.situacaoDosMonitores.mockResolvedValue(monitores);
    servico.listarNotificacoes.mockResolvedValue(notificacoes);
  };

  const cardDoGrupo = async (nome: string) => {
    const nomeDoGrupo = await screen.findByRole('heading', { name: nome });
    return within(nomeDoGrupo.closest('article') as HTMLElement);
  };

  const opcoes = (select: HTMLElement) =>
    within(select).getAllByRole('option').map(o => (o as HTMLOptionElement).value).filter(Boolean);

  const formulario = (nome: string) => within(screen.getByRole('form', { name: nome }));

  beforeEach(() => {
    jest.resetAllMocks();
    estado([g3], [joao], []);
    alunosDoSistema.mockResolvedValue(cadastrados);
  });

  it('mostra o grupo sem monitor e nenhuma notificação enviada', async () => {
    render(<Grupos />);

    const card = await cardDoGrupo('ESS-G3');
    expect(card.getByText('No monitor')).toBeInTheDocument();
    expect(card.getByText('Mariana')).toBeInTheDocument();
    expect(screen.getByText('No notifications sent.')).toBeInTheDocument();
  });

  it('aloca o monitor escolhido na lista e exibe as notificações de alocação enviadas', async () => {
    servico.alocarMonitor.mockResolvedValue({ ...g3, monitor: 'joaosilva' });
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');
    const seletor = card.getByRole('combobox', { name: 'Group monitor' });
    expect(within(seletor).getByRole('option', { name: 'João Silva (joaosilva)' })).toBeInTheDocument();

    estado(
      [{ ...g3, monitor: 'joaosilva' }],
      [{ ...joao, situacao: 'alocado', grupos: ['ESS-G3'] }],
      [alocacao(1, 'Mariana'), alocacao(2, 'Pedro'), alocacao(3, 'joaosilva')]
    );
    fireEvent.change(seletor, { target: { value: 'joaosilva' } });
    fireEvent.click(card.getByRole('button', { name: 'Allocate' }));

    expect(await screen.findByText('Monitor allocated successfully')).toBeInTheDocument();
    expect(servico.alocarMonitor).toHaveBeenCalledWith('ESS-G3', 'joaosilva');
    const lista = within(screen.getByText('Sent notifications').closest('section') as HTMLElement);
    await waitFor(() => expect(lista.getAllByText('Allocation')).toHaveLength(3));
    expect(card.getByText('joaosilva', { selector: '[data-cy="grupo-monitor"]' })).toBeInTheDocument();
  });

  it('exibe a mensagem do servidor e não mostra notificação quando não há monitor disponível', async () => {
    servico.alocarMonitor.mockRejectedValue(new Error('No monitor available'));
    estado([g3], [], []);
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Allocate' }));

    expect(await screen.findByText('No monitor available')).toBeInTheDocument();
    expect(servico.alocarMonitor).toHaveBeenCalledWith('ESS-G3', undefined);
    expect(screen.getByText('No notifications sent.')).toBeInTheDocument();
    expect(card.getByText('No monitor')).toBeInTheDocument();
  });

  describe('adicionar aluno pela lista de alunos cadastrados', () => {
    it('oferece só os alunos cadastrados que ainda não fazem parte do grupo', async () => {
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');

      const seletor = card.getByRole('combobox', { name: 'Student to add' });
      await waitFor(() => expect(opcoes(seletor)).toEqual(['Ana', 'Carla']));
    });

    it('não oferece, em nenhuma lista, aluno que já pertence a outro grupo', async () => {
      estado([g3, { ...g3, nome: 'ESS-G4', alunos: ['Carla'] }], [joao], []);
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G4');

      await waitFor(() => expect(opcoes(card.getByRole('combobox', { name: 'Student to add' }))).toEqual(['Ana']));
      expect(opcoes(formulario('New group').getByRole('combobox', { name: 'Student for the new group' }))).toEqual(['Ana']);
    });

    it('adiciona o aluno escolhido e volta a lista para "Select a student"', async () => {
      servico.adicionarAluno.mockResolvedValue({ ...g3, alunos: [...g3.alunos, 'Carla'] });
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');
      const seletor = card.getByRole('combobox', { name: 'Student to add' });
      await waitFor(() => expect(opcoes(seletor)).toContain('Carla'));

      fireEvent.change(seletor, { target: { value: 'Carla' } });
      fireEvent.click(card.getByRole('button', { name: 'Add student' }));

      expect(await screen.findByText('Student added successfully')).toBeInTheDocument();
      expect(servico.adicionarAluno).toHaveBeenCalledWith('ESS-G3', 'Carla');
      expect(seletor).toHaveValue('');
    });

    it('mostra o erro do servidor quando nenhum aluno é escolhido', async () => {
      servico.adicionarAluno.mockRejectedValue(new Error('Student name is required'));
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');

      fireEvent.click(card.getByRole('button', { name: 'Add student' }));

      expect(await screen.findByText('Student name is required')).toBeInTheDocument();
      expect(servico.adicionarAluno).toHaveBeenCalledWith('ESS-G3', '');
    });

    it('fica só com "Select a student" quando a lista de alunos não carrega', async () => {
      alunosDoSistema.mockRejectedValue(new Error('offline'));
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');

      expect(opcoes(card.getByRole('combobox', { name: 'Student to add' }))).toEqual([]);
      expect(screen.queryByText('Failed to load groups')).not.toBeInTheDocument();
    });
  });

  it('realoca o monitor atual para o grupo de destino digitado', async () => {
    estado([{ ...g3, monitor: 'joaosilva' }], [{ ...joao, situacao: 'alocado', grupos: ['ESS-G3'] }], []);
    servico.realocarMonitor.mockRejectedValue(new Error('Destination group does not exist'));
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.change(card.getByPlaceholderText('Destination group'), { target: { value: 'ESS-G4' } });
    fireEvent.click(card.getByRole('button', { name: 'Reallocate' }));

    expect(await screen.findByText('Destination group does not exist')).toBeInTheDocument();
    expect(servico.realocarMonitor).toHaveBeenCalledWith('ESS-G3', 'joaosilva', 'ESS-G4');
  });

  it('remove o monitor e executa a alocação automática pelos botões do grupo', async () => {
    servico.removerMonitor.mockResolvedValue(undefined);
    servico.alocarAutomaticamente.mockResolvedValue({ ...g3, monitor: 'joaosilva', alocacaoAutomatica: true });
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Remove monitor' }));
    expect(await screen.findByText('Monitor removed from the group')).toBeInTheDocument();
    expect(servico.removerMonitor).toHaveBeenCalledWith('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Automatic allocation' }));
    expect(await screen.findByText('Monitor allocated automatically')).toBeInTheDocument();
    expect(servico.alocarAutomaticamente).toHaveBeenCalledWith('ESS-G3');
  });

  it('mostra nome, login e e-mail de cada monitor e marca a alocação automática', async () => {
    estado(
      [{ ...g3, monitor: 'joaosilva', alocacaoAutomatica: true }],
      [{ ...joao, situacao: 'alocado', grupos: ['ESS-G3'], alocacaoAutomatica: true }],
      []
    );
    render(<Grupos />);

    const lista = within((await screen.findByText('João Silva')).closest('li') as HTMLElement);
    expect(lista.getByText('joaosilva')).toBeInTheDocument();
    expect(lista.getByText('joao@cin.ufpe.br')).toBeInTheDocument();
    expect(lista.getByText('Allocated')).toBeInTheDocument();
    expect(lista.getByText('automatic allocation')).toBeInTheDocument();
    expect(lista.getByText('in group')).toBeInTheDocument();
  });

  it('usa "in groups" para monitor responsável por mais de um grupo', async () => {
    estado([], [{ ...joao, situacao: 'alocado', grupos: ['ESS-G3', 'ESS-G7'] }], []);
    render(<Grupos />);

    const lista = within((await screen.findByText('João Silva')).closest('li') as HTMLElement);
    expect(lista.getByText('in groups')).toBeInTheDocument();
    expect(lista.getByText('ESS-G3, ESS-G7')).toBeInTheDocument();
  });

  describe('criar grupo', () => {
    it('cria o grupo com os alunos escolhidos na lista e limpa o formulário', async () => {
      servico.criarGrupo.mockResolvedValue({ ...g3, nome: 'ESS-G4', alunos: ['Ana', 'Carla'] });
      render(<Grupos />);
      await cardDoGrupo('ESS-G3');
      const form = formulario('New group');
      const seletor = form.getByRole('combobox', { name: 'Student for the new group' });
      await waitFor(() => expect(opcoes(seletor)).toEqual(['Ana', 'Carla'])); // Pedro já está no ESS-G3

      fireEvent.change(form.getByLabelText('Group name'), { target: { value: ' ESS-G4 ' } });
      fireEvent.change(seletor, { target: { value: 'Ana' } });
      fireEvent.change(seletor, { target: { value: 'Carla' } });
      expect(opcoes(seletor)).toEqual([]);
      estado([g3, { ...g3, nome: 'ESS-G4', alunos: ['Ana', 'Carla'] }], [joao], []);
      fireEvent.click(form.getByRole('button', { name: 'Create group' }));

      expect(await screen.findByText('Group created successfully')).toBeInTheDocument();
      expect(servico.criarGrupo).toHaveBeenCalledWith('ESS-G4', ['Ana', 'Carla']);
      expect((await cardDoGrupo('ESS-G4')).getByText('Carla')).toBeInTheDocument();
      expect(form.getByLabelText('Group name')).toHaveValue('');
      expect(form.queryByRole('list', { name: 'Students of the new group' })).not.toBeInTheDocument();
    });

    it('permite tirar um aluno escolhido antes de criar o grupo', async () => {
      servico.criarGrupo.mockResolvedValue({ ...g3, nome: 'ESS-G4', alunos: ['Carla'] });
      render(<Grupos />);
      await cardDoGrupo('ESS-G3');
      const form = formulario('New group');
      const seletor = form.getByRole('combobox', { name: 'Student for the new group' });
      await waitFor(() => expect(opcoes(seletor)).toContain('Ana'));

      fireEvent.change(seletor, { target: { value: 'Ana' } });
      fireEvent.change(seletor, { target: { value: 'Carla' } });
      fireEvent.click(form.getByRole('button', { name: 'Remove Ana from the new group' }));
      fireEvent.change(form.getByLabelText('Group name'), { target: { value: 'ESS-G4' } });
      fireEvent.click(form.getByRole('button', { name: 'Create group' }));

      expect(await screen.findByText('Group created successfully')).toBeInTheDocument();
      expect(servico.criarGrupo).toHaveBeenCalledWith('ESS-G4', ['Carla']);
    });

    it('mostra o erro do servidor e mantém os dados quando o grupo já existe', async () => {
      servico.criarGrupo.mockRejectedValue(new Error('Group already exists'));
      render(<Grupos />);
      await cardDoGrupo('ESS-G3');
      const form = formulario('New group');

      fireEvent.change(form.getByLabelText('Group name'), { target: { value: 'ESS-G3' } });
      fireEvent.click(form.getByRole('button', { name: 'Create group' }));

      expect(await screen.findByText('Group already exists')).toBeInTheDocument();
      expect(servico.criarGrupo).toHaveBeenCalledWith('ESS-G3', []);
      expect(form.getByLabelText('Group name')).toHaveValue('ESS-G3');
    });
  });

  describe('cadastrar monitor', () => {
    const preencher = (login: string, nome: string, email: string) => {
      const form = formulario('New monitor');
      fireEvent.change(form.getByLabelText('Monitor login'), { target: { value: login } });
      fireEvent.change(form.getByLabelText('Monitor name'), { target: { value: nome } });
      fireEvent.change(form.getByLabelText('Monitor email'), { target: { value: email } });
      fireEvent.click(form.getByRole('button', { name: 'Register monitor' }));
      return form;
    };

    it('cadastra o monitor com login, nome e e-mail e limpa o formulário', async () => {
      servico.cadastrarMonitor.mockResolvedValue({ login: 'mariaeduarda', nome: 'Maria Eduarda', email: 'maria@cin.ufpe.br' });
      render(<Grupos />);
      await cardDoGrupo('ESS-G3');

      estado([g3], [joao, { ...joao, login: 'mariaeduarda', nome: 'Maria Eduarda', email: 'maria@cin.ufpe.br' }], []);
      const form = preencher(' mariaeduarda ', 'Maria Eduarda', 'maria@cin.ufpe.br');

      expect(await screen.findByText('Monitor registered successfully')).toBeInTheDocument();
      expect(servico.cadastrarMonitor).toHaveBeenCalledWith('mariaeduarda', 'Maria Eduarda', 'maria@cin.ufpe.br');
      expect(await screen.findByText('Maria Eduarda')).toBeInTheDocument();
      expect(form.getByLabelText('Monitor login')).toHaveValue('');
      expect(form.getByLabelText('Monitor email')).toHaveValue('');
    });

    it('mostra o erro do servidor e mantém os dados quando o e-mail é inválido', async () => {
      servico.cadastrarMonitor.mockRejectedValue(new Error('Invalid monitor email'));
      render(<Grupos />);
      await cardDoGrupo('ESS-G3');

      const form = preencher('mariaeduarda', 'Maria Eduarda', 'maria');

      expect(await screen.findByText('Invalid monitor email')).toBeInTheDocument();
      expect(form.getByLabelText('Monitor email')).toHaveValue('maria');
    });
  });

  describe('avisos fixos de sucesso e erro', () => {
    afterEach(() => jest.useRealTimers());

    it('mostra o sucesso como status e o tira da tela sozinho depois de alguns segundos', async () => {
      jest.useFakeTimers();
      servico.removerMonitor.mockResolvedValue(undefined);
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');

      fireEvent.click(card.getByRole('button', { name: 'Remove monitor' }));
      const aviso = await screen.findByRole('status');
      expect(aviso).toHaveTextContent('Monitor removed from the group');

      act(() => { jest.advanceTimersByTime(DURACAO_AVISO_SUCESSO_MS); });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('mantém o erro como alerta até ser fechado no ×', async () => {
      jest.useFakeTimers();
      servico.alocarMonitor.mockRejectedValue(new Error('No monitor available'));
      render(<Grupos />);
      const card = await cardDoGrupo('ESS-G3');

      fireEvent.click(card.getByRole('button', { name: 'Allocate' }));
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No monitor available');

      act(() => { jest.advanceTimersByTime(DURACAO_AVISO_SUCESSO_MS * 2); });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      fireEvent.click(within(alerta).getByRole('button', { name: 'Close message' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
