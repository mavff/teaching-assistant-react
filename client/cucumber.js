process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  target: 'ES2020'
});

module.exports = {
  default: {
    require: [
      'ts-node/register',
      'src/step-definitions/**/*.ts'
    ],
    format: [
      'progress-bar',
      'json:reports/cucumber_report.json',
      'html:reports/cucumber_report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['src/features/**/*.feature'],
    requireModule: ['ts-node/register']
  },
  // A tag seleciona os cenários de configuração e carrega seus passos de Puppeteer.
  lembretesGui: {
    paths: ['../features/Notificacao_falta_cadastrar_alguma_nota.feature'],
    tags: '@lembretes-configuracao-gui',
    requireModule: ['ts-node/register/transpile-only'],
    require: [
      'src/step-definitions/lembretes-gui-steps.ts',
      'src/test-support/demonstracao-gui.ts'
    ],
    format: ['progress-bar']
  },
  // Seleciona os quatro cenários de histórico pelo título e carrega os passos correspondentes.
  historicoGui: {
    paths: ['../features/Notificacao_falta_cadastrar_alguma_nota.feature'],
    name: [
      '^Visualização do histórico de notificações$',
      '^Visualização dos detalhes históricos de uma notificação$',
      '^Visualização de uma falha no próprio histórico$',
      '^Filtragem do próprio histórico por disciplina e turma$'
    ],
    requireModule: ['ts-node/register/transpile-only'],
    require: [
      'src/step-definitions/historico-gui-steps.ts',
      'src/test-support/demonstracao-gui.ts'
    ],
    format: ['progress-bar']
  }
};
