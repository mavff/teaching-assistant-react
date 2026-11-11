
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

interface ContextoLembretes {
    ano?: number;
    semestre?: number;
    turmaId?: string;
    prazoAcademico?: string;
    browser?: Browser;
    page?: Page;
    datasEsperadas?: string[];
}

const API = 'http://localhost:3005';

async function preencherCampo(
  page: Page,
  seletor: string,
  valor: string
): Promise<void> {
  await page.waitForSelector(seletor);

  await page.$eval(
    seletor,
    (elemento, novoValor) => {
      const input = elemento as HTMLInputElement;

      // Usa o setter nativo para acionar corretamente
      // o onChange de campos controlados pelo React.
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;

      if (!setter) {
        throw new Error('Setter nativo não encontrado');
      }

      setter.call(input, novoValor);

      input.dispatchEvent(
        new Event('input', { bubbles: true })
      );

      input.dispatchEvent(
        new Event('change', { bubbles: true })
      );
    },
    valor
  );
}

async function preencherDataLembrete(
  contexto: ContextoLembretes,
  indice: number,
  dias: number,
  horario: string
): Promise<void> {
  if (!contexto.page) {
    throw new Error('Navegador não inicializado');
  }

  // Calcula a data usando o horário local do navegador.
  const valor = await contexto.page.evaluate(
    ({ dias, horario }) => {
      const [hora, minuto] = horario.split(':').map(Number);
      const data = new Date();

      data.setDate(data.getDate() + dias);
      data.setHours(hora, minuto, 0, 0);

      const dois = (n: number) => String(n).padStart(2, '0');

      return [
        data.getFullYear(),
        dois(data.getMonth() + 1),
        dois(data.getDate())
      ].join('-') + `T${dois(hora)}:${dois(minuto)}`;
    },
    { dias, horario }
  );

  await preencherCampo(
    contexto.page,
    `#reminder-date-${indice}`,
    valor
  );

  if (!contexto.datasEsperadas) {
    contexto.datasEsperadas = [];
  }

  contexto.datasEsperadas[indice] = valor;
}


async function verificarLembreteSalvo(
  contexto: ContextoLembretes,
  indice: number
): Promise<void> {
  if (!contexto.page || !contexto.datasEsperadas) {
    throw new Error('Dados do teste não inicializados');
  }

  const dataEsperada = contexto.datasEsperadas[indice];

  if (!dataEsperada) {
    throw new Error(`Data ${indice + 1} não definida`);
  }

  // Obtém o valor apresentado na configuração salva.
  const exibido = await contexto.page.$eval(
    `section[aria-labelledby="saved-reminders-title"] ol li:nth-child(${indice + 1})`,
    elemento => elemento.textContent?.trim() || ''
  );

  // Formata a data da mesma forma que o React.
  const esperado = await contexto.page.evaluate(
    valor => {
      const data = new Date(valor);

      const dia = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const hora = data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      return `${dia} às ${hora}`;
    },
    dataEsperada
  );

  expect(exibido).toBe(esperado);
}


Before({ tags: '@gui-lembretes' }, async function (
  this: ContextoLembretes
) {
  this.browser = await launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    slowMo: 350
  });

  this.page = await this.browser.newPage();

  await this.page.setViewport({
    width: 1280,
    height: 720
  });
});

After({ tags: '@gui-lembretes' }, async function (
  this: ContextoLembretes
) {
  if (this.browser) {
    // Permite visualizar o resultado antes de fechar
    await new Promise(resolve => setTimeout(resolve, 8000));

    await this.browser.close();
  }
});


// Given 1: preparar uma turma sem lembretes
Given(
  'que existe uma turma {string} de testes sem lembretes configurados',
  async function (this: ContextoLembretes, nomeTurma: string) {

    // Proteção: não executar sobre cadastros existentes.
    const consulta = await fetch(`${API}/api/classes`);
    if (!consulta.ok) {
      throw new Error('Não foi possível consultar as turmas');
    }

    const turmas = await consulta.json();
    if (!Array.isArray(turmas) || turmas.length !== 0) {
      throw new Error(
        'O servidor de teste deve estar vazio. Reinicie-o em NODE_ENV=test.'
      );
    }

    const hoje = new Date();

    this.ano = hoje.getFullYear();
    this.semestre = hoje.getMonth() < 6 ? 1 : 2;

    const resposta = await fetch(`${API}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: nomeTurma,
        year: this.ano,
        semester: this.semestre
      })
    });

    const turma = await resposta.json();

    if (!resposta.ok) {
      throw new Error(`Erro ao criar turma: ${JSON.stringify(turma)}`);
    }

    this.turmaId = turma.id;
  }
);

// Given 2: configurar o prazo acadêmico
Given(
  'o prazo acadêmico está definido para daqui a {int} dias',
  async function (this: ContextoLembretes, dias: number) {

    if (!this.ano || !this.semestre) {
      throw new Error('A turma precisa ser criada primeiro');
    }

    const prazo = new Date(
      Date.now() + dias * 24 * 60 * 60 * 1000
    );

    const resposta = await fetch(
      `${API}/api/periodos-academicos/${this.ano}/${this.semestre}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prazoAcademico: prazo.toISOString()
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        `Erro ao definir prazo: ${JSON.stringify(dados)}`
      );
    }

    this.prazoAcademico = dados.prazoAcademico;
  }
);

// Given 3: navegar para a tela de turmas
Given('o professor está na tela {string}',
  async function (
    this: ContextoLembretes,
    tela: string
  ) {
    if (tela !== 'Turmas') {
      throw new Error(`Tela inesperada: ${tela}`);
    }

    if (!this.page) {
      throw new Error('Navegador não inicializado');
    }

    await this.page.goto('http://localhost:3004');

    await this.page.waitForSelector(
      '[data-testid="classes-tab"]'
    );

    await this.page.click(
      '[data-testid="classes-tab"]'
    );

    await this.page.waitForSelector('.classes-list');
  }
);

// When 1: acessar a configuração de lembretes
When(
  'o professor acessa a configuração de lembretes da turma {string}',
  async function (
    this: ContextoLembretes,
    nomeTurma: string
  ) {
    if (!this.page) {
      throw new Error('Navegador não inicializado');
    }

    await this.page.waitForSelector(
      '.classes-list tbody tr'
    );

    const linhas = await this.page.$$(
      '.classes-list tbody tr'
    );

    for (const linha of linhas) {
      const colunas = await linha.$$eval(
        'td',
        elementos => elementos.map(
          elemento => elemento.textContent?.trim() || ''
        )
      );
      const semestreExibido = this.semestre === 1 ? '1st Semester' : '2nd Semester';

        if (
        colunas[0] !== nomeTurma ||
        colunas[1] !== String(this.ano) ||
        colunas[2] !== semestreExibido
        ) {
        continue;
        }

      const botoes = await linha.$$('button');

      for (const botao of botoes) {
        const texto = await botao.evaluate(
          elemento => elemento.textContent?.trim()
        );

        if (texto === 'Configurar lembretes') {
          await botao.click();

          await this.page.waitForSelector(
            '#reminder-settings-title',
            { visible: true }
          );

          return;
        }
      }
    }

    throw new Error(
      `Botão de configuração não encontrado para a turma ${nomeTurma}`
    );
  }
);

// When 2: informar a quantidade de lembretes
When(
  'informa {string} como quantidade de lembretes',
  async function (
    this: ContextoLembretes,
    quantidade: string
  ) {
    if (!this.page) {
      throw new Error('Navegador não inicializado');
    }

    await preencherCampo(
      this.page,
      '#reminder-count',
      quantidade
    );

    await this.page.waitForSelector('#reminder-date-1');
  }
);
// When 3: informar a data e hora do primeiro lembrete
When(
  'define o primeiro lembrete para daqui a {int} dias às {string}',
  async function (
    this: ContextoLembretes,
    dias: number,
    horario: string
  ) {
    await preencherDataLembrete(
      this,
      0,
      dias,
      horario
    );
  }
);
// When 4: informar a data e hora do segundo lembrete
When(
  'define o segundo lembrete para daqui a {int} dias às {string}',
  async function (
    this: ContextoLembretes,
    dias: number,
    horario: string
  ) {
    await preencherDataLembrete(
      this,
      1,
      dias,
      horario
    );
  }
);

// When 5: salvar a configuração
When('salva a configuração', async function (
  this: ContextoLembretes
) {
  if (!this.page) {
    throw new Error('Navegador não inicializado');
  }

  await this.page.click(
    'section[aria-labelledby="reminder-settings-title"] button[type="submit"]'
  );
});

// Then 1: verificar a mensagem de status
Then(
  'a tela apresenta a mensagem {string}',
  async function (
    this: ContextoLembretes,
    mensagem: string
  ) {
    if (!this.page) {
      throw new Error('Navegador não inicializado');
    }

    await this.page.waitForFunction(
      (texto) => Array.from(
        document.querySelectorAll('[role="status"]')
      ).some(elemento =>
        elemento.textContent?.includes(texto)
      ),
      { timeout: 10000 },
      mensagem
    );

    const mensagens = await this.page.$$eval(
      '[role="status"]',
      elementos => elementos.map(
        elemento => elemento.textContent || ''
      )
    );

    expect(
      mensagens.some(texto => texto.includes(mensagem))
    ).toBe(true);
  }
);

// Then 2: verificar a quantidade de lembretes configurados
Then(
  'a quantidade de lembretes configurados é {string}',
  async function (
    this: ContextoLembretes,
    quantidade: string
  ) {
    if (!this.page) {
      throw new Error('Navegador não inicializado');
    }

    const texto = await this.page.$eval(
      'section[aria-labelledby="saved-reminders-title"]',
      elemento => elemento.textContent || ''
    );

    expect(texto).toContain(
      `Quantidade de lembretes: ${quantidade}`
    );
  }
);

// Then 3: verificar a data e hora do primeiro lembrete
Then(
  'o primeiro lembrete apresenta a data e o horário definidos',
  async function (this: ContextoLembretes) {
    await verificarLembreteSalvo(this, 0);
  }
);

// Then 4: verificar a data e hora do segundo lembrete
Then(
  'o segundo lembrete apresenta a data e o horário definidos',
  async function (this: ContextoLembretes) {
    await verificarLembreteSalvo(this, 1);
  }
);

// Then 5: verificar que o prazo acadêmico não foi alterado
Then(
  'o prazo acadêmico permanece inalterado',
  async function (this: ContextoLembretes) {
    if (!this.page || !this.prazoAcademico) {
      throw new Error('Prazo acadêmico não inicializado');
    }

    const exibido = await this.page.$$eval(
      'section[aria-labelledby="reminder-settings-title"] > p',
      elementos => {
        const paragrafo = elementos.find(
          elemento => elemento.textContent?.includes(
            'Prazo acadêmico da turma:'
          )
        );

        return paragrafo?.querySelector('strong')
          ?.textContent?.trim() || '';
      }
    );

    const esperado = await this.page.evaluate(
      valor => {
        const data = new Date(valor);

        const dia = data.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        const hora = data.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        return `${dia} às ${hora}`;
      },
      this.prazoAcademico
    );

    expect(exibido).toBe(esperado);
  }
);
