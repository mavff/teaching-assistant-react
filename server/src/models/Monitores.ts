import { DomainError } from './DomainError';

/** Cadastro dos monitores, identificados pelo login. */
export class Monitores {
  private logins = new Set<string>();

  cadastrar(login: string): void {
    if (!login || !login.trim()) {
      throw new DomainError('Login do monitor é obrigatório');
    }
    this.logins.add(login);
  }

  existe(login: string): boolean {
    return this.logins.has(login);
  }

  listar(): string[] {
    return Array.from(this.logins);
  }

  limpar(): void {
    this.logins.clear();
  }
}
