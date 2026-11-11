import { DomainError } from './DomainError';
import { Grupo } from './Grupo';

/** Coleção dos grupos, identificados por nome. */
export class Grupos {
  private grupos = new Map<string, Grupo>();

  adicionar(grupo: Grupo): Grupo {
    if (this.grupos.has(grupo.nome)) {
      throw new DomainError('Grupo já existe');
    }
    this.grupos.set(grupo.nome, grupo);
    return grupo;
  }

  buscar(nome: string): Grupo | undefined {
    return this.grupos.get(nome);
  }

  listar(): Grupo[] {
    return Array.from(this.grupos.values());
  }

  /** Monitores que já estão alocados a algum grupo. */
  monitoresAlocados(): Set<string> {
    const alocados = new Set<string>();
    this.grupos.forEach(g => g.monitor && alocados.add(g.monitor));
    return alocados;
  }

  /** Grupos dos quais o monitor é responsável (pode ser mais de um). */
  gruposDoMonitor(login: string): Grupo[] {
    return this.listar().filter(g => g.monitor === login);
  }

  limpar(): void {
    this.grupos.clear();
  }
}
