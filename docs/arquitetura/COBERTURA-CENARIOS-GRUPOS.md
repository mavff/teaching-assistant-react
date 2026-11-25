# Cobertura dos cenários de grupos e monitores

Acompanha os cenários da funcionalidade **Notificação de alocação de monitor e aluno**
([features/notification.feature](../../features/notification.feature)) em relação ao
modelo DDD ([modelo-ddd.mmd](modelo-ddd.mmd)) e aos testes automatizados.

Segue a mesma leitura de [COBERTURA-CENARIOS.md](COBERTURA-CENARIOS.md), que cobre os
lembretes: **Regra central representada** indica que o modelo contém as operações e as
regras que o cenário exige; **Parcial** e **Pendente** indicam lacunas.

No DDD, grupos e monitores não têm classes próprias: são representados pelos métodos de
grupo de `Services`, por `NotificacaoService.notificarGrupo` e pelo atributo
`grupoRegistrado` de `Notificacao`, com as regras descritas na nota de grupos do modelo.

## Onde cada cenário é executado

| Tipo | Arquivo executável | Ferramenta |
| --- | --- | --- |
| GUI | [notification-grupos.feature](../../client/cypress/e2e/notification-grupos.feature) | Cypress (navegador, cliente e servidor reais) |
| Serviço | [notification-grupos-servico.feature](../../client/cypress/e2e/notification-grupos-servico.feature) | Cypress, só pela API |

Os dois arquivos têm os mesmos cenários de `features/notification.feature`, com as
palavras-chave em português. Cada cenário zera grupos, monitores e notificações antes e
depois de rodar, e apaga os alunos de teste que criou. Ao zerar os dados, o servidor passa
a simular os e-mails de grupo, mesmo com `NOTIFICACOES_GRUPO_EMAIL=smtp`.

As mesmas regras também têm testes de unidade (`server/src/__tests__/Services.test.ts`),
de integração da API (`server/src/__tests__/GruposApi.test.ts`), do envio de e-mail
(`server/src/__tests__/EmailGrupos.test.ts`) e do componente da aba Groups
(`client/src/__tests__/components/Grupos.test.tsx`).

## Cenários GUI

| Cenário | Cobertura conceitual | Evidência no modelo | Execução |
| --- | --- | --- | --- |
| [Criar grupo com alunos cadastrados](../../features/notification.feature#L7) | Regra central representada | `Services.criarGrupo(nome, alunos)`; criar grupo não gera notificação. | Cypress GUI: passando |
| [Não criar grupo com nome já existente](../../features/notification.feature#L17) | Regra central representada | `criarGrupo` recusa nome repetido sem alterar o grupo existente. | Cypress GUI: passando |
| [Cadastrar monitor com nome e e-mail](../../features/notification.feature#L24) | Regra central representada | `Services.cadastrarMonitor(login, nome, email)`; o monitor aparece livre em `situacaoDosMonitores`. | Cypress GUI: passando |
| [Não cadastrar monitor com e-mail inválido](../../features/notification.feature#L30) | Regra central representada | A nota de grupos exige e-mail válido; a recusa não cadastra o monitor. | Cypress GUI: passando |
| [Notificar grupo ao alocar monitor](../../features/notification.feature#L37) | Regra central representada | `alocarMonitor` solicita `notificarGrupo` com o motivo alocação para alunos e monitor. | Cypress GUI: passando |
| [Não alocar outro monitor a grupo que já tem monitor](../../features/notification.feature#L45) | Regra central representada | Nota de grupos: grupo com monitor não recebe outro; nenhuma notificação. | Cypress GUI: passando |
| [Notificar grupo ao adicionar aluno a grupo com monitor](../../features/notification.feature#L54) | Regra central representada | `adicionarAluno` solicita `notificarGrupo` com o motivo aviso para todos os participantes. | Cypress GUI: passando |
| [Não oferecer para adição aluno que já pertence ao grupo](../../features/notification.feature#L62) | Regra central representada | Alunos sem repetição no grupo; a tela só oferece quem ainda não está nele. | Cypress GUI: passando |
| [Não oferecer aluno que já pertence a outro grupo](../../features/notification.feature#L69) | Regra central representada | Nota de grupos: cada aluno pertence a um único grupo. | Cypress GUI: passando |
| [Não notificar quando alocação de monitor falha](../../features/notification.feature#L78) | Regra central representada | Sem monitor livre, `alocarMonitor` é recusado sem alterar o grupo nem notificar. | Cypress GUI: passando |
| [Notificar participantes na realocação de monitor entre grupos](../../features/notification.feature#L87) | Regra central representada | `realocarMonitor` notifica saída na origem e entrada no destino; `consultarHistorico` mostra o registro por `grupoRegistrado`. | Cypress GUI: passando |
| [Atualizar os grupos após a realocação de monitor entre grupos](../../features/notification.feature#L96) | Regra central representada | `realocarMonitor` tira o monitor da origem e o aloca no destino. | Cypress GUI: passando |
| [Alocação automática quando há apenas um monitor disponível](../../features/notification.feature#L104) | Regra central representada | `alocarAutomaticamente` escolhe o monitor livre e notifica a alocação. | Cypress GUI: passando |
| [Atualizar a lista de monitores após a alocação automática](../../features/notification.feature#L112) | Regra central representada | `situacaoDosMonitores` informa grupo, situação e alocação automática. | Cypress GUI: passando |
| [Não notificar quando a alocação automática não encontra monitor livre](../../features/notification.feature#L120) | Regra central representada | Sem monitor livre, `alocarAutomaticamente` é recusado sem notificar. | Cypress GUI: passando |
| [Notificar alunos quando monitor é removido do grupo sem realocação](../../features/notification.feature#L129) | Regra central representada | `removerMonitor` notifica a remoção só aos alunos. | Cypress GUI: passando |
| [Não notificar quando realocação de monitor falha](../../features/notification.feature#L136) | Regra central representada | `realocarMonitor` exige grupo de destino existente; a recusa preserva o monitor na origem. | Cypress GUI: passando |
| [Notificar apenas o novo monitor quando grupo não possui alunos](../../features/notification.feature#L145) | Regra central representada | `notificarGrupo` recebe só o monitor como destinatário. | Cypress GUI: passando |
| [Notificar monitor quando é designado como responsável por múltiplos grupos](../../features/notification.feature#L153) | Regra central representada | Nota de grupos: o monitor pode acumular grupos e recebe a notificação de acúmulo; o grupo anterior não muda. | Cypress GUI: passando |

## Cenários service

| Cenário | Cobertura conceitual | Evidência no modelo | Execução |
| --- | --- | --- | --- |
| [Alocar monitor ao grupo](../../features/notification.feature#L163) | Regra central representada | `alocarMonitor` e `notificarGrupo`; o histórico registra Enviado para cada destinatário. | Cypress serviço: passando |
| [Alocar monitor quando não há monitor disponível](../../features/notification.feature#L170) | Regra central representada | Recusa sem alterar o grupo nem registrar notificação. | Cypress serviço: passando |
| [Alocar monitor não cadastrado](../../features/notification.feature#L178) | Regra central representada | `alocarMonitor` exige monitor cadastrado. | Cypress serviço: passando |
| [Adicionar aluno a grupo com monitor](../../features/notification.feature#L186) | Regra central representada | `adicionarAluno` e notificação de aviso a todos os participantes. | Cypress serviço: passando |
| [Realocar monitor para grupo que já possui monitor](../../features/notification.feature#L192) | Regra central representada | `realocarMonitor` exige destino sem monitor; os dois grupos ficam como estavam. | Cypress serviço: passando |
| [Remover monitor de grupo sem monitor](../../features/notification.feature#L201) | Regra central representada | `removerMonitor` exige que o grupo tenha monitor. | Cypress serviço: passando |
| [Alocação automática do único monitor livre](../../features/notification.feature#L207) | Regra central representada | `alocarAutomaticamente`; nenhum monitor livre depois da alocação. | Cypress serviço: passando |
| [Criar grupo com alunos](../../features/notification.feature#L215) | Regra central representada | `criarGrupo` guarda os alunos, sem monitor e sem notificação. | Cypress serviço: passando |
| [Cadastrar monitor com nome e e-mail](../../features/notification.feature#L222) | Regra central representada | `cadastrarMonitor(login, nome, email)`; monitor livre. | Cypress serviço: passando |
| [Cadastrar monitor já cadastrado](../../features/notification.feature#L228) | Regra central representada | Nota de grupos: o mesmo login não é cadastrado duas vezes; os dados anteriores são preservados. | Cypress serviço: passando |
| [Adicionar aluno que já pertence ao grupo](../../features/notification.feature#L234) | Regra central representada | Alunos sem repetição no grupo; nenhuma notificação. | Cypress serviço: passando |
| [Realocar monitor que não está no grupo de origem](../../features/notification.feature#L241) | Regra central representada | `realocarMonitor` exige que o monitor esteja na origem; os dois grupos ficam como estavam. | Cypress serviço: passando |
| [Adicionar aluno que já pertence a outro grupo](../../features/notification.feature#L251) | Regra central representada | Nota de grupos: cada aluno pertence a um único grupo; nenhuma notificação. | Cypress serviço: passando |
| [Criar grupo com aluno que já pertence a outro grupo](../../features/notification.feature#L260) | Regra central representada | `criarGrupo` recusa aluno de outro grupo e não cria o grupo. | Cypress serviço: passando |

## Lacunas conhecidas

- **Falha no envio do e-mail:** a notificação registrada como Falha (destinatário sem
  e-mail) tem teste de unidade, mas nenhum cenário. Os cenários de aceitação sempre usam o
  envio simulado, que aceita todos os envios.
- **Persistência:** grupos e monitores ficam só em memória e não são gravados no arquivo de
  dados do servidor; nenhum cenário cobre a reinicialização.
- **Remover aluno, excluir ou renomear grupo:** operações ainda não existentes, sem cenário.
