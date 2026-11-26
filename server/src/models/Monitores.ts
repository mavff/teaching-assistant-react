import { DomainError } from './DomainError';

/** Dados de um monitor da disciplina; o login o identifica. */
export interface Monitor {
  login: string;
  nome: string;
  email: string;
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cadastro dos monitores, identificados pelo login. */
export class Monitores {
  private monitores = new Map<string, Monitor>();

  cadastrar(login: string, nome: string, email: string): Monitor {
    if (!login || !login.trim()) {
      throw new DomainError('Monitor login is required');
    }
    if (!nome || !nome.trim()) {
      throw new DomainError('Monitor name is required');
    }
    if (!email || !email.trim()) {
      throw new DomainError('Monitor email is required');
    }
    if (!EMAIL_VALIDO.test(email.trim())) {
      throw new DomainError('Invalid monitor email');
    }
    if (this.monitores.has(login)) {
      throw new DomainError('Monitor already registered');
    }
    const monitor = { login, nome: nome.trim(), email: email.trim() };
    this.monitores.set(login, monitor);
    return monitor;
  }

  existe(login: string): boolean {
    return this.monitores.has(login);
  }

  buscar(login: string): Monitor | undefined {
    return this.monitores.get(login);
  }

  /** Logins dos monitores cadastrados. */
  listar(): string[] {
    return Array.from(this.monitores.keys());
  }

  limpar(): void {
    this.monitores.clear();
  }
}
