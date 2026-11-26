import { AfterStep, type IWorld } from '@cucumber/cucumber';

type ParametrosDemonstracao = { pausaMs?: number };
const LIMITE_PAUSA_MS = 10_000;

// O modo normal usa zero. Na demonstração, mostra o passo antes de esperar.
AfterStep<IWorld<ParametrosDemonstracao>>(
  { timeout: LIMITE_PAUSA_MS + 5_000 },
  async function ({ pickleStep }) {
    const { pausaMs = 0 } = this.parameters;
    if (pausaMs === 0) return;
    if (!Number.isSafeInteger(pausaMs) || pausaMs < 0 || pausaMs > LIMITE_PAUSA_MS) {
      throw new Error('pausaMs deve ser um número inteiro de 0 a 10000');
    }

    console.log(pickleStep.text);
    await new Promise<void>(resolve => setTimeout(resolve, pausaMs));
  }
);
