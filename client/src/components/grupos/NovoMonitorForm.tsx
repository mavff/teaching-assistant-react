import React, { useState } from 'react';

const MONITOR_VAZIO = { login: '', nome: '', email: '' };

interface NovoMonitorFormProps {
  /** Cadastra o monitor; resolve true quando deu certo, para o formulário ser limpo. */
  onCadastrar: (login: string, nome: string, email: string) => Promise<boolean>;
}

/** Formulário de cadastro de monitor: login, nome e e-mail. */
const NovoMonitorForm: React.FC<NovoMonitorFormProps> = ({ onCadastrar }) => {
  const [monitor, setMonitor] = useState(MONITOR_VAZIO);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (await onCadastrar(monitor.login.trim(), monitor.nome, monitor.email)) {
      setMonitor(MONITOR_VAZIO);
    }
  };

  return (
    <form className="gp-form" onSubmit={enviar} aria-label="New monitor">
      <div className="gp-rotulo">New monitor</div>
      <div className="gp-linha">
        <input
          data-cy="novo-monitor-login"
          aria-label="Monitor login"
          placeholder="Login"
          value={monitor.login}
          onChange={e => setMonitor({ ...monitor, login: e.target.value })}
        />
        <input
          data-cy="novo-monitor-nome"
          aria-label="Monitor name"
          placeholder="Name"
          value={monitor.nome}
          onChange={e => setMonitor({ ...monitor, nome: e.target.value })}
        />
        <input
          data-cy="novo-monitor-email"
          aria-label="Monitor email"
          placeholder="Email"
          value={monitor.email}
          onChange={e => setMonitor({ ...monitor, email: e.target.value })}
        />
        <button type="submit" className="gp-btn gp-btn--primario" data-cy="cadastrar-monitor-btn">
          Register monitor
        </button>
      </div>
    </form>
  );
};

export default NovoMonitorForm;
