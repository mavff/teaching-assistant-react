# Cobertura dos cenários de lembretes

Esta análise acompanha os 26 cenários de
[Notificacao_falta_cadastrar_alguma_nota.feature](../../features/Notificacao_falta_cadastrar_alguma_nota.feature)
em relação ao modelo Mermaid e às regras documentadas no guia.
Os quatro arquivos de `features/` foram importados da `main` do fork,
commit `4e3272dac09339637986205a3c68ef5c26e3e449`. A feature de lembretes
recebe agora somente comentários de acompanhamento do DDD; seus nomes, tags e
passos permanecem inalterados. As outras três features continuam idênticas à origem.

## Critério de completude do DDD

Os 26 cenários desta feature e suas marcações são o critério acordado para avaliar
a completude conceitual do DDD de lembretes de notas pendentes. Cada incremento
deve ser confrontado com esses cenários, atualizando as evidências e lacunas
neste documento e os comentários junto às tags.

O modelo estará completo para esta feature quando permitir explicar todos os
resultados de domínio esperados, incluindo rejeições, falhas e preservação dos
dados, com informações, responsabilidades, regras e contratos definidos.
Nos cenários GUI, essa avaliação considera o significado de negócio das ações e
dos resultados; não exige desenhar as telas no diagrama de classes.

`//ok DDD (regra central)` registra cobertura limitada e não basta para declarar
completude. Enquanto houver lacunas conceituais, classificações parciais ou
pendentes, a feature continua incompleta no modelo. Mudanças de classificação
exigem evidência no modelo ou nas regras documentadas e validação com o responsável
pela feature. A completude do modelo compartilhado também depende da análise
dos cenários das outras funcionalidades da equipe.

## Como interpretar a cobertura

- **Regra central representada:** o modelo e seus comentários explicitam a regra
  principal de domínio. Não significa que o cenário inteiro foi implementado ou testado.
- **Parcial:** existem elementos úteis, mas faltam informações, regras ou contratos
  necessários para explicar o resultado completo.
- **Pendente:** a decisão ou garantia principal do cenário ainda não está modelada.

Não há testes executáveis aprovados demonstrados para esta feature. As classificações
abaixo são uma análise conceitual, não resultados de execução de passos Cucumber.
Rejeições previstas pelos cenários são resultados corretos das regras de negócio.

## Marcações junto às tags

A feature apresenta a classificação ao lado de cada `@gui` ou `@service`:

```gherkin
@gui # //ok DDD (regra central)
@service # //parcial DDD
@service # //pendente DDD
```

O `#` inicia o comentário; `//ok`, `//parcial` e `//pendente` são marcadores
visuais dentro dele. Eles não são novas tags, não alteram passos e não indicam
resultados de execução. Cada cenário tem abaixo uma evidência ou lacuna do DDD.

`//ok DDD (regra central)` corresponde à classificação **Regra central representada**,
com as condições e limites das seções abaixo. Não há marcação de aprovação
integral dos cenários GUI ou service. As contagens são 9 GUI e 4 service com `//ok`,
7 cenários com `//parcial` e 6 com `//pendente`.

## Cenários GUI

Os oito casos de configuração classificados como regra central representada
consideram a turma, a configuração, o instante obtido do relógio pelo serviço e o
prazo representado em `Class`. Navegação, mensagens visuais e persistência não são
validadas por essa classificação. Conforme a simplificação acordada, o professor
já é o usuário do sistema; não serão acrescentados autenticação ou RBAC. O contexto
necessário para selecionar suas turmas, listar seu histórico e aplicar filtros
continua pendente. O nono caso, de consulta de uma falha, considera o registro já
fornecido no Given e sua seleção por id; os dados de destinatário e turma são
obtidos do próprio registro histórico.

| Cenário | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- |
| [Visualização do próprio histórico de notificações](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L23) | Parcial | Nome do destinatário e turma estão registrados; faltam o contexto e a operação de listagem que selecionam apenas os registros do professor atual. |
| [Visualização dos detalhes históricos de uma notificação](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L41) | Parcial | Consulta por id, nome do destinatário e turma registrada estão descritos; faltam prazo e pendências preservados como eram na tentativa. A referência ao lembrete não substitui esses dados históricos. |
| [Filtragem do próprio histórico por disciplina e turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L56) | Pendente | A turma registrada é textual; faltam os critérios de disciplina/turma e o contexto de seleção do histórico do professor para a filtragem. |
| [Visualização de uma falha no próprio histórico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L73) | Regra central representada | consultarDetalhesNotificacao usa buscar(idNotificacao) e devolve nomeDestinatario, turmaRegistrada, dataHora, motivo, resultado e descricaoFalha do registro selecionado, preservando a falha original e todos os dados. |
| [Configuração da quantidade, datas e horários dos lembretes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L86) | Regra central representada | `atualizar` valida o conjunto final, a quantidade e os agendamentos antes de alterar a configuração. |
| [Alteração de lembrete futuro sem afetar outra turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L109) | Regra central representada | `reagendar` preserva identidade e demais lembretes; configurações ficam associadas às respectivas turmas. |
| [Rejeição de quantidade de datas incompatível](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L130) | Regra central representada | Quantidade e conjunto final devem corresponder; rejeição preserva a configuração anterior. |
| [Rejeição de lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L150) | Regra central representada | Novos agendamentos ou alterações após o prazo recebido são rejeitados sem alteração parcial. |
| [Bloqueio de alteração de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L168) | Regra central representada | `reagendar` e a atualização completa preservam os lembretes Enviados. |
| [Aumento da quantidade de lembretes configurados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L187) | Regra central representada | `atualizar` admite o conjunto ampliado válido, preservando os existentes; quantidade não é um novo atributo permanente. |
| [Redução da quantidade de lembretes sem excluir envios realizados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L204) | Regra central representada | `remove` e `atualizar` preservam os enviados e validam o total final. |
| [Rejeição de criação de lembrete em data anterior à atual](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L224) | Regra central representada | A configuração rejeita novos agendamentos anteriores a `instanteAtual`, preservando o conjunto anterior. |
| [Restrição de configuração de lembretes às próprias turmas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L243) | Pendente | Falta definir como o contexto do professor identifica suas turmas para configuração; isso não pressupõe autenticação ou RBAC. |

## Cenários service

Os quatro bloqueios classificados como regra central representada consideram as
precondições fornecidas pelos respectivos Given. Nos dois bloqueios de reenvio,
o lembrete recebido já possui o estado atual Enviado. A conclusão considera
processamento sequencial; não supõe carregamento, persistência ou proteção
concorrente implementados na aplicação.

| Cenário | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- |
| [Envio de lembrete com notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L261) | Parcial | Verificação do prazo antes da tentativa, aceitação, registro e marcação Enviado estão descritos; faltam identificação das pendências, endereço do destinatário e contrato concreto de envio. |
| [Ausência de envio quando todas as notas foram cadastradas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L284) | Pendente | Falta identificar a resolução das pendências, mudar para Ignorado com motivo e registrar processamento sem criar uma tentativa de email. |
| [Identificação correta das notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L309) | Pendente | O código usa MANA/MPA/MA; os cenários usam notas numéricas, zero válido e avaliações futuras. Essa diferença ainda exige alinhamento. |
| [Envio independente de lembretes para múltiplas turmas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L326) | Parcial | A busca fica restrita à configuração da turma indicada; faltam o endereço do destinatário, as pendências e as condições completas de cada envio. |
| [Bloqueio de envio de lembrete não agendado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L347) | Regra central representada | processarAgendados consulta buscarLembretesPara na configuração da turma; lista vazia rejeita a solicitação sem email ou tentativa, preservando prazo, lembretes e histórico. |
| [Bloqueio de criação de novo lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L366) | Regra central representada | Class.prazoEncerrado verifica o instante do serviço; configurarLembretes rejeita criação com o motivo Prazo acadêmico encerrado, sem alterar configuração, enviados ou histórico nem solicitar email. |
| [Reenvio automático após falha temporária](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L385) | Parcial | Falha, sucesso posterior e um único lembrete Enviado estão descritos; faltam disparo imediato e controle dos reenvios programados. |
| [Prevenção de envio duplicado por reprocessamento de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L407) | Regra central representada | `jaFoiEnviado()` faz `processar` encerrar sem novo email, notificação de tentativa ou reenvio; preserva lembrete e histórico. |
| [Bloqueio de novo reenvio após sucesso de tentativa anterior](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L425) | Regra central representada | O mesmo bloqueio preserva as duas notificações anteriores e impede uma terceira tentativa quando o estado recebido já é Enviado. |
| [Reenvio progressivo após falhas persistentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L443) | Parcial | Cada falha pode ser registrada sem marcar o lembrete como enviado; faltam progressão de intervalos e programação das próximas tentativas. |
| [Prevenção de envio duplicado por processamento concorrente](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L463) | Pendente | Duas execuções podem observar o estado ainda não enviado. Consulta e marcação, isoladamente, não garantem um único envio ou registro. |
| [Cancelamento de reenvio após resolução das pendências](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L479) | Pendente | Faltam decisão de cancelamento, motivo, identificação das pendências resolvidas e retirada dos reenvios. Rejeitar marcação de Cancelado não efetua esse cancelamento. |
| [Interrupção dos reenvios após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L501) | Parcial | processar verifica o prazo antes da tentativa e retorna Prazo acadêmico encerrado, sem email ou novo registro, preservando o estado e o histórico; faltam transição para Cancelado, preservação do motivo e interrupção dos reenvios programados. |

Resultado da análise: 13 regras centrais representadas (9 GUI e 4 service),
7 cenários parciais e 6 pendentes. Isso não equivale a 13 cenários completos passando.

## Percursos do incremento de prazo e busca por agendamento

- **Criação após o prazo:** Class fornece 31/08/2026 às 23:59; o serviço obtém
  01/09/2026 às 08:00 do relógio. A consulta retorna verdadeiro e a criação é
  rejeitada com o motivo do cenário, preservando o enviado de 25/08 e o histórico.
- **Agendamento inexistente:** a configuração contém somente 20/08 e 25/08;
  buscar 27/08 às 09:00 retorna lista vazia. O serviço rejeita a solicitação,
  preservando os dois enviados, o prazo e o histórico, sem nova tentativa.
- **Consultas sem efeitos:** antes do prazo ou exatamente nele, prazoEncerrado
  retorna falso; a busca pode retornar zero, um ou vários lembretes da mesma
  turma, preservando seus estados. Nenhuma consulta solicita email.
- **Reprocessamento preservado:** se a busca encontrar um Enviado, processar
  aplica jaFoiEnviado e mantém os registros anteriores. Uma solicitação atrasada
  usa o agendamento informado; a busca não o substitui pelo horário do relógio.
- **Configuração preservada:** continuam as validações de quantidade, datas,
  preservação de enviados e isolamento entre turmas dos oito casos GUI.

Os percursos são uma verificação conceitual das regras, sem implementação na
aplicação. A obtenção automática de vencidos, o disparo dessa entrada, os estados
Ignorado/Cancelado, as pendências, os reenvios e a concorrência permanecem abertos.

## Percursos do bloqueio por prazo no processamento

- **Reenvio após o prazo:** com prazo em 31/08/2026 às 23:59 e processamento em
  01/09/2026 às 00:00, processar verifica o prazo antes de EmailSender. Retorna
  Prazo acadêmico encerrado, sem email ou tentativa, preservando as três falhas
  anteriores e o identificador, agendamento e estado do lembrete.
- **Primeira tentativa após o prazo:** aplicar o mesmo bloqueio, sem alterar os
  dados do lembrete, da turma ou do histórico.
- **Antes ou exatamente no prazo:** a consulta retorna falso e o serviço continua
  com as demais verificações. Isso não comprova a identificação das pendências
  nem autoriza automaticamente o envio.
- **Enviado após o prazo:** o bloqueio de reprocessamento continua sendo a primeira
  verificação; não há nova tentativa ou mudança de Enviado para outro estado.

O cenário de interrupção passou de Pendente para Parcial. Retornar o motivo não
preserva uma explicação histórica nem muda o lembrete para Cancelado ou encerra
agendamentos existentes. Por isso ele ainda não recebe `//ok`. O incremento não
acrescenta atributos, operações ou relações; os percursos são conceituais.

## Percursos da consulta de uma falha no histórico

- **Dados do cenário:** o id selecionado encontra o registro de Paulo Borba,
  turma 2026.2 de ESS, em 23/08/2026 às 09:00. O serviço devolve Notas pendentes,
  Falha e Tempo limite excedido no envio, além do nome, turma e data/hora registrados.
- **Seleção inequívoca:** uma falha e um reenvio imediato têm ids distintos,
  mesmo que apareçam com igual data e horário. A busca retorna a tentativa escolhida.
- **Preservação após sucesso:** registrar outra notificação Enviado não modifica
  o id, o resultado, o contexto ou a descrição da falha anterior.
- **Contexto preservado:** alterações posteriores na identificação atual da turma
  ou no nome do destinatário não alteram os valores da notificação registrada.
- **Ausência e leitura:** um id inexistente indica ausência; consultas não criam
  registros, alteram estados, solicitam email ou executam reenvios.

Apenas o cenário de visualização de falha muda de Parcial para Regra central
representada. A listagem do próprio histórico e os detalhes históricos com prazo
e pendências permanecem parciais. Esses percursos consideram os dados do Given,
sem modelar autenticação, RBAC ou a navegação da interface.

## Verificação de descoberta e execução

O runner do projeto em `client/cucumber.js` aponta apenas para
`client/src/features/**/*.feature`. Importar `features/` na raiz torna os arquivos
visíveis nesta branch, mas não os inclui automaticamente nesse runner.
Os passos existentes em `client/src/step-definitions/` tratam de cadastro de alunos.
Também não foram encontradas implementações de Lembrete, Notificacao ou EmailSender
em `client/src/` e `server/src/`.

Foi feita uma verificação com Cucumber.js 12.2.0 instalado isoladamente em `/tmp`,
carregando os passos reais existentes em modo `--dry-run`, com publicação de
relatórios desabilitada. Nenhum passo ou hook foi executado na aplicação.
As dependências e configurações do projeto permaneceram inalteradas.

| Arquivo importado | Resultado do dry-run sobre o original da main, antes das marcações |
| --- | --- |
| `Notificacao_falta_cadastrar_alguma_nota.feature` | Erro de parsing na linha 234: o separador SERVICE não é um comentário Gherkin. |
| `atualizacao_notas.feature` | Erro de parsing desde a linha 1: os cenários não estão sob um cabeçalho Feature. |
| `desempenho.feature` | Erro de parsing no final do arquivo: o marcador de três crases é interpretado como início de doc string sem fechamento. |
| `notification.feature` | 10 cenários descobertos, com 54 passos undefined; não houve execução funcional. |

Para separar o problema de sintaxe da ausência de passos, foi usada uma cópia
temporária da feature de lembretes, apenas comentando os dois separadores de
seção; os textos de todos os passos foram preservados. Nessa cópia, foram
descobertos os 26 cenários: todos possuem passos undefined, totalizando 341
passos sem definição. As 14 definições existentes do projeto foram carregadas;
13 hooks Before e 13 After foram ignorados pelo modo dry-run.

O código de saída zero de um dry-run não comprova aprovação funcional. Nenhum
dos 26 cenários foi demonstrado como teste executável passando nesta verificação.
As marcações de acompanhamento acrescentam apenas comentários à feature de
lembretes e não corrigem os separadores de seção. Seus passos permanecem idênticos
aos da main, assim como o conteúdo completo das outras três features. As correções
de sintaxe, a integração do runner e a implementação dos passos ficam para trabalho posterior.
As três outras features foram verificadas quanto à descoberta, sem avaliação
de sua cobertura de negócio neste modelo de lembretes.
