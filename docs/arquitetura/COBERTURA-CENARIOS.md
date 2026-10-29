# Cobertura dos cenários de lembretes

Esta análise acompanha os 25 cenários de
[Notificacao_falta_cadastrar_alguma_nota.feature](../../features/Notificacao_falta_cadastrar_alguma_nota.feature)
em relação ao modelo Mermaid e às regras documentadas no guia.
Os quatro arquivos de `features/` foram importados da `main` do fork,
commit `4e3272dac09339637986205a3c68ef5c26e3e449`. A feature de lembretes
recebeu comentários de acompanhamento do DDD e teve o cenário
**Restrição de configuração de lembretes às próprias turmas** retirado por decisão
do responsável pela feature: a funcionalidade será utilizada por um único professor,
com suas turmas disponíveis, sem controle de acesso entre professores.
O cenário de listagem foi ajustado, com aprovação do responsável, para
**Visualização do histórico de notificações**: começa na tela Turmas e preserva
as duas notificações de Paulo, sem autenticação ou registros de outros professores.
Nos outros 11 cenários GUI, a precondição de autenticação foi retirada com
aprovação do responsável. Cada um começa explicitamente com o professor Paulo
Borba na tela inicial validada, preservando a turma e os filtros indicados.
Os nomes, tags e demais passos desses cenários foram mantidos. Os nomes dos
13 cenários service permanecem inalterados. No cenário de ausência de envio,
o Then do lembrete futuro de 29/08 foi corrigido, com aprovação, para preservar
Não enviado, igual ao Given. Os demais passos service permanecem iguais;
as marcações conceituais acompanham os incrementos aprovados do modelo.
As outras três features continuam idênticas à origem.

## Critério de completude do DDD

Os 25 cenários desta feature e suas marcações são o critério acordado para avaliar
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
integral dos cenários GUI ou service. As contagens são 12 GUI e 6 service com `//ok`,
5 cenários com `//parcial` e 2 com `//pendente`, totalizando 12 GUI e 13 service.

## Cenários GUI

Os oito casos de configuração classificados como regra central representada
consideram a turma, a configuração, o instante obtido do relógio pelo serviço e o
prazo representado em `Class`. A leitura da configuração é coordenada por
Services.consultarConfiguracaoLembretes, Classes.buscar,
Class.obterConfiguracaoLembretes e ConfiguracaoLembretes.listar, pelas relações
já desenhadas. Ela devolve os lembretes, o prazo e a quantidade derivada da lista.
Services.configurarLembretes recebe turma, quantidade e a proposta do conjunto final,
e retorna a confirmação de sucesso ou o motivo da rejeição definido nos cenários.
Navegação, mensagens visuais e persistência não são
validadas por essa classificação. Conforme a simplificação acordada, a funcionalidade
é utilizada por um único professor, com suas turmas disponíveis, sem autenticação
ou controle de acesso entre professores. A listagem coordena consultarHistorico
e listar pelas relações existentes do servidor. A consulta de uma falha considera
o registro já fornecido no Given e sua seleção por id; os dados de destinatário e
turma são obtidos do próprio registro histórico. A filtragem combina disciplina e
turma usando a identificação já existente em turmaRegistrada. As pendências históricas
e o prazo informado no aviso estão preservados em Notificacao e são devolvidos
pela consulta de detalhes existente. As telas iniciais dos 12 cenários GUI foram
validadas com o responsável e estão explícitas nas precondições, sem usuário ou
senha: dois começam em Turmas, três em Histórico de notificações e sete em
Configuração de lembretes da turma 2026.2 de ESS. As ações e resultados seguintes
foram preservados, incluindo a abertura dos detalhes ou da configuração quando
prevista no respectivo cenário.

| Cenário | Tela inicial aprovada | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- | --- |
| [Visualização do histórico de notificações](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L23) | Turmas | Regra central representada | Services.consultarHistorico coordena HistoricoNotificacoes.listar pela associação existente; a composição com Notificacao fornece as duas tentativas e seus dados registrados, sem seleção entre professores ou alteração do histórico. |
| [Visualização dos detalhes históricos de uma notificação](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L36) | Histórico de notificações | Regra central representada | Services.consultarDetalhesNotificacao usa buscar(idNotificacao) e devolve os dados da tentativa, incluindo pendenciasRegistradas e prazoRegistrado. NotificacaoService copia o prazo da Class ao compor o registro, pelas relações existentes. O cadastro posterior das notas preserva as pendências históricas. |
| [Filtragem do próprio histórico por disciplina e turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L50) | Histórico de notificações — sem filtros aplicados | Regra central representada | Services.filtrarHistorico coordena HistoricoNotificacoes.filtrar pelas relações existentes; turmaRegistrada já identifica disciplina e turma. A seleção combina os dois critérios, exclui ESS de outro semestre e outras disciplinas do resultado e preserva todos os registros. |
| [Visualização de uma falha no próprio histórico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L66) | Histórico de notificações | Regra central representada | consultarDetalhesNotificacao usa buscar(idNotificacao) e devolve nomeDestinatario, turmaRegistrada, dataHora, motivo, resultado e descricaoFalha do registro selecionado, preservando a falha original e todos os dados. |
| [Configuração da quantidade, datas e horários dos lembretes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L78) | Turmas — turma 2026.2 de ESS disponível | Regra central representada | `atualizar` valida o conjunto final, a quantidade e os agendamentos antes de alterar a configuração. |
| [Alteração de lembrete futuro sem afetar outra turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L100) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `reagendar` preserva identidade e demais lembretes; configurações ficam associadas às respectivas turmas. |
| [Rejeição de quantidade de datas incompatível](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L120) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | Quantidade e conjunto final devem corresponder; rejeição preserva a configuração anterior. |
| [Rejeição de lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L139) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | Novos agendamentos ou alterações após o prazo recebido são rejeitados sem alteração parcial. |
| [Bloqueio de alteração de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L156) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `reagendar` e a atualização completa preservam os lembretes Enviados. |
| [Aumento da quantidade de lembretes configurados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L174) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `atualizar` admite o conjunto ampliado válido, preservando os existentes; quantidade não é um novo atributo permanente. |
| [Redução da quantidade de lembretes sem excluir envios realizados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L190) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `remove` e `atualizar` preservam os enviados e validam o total final. |
| [Rejeição de criação de lembrete em data anterior à atual](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L209) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | A configuração rejeita novos agendamentos anteriores a `instanteAtual`, preservando o conjunto anterior. |

## Cenários service

Os quatro bloqueios classificados como regra central representada consideram as
precondições fornecidas pelos respectivos Given. Nos dois bloqueios de reenvio,
o lembrete recebido já possui o estado atual Enviado. A conclusão considera
processamento sequencial; não supõe carregamento, persistência ou proteção
concorrente implementados na aplicação.

| Cenário | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- |
| [Envio de lembrete com notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L230) | Parcial | Pendências, prazo, emailProfessor, registro, marcação Enviado e contrato de EmailSender estão representados. O comentário complementar sobre processar foi dispensado pelo responsável e deixa de ser uma alteração pendente. A classificação foi preservada até a conclusão da revisão do cenário. |
| [Ausência de envio quando todas as notas foram cadastradas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L253) | Regra central representada | Consulta sem pendências permite ignorar o Lembrete e registrar Notificacao Ignorado pelos métodos existentes, sem email ou nova tentativa. As consultas de tentativas consideram apenas Enviado/Falha, preservando a última tentativa de 20/08. O Then aprovado preserva Não enviado para o lembrete futuro de 29/08, igual ao Given. |
| [Identificação correta das notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L278) | Regra central representada | Class.identificarPendencias percorre as matrículas e seus registros por Enrolment.listarAvaliacoes. Evaluation.dataAvaliacao permite excluir futuras; buscarNota distingue nota vazia de zero válido. Os registros já existem antes da nota, e a consulta devolve apenas a pendência de João na prova realizada, preservando os dados. |
| [Envio independente de lembretes para múltiplas turmas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L295) | Parcial | Busca e pendências ficam restritas à turma indicada, com o mesmo emailProfessor e contrato de EmailSender. O comentário complementar sobre processar foi dispensado pelo responsável e deixa de ser uma alteração pendente. A classificação foi preservada até a conclusão da revisão do cenário. |
| [Bloqueio de envio de lembrete não agendado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L316) | Regra central representada | processarAgendados consulta buscarLembretesPara na configuração da turma; lista vazia rejeita a solicitação sem email ou tentativa, preservando prazo, lembretes e histórico. |
| [Bloqueio de criação de novo lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L335) | Regra central representada | Class.prazoEncerrado verifica o instante do serviço; configurarLembretes rejeita criação com o motivo Prazo acadêmico encerrado, sem alterar configuração, enviados ou histórico nem solicitar email. |
| [Reenvio automático após falha temporária](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L354) | Parcial | Falha, sucesso posterior e um único lembrete Enviado estão descritos; faltam disparo imediato e controle dos reenvios programados. |
| [Prevenção de envio duplicado por reprocessamento de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L376) | Regra central representada | `jaFoiEnviado()` faz `processar` encerrar sem novo email, notificação de tentativa ou reenvio; preserva lembrete e histórico. |
| [Bloqueio de novo reenvio após sucesso de tentativa anterior](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L394) | Regra central representada | O mesmo bloqueio preserva as duas notificações anteriores e impede uma terceira tentativa quando o estado recebido já é Enviado. |
| [Reenvio progressivo após falhas persistentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L412) | Parcial | Cada falha pode ser registrada sem marcar o lembrete como enviado; faltam progressão de intervalos e programação das próximas tentativas. |
| [Prevenção de envio duplicado por processamento concorrente](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L432) | Pendente | Duas execuções podem observar o estado ainda não enviado. Consulta e marcação, isoladamente, não garantem um único envio ou registro. |
| [Cancelamento de reenvio após resolução das pendências](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L448) | Pendente | A consulta das notas atuais pode identificar uma lista vazia; faltam a decisão de cancelar, a transição para Cancelado com motivo e a retirada dos reenvios. Rejeitar marcação de Cancelado não efetua esse cancelamento. |
| [Interrupção dos reenvios após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L470) | Parcial | processar verifica o prazo antes da tentativa e retorna Prazo acadêmico encerrado, sem email ou novo registro, preservando o estado e o histórico; faltam transição para Cancelado, preservação do motivo e interrupção dos reenvios programados. |

Resultado da análise: 18 regras centrais representadas (12 GUI e 6 service),
5 cenários parciais e 2 pendentes. Isso não equivale a 18 cenários completos passando.

## Nome do serviço compartilhado

O serviço de processamento passa a se chamar **NotificaçãoService**
(`NotificacaoService` na fonte). A nomenclatura foi aprovada para que a equipe
compartilhe o serviço entre os diferentes tipos de notificação. Os atributos,
métodos, relações e classificações dos cenários são preservados. As operações
atuais tratam lembretes; a renomeação não define o processamento dos outros tipos.

## Lembrete ignorado quando não há notas pendentes

Foram aprovados `Lembrete.ignorar(motivo)` e o atributo `Lembrete.motivo`.
No cenário de todas as notas cadastradas, a consulta atual das pendências retorna
uma lista vazia. O serviço chama ignorar com o motivo `Nenhuma nota pendente`,
pela seta existente NotificacaoService → Lembrete, sem solicitar email nem registrar
uma Notificacao de tentativa. Não são acrescentados métodos em NotificacaoService
ou novas relações.

O método altera apenas estado e motivo do lembrete: ele passa para Ignorado,
preservando id, data e horário. A operação não consulta notas ou relógio, envia
email ou registra histórico. O motivo do Lembrete justifica ter sido ignorado;
essa justificativa também é guardada em Notificacao.motivo no registro Ignorado.
Nas tentativas de envio, Notificacao.motivo continua representando o propósito do aviso.

O lembrete de 25/08 às 09:00 é ignorado, sem contar como Enviado. O lembrete
enviado de 20/08, suas notificações, o lembrete futuro de 29/08, o prazo e os
demais dados são preservados. O nome e os demais passos Gherkin são preservados;
a única correção aprovada no cenário ajusta o Then do lembrete futuro.

O cenário passa para Regra central representada: a transição, a decisão de não
enviar e o registro do processamento Ignorado estão representados, e a correção
aprovada preserva Não enviado para o lembrete de 29/08 no Given e no Then.
Esse lembrete futuro não foi processado. Não há alteração no DDD ou no PNG,
unificação geral de estados ou definição de cancelamento de reenvios.

A proposta de acrescentar `registrarProcessamento`, coleção ou classe de registro
foi substituída pelo reaproveitamento aprovado de Notificacao e dos métodos
existentes registrar e listar, detalhado a seguir.

## Reaproveitamento de Notificacao para o processamento Ignorado

Notificacao passa a representar o resultado de um processamento, que pode ser
Enviado, Falha ou Ignorado. Somente Enviado e Falha representam tentativas de
envio de email. O resultado Ignorado registra que o lembrete foi verificado e
dispensado porque não há notas pendentes, sem acrescentar campo, método, classe,
coleção ou relação. Uma anotação no PNG torna essa distinção visível.

| Campo existente | Registro Ignorado do cenário |
| --- | --- |
| resultado | Ignorado |
| motivo | Nenhuma nota pendente |
| descricaoFalha | Vazio |
| pendenciasRegistradas | Lista vazia |

O registro recebe seu próprio id e dataHora do processamento, preserva o professor,
a turma e seu prazo naquele momento e é acrescentado por
HistoricoNotificacoes.registrar(Notificacao), pela relação já existente com
NotificacaoService. Lembrete.ignorar continua alterando apenas o próprio lembrete.

HistoricoNotificacoes.listar retorna os três resultados. Nas consultas de
tentativas, selecionar somente Enviado e Falha pelo resultado. No cenário, o
processamento de 25/08 fica registrado como Ignorado, sem email ou nova tentativa;
a última tentativa continua sendo a de 20/08 com resultado Enviado. Os registros
anteriores e o lembrete futuro são preservados. Filtrar e buscar reutilizam os
dados históricos existentes, sem alterar registros.

O reaproveitamento preservou os nomes, passos, tags e classificações dos cenários.
A correção aprovada do Then de 29/08 encerra a divergência de estado e permite
classificar a ausência de envio como Regra central representada. Os demais
cenários preservam suas classificações; cancelamento, reenvios e concorrência
continuam em revisão.

## Destinatário dos lembretes

O atributo aprovado `NotificacaoService.emailProfessor` representa a configuração do
endereço do único professor, disponível antes do processamento automático.
`processar(Lembrete)` utiliza esse endereço como destinatário ao solicitar envio
a `EmailSender`, pela seta já existente. As turmas utilizam o mesmo destinatário.
No cenário de envio, o valor configurado é `paulo.borba@example.com`.

Este incremento acrescenta apenas esse atributo ao diagrama; não acrescenta
nomeProfessor, entidade Professor, operação de cadastro ou relação. Os nomes e
passos Gherkin permanecem iguais. Os dois cenários de envio continuam Parciais:
o contrato de envio foi detalhado no incremento de EmailSender abaixo. O comentário
complementar sobre processar foi dispensado pelo responsável e não será exigido
como alteração estrutural ou pendência adicional.

## Contrato aprovado de EmailSender

`EmailSender` recebe a operação `send(destinatario, assunto, conteudo)`. O retorno
informa aceitação pelo serviço de email ou falha acompanhada da descrição do erro.
Aceitação não confirma entrega ou leitura. O método `send(String[])` e a relação
com GradeNotification são preservados.

Este incremento não altera NotificacaoService ou as setas. O responsável dispensou
a proposta de comentário complementar sobre `processar(Lembrete)`: ela não
acrescentaria método, atributo ou seta. Os dois cenários de envio permanecem
Parciais até a conclusão da revisão conceitual; essa decisão não altera suas
classificações nem demonstra execução de testes.

## Responsabilidades e regra da identificação de pendências

- **Métodos acrescentados:** Class.identificarPendencias(instanteAtual) e
  Enrolment.buscarNota(avaliacao), nas respectivas classes existentes, seguidos
  de Enrolment.listarAvaliacoes() e Evaluation.dataAvaliacao no incremento aprovado.
- **Organização preservada:** as notas pertencem aos alunos em suas matrículas,
  no caminho Class, Enrolment e Evaluation. Class coordena a consulta das matrículas
  sem passar a armazenar as notas individuais.
- **Coordenação aprovada:** o método processar(Lembrete), já existente em
  NotificacaoService, consulta as pendências na Class localizada por Classes. A chamada
  ocorre depois dos bloqueios de Enviado e prazo e antes de uma tentativa de email,
  aproveitando o instante atual já obtido pelo serviço.
- **Dados aprovados:** cada matrícula já contém os registros das avaliações com
  nota inicialmente vazia, conforme a opção A confirmada pelo responsável.
  listarAvaliacoes inclui esses registros; dataAvaliacao informa a data da avaliação.
- **Limites do incremento:** Services, cliente e todas as relações permanecem
  inalterados. Evaluation mantém goal e grade e recebe apenas dataAvaliacao.
  Não é acrescentada a classe AvaliacaoDaTurma nem uma
  operação em Services para consulta pela GUI. O disparo automático será tratado
  na revisão do agendamento.

Class consulta as avaliações de cada matrícula e usa o instante recebido para
excluir as futuras. Nas avaliações já realizadas, uma nota vazia identifica
pendência e zero é uma nota cadastrada válida. Identificar é uma consulta que
preserva os dados e não solicita email ou registra tentativa de envio.

| Registro do cenário, consultado em 25/08/2026 às 09:00 | Resultado |
| --- | --- |
| João sem nota na prova realizada em 20/08/2026 às 14:00 | Incluir essa pendência |
| Maria com nota 0,0 na mesma prova | Não incluir pendência |
| João sem nota no projeto previsto para 28/08/2026 às 14:00 | Excluir a avaliação futura |
| Maria sem nota no mesmo projeto futuro | Excluir a avaliação futura |

O cenário passa de Pendente para Regra central representada. A lista
pendenciasRegistradas de uma Notificacao antiga preserva o histórico e não
substitui a consulta das notas atuais. Os nomes e passos Gherkin são preservados;
o disparo automático, o envio e as transições de Ignorado e Cancelado seguem
para os respectivos cenários ainda em revisão.

## Percurso da consulta da configuração de lembretes

- **Métodos aprovados:** Services.consultarConfiguracaoLembretes(turma),
  Classes.buscar(turma), Class.obterConfiguracaoLembretes() e
  ConfiguracaoLembretes.listar() ficam visíveis nas respectivas classes.
- **Acesso:** Services localiza a Class selecionada por Classes e obtém sua
  configuração. A configuração lista seus lembretes pelas relações já existentes.
- **Dados apresentados:** devolver id, data, horário e estado de cada lembrete,
  o prazoAcademico da mesma Class e a quantidade calculada pelo total da lista,
  incluindo os lembretes Enviados. Não se acrescenta quantidade como atributo.
- **Configuração inicial:** sem lembretes, retornar lista vazia e quantidade zero,
  preservando o prazo da turma e as configurações das demais turmas.
- **Preservação:** a consulta não modifica registros, consulta o relógio, solicita
  email ou processa lembretes. Após uma atualização aceita, apresenta o conjunto
  salvo; após uma rejeição, continua apresentando o conjunto anterior preservado.

Essa consulta completa o percurso de leitura utilizado pelos oito cenários GUI
de configuração, alteração, aumento, redução e rejeições. O incremento acrescenta
somente quatro métodos no desenho; relações, atributos, cliente, Email Service,
Interface e todos os nomes, tags e passos Gherkin permanecem inalterados.
Os parâmetros e retornos de configurarLembretes foram detalhados no incremento
descrito a seguir. A retirada de autenticação foi aprovada posteriormente, com
as telas iniciais registradas na matriz GUI. As classificações não mudam neste
incremento.

## Percurso do salvamento da configuração

Services.configurarLembretes(turma, quantidade, lembretesPropostos) recebe os dados
da edição e retorna uma mensagem String. A turma é localizada por Classes.buscar;
Class.obterConfiguracaoLembretes permite acessar a configuração. O serviço obtém
o instante atual do relógio e o prazo da mesma Class para coordenar atualizar.
As associações existentes permitem todo esse percurso.

| Situação dos cenários GUI | Retorno esperado |
| --- | --- |
| Criar, reagendar, aumentar ou reduzir com uma proposta válida | Configuração salva com sucesso |
| Solicitar três lembretes e deixar o terceiro sem data e horário | Selecione exatamente 3 datas e horários |
| Agendamento proposto posterior ao prazo acadêmico | Data posterior ao prazo acadêmico |
| Tentar alterar um lembrete Enviado | Lembretes enviados não podem ser alterados |
| Agendamento proposto anterior ao instante atual | Não é possível agendar lembretes em datas anteriores à data atual |

O número na mensagem de quantidade corresponde ao total solicitado. Uma rejeição
preserva toda a configuração anterior, os identificadores, os estados, o prazo
da turma e o histórico. Uma proposta válida preserva os Enviados, as outras turmas
e o histórico, aplicando integralmente as regras já descritas em atualizar.
A consulta da configuração permite apresentar o conjunto salvo após o resultado.

A rejeição existente de criação de novo lembrete após o prazo continua com o
motivo Prazo acadêmico encerrado. Salvar não solicita email nem processa lembretes.
O incremento altera somente a assinatura de configurarLembretes no desenho;
atributos, relações, demais métodos e todos os cenários Gherkin são preservados.
As classificações permanecem iguais. Posteriormente, a retirada de autenticação
foi aprovada com a tela inicial explícita em cada cenário GUI, conforme a matriz.

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
aplicação. O estado Ignorado, seu registro e a consulta de pendências foram
aprovados nos incrementos descritos acima. A obtenção automática de vencidos,
o disparo dessa entrada, o cancelamento, os reenvios e a concorrência permanecem abertos.

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

No incremento da consulta de falha, esse cenário mudou de Parcial para Regra
central representada. Os detalhes históricos têm as pendências e o prazo
preservados nos incrementos descritos adiante. A listagem foi completada no
incremento a seguir. Esses percursos
consideram os dados do Given, sem modelar autenticação, RBAC ou a navegação da interface.

## Percurso da listagem do histórico

- **Contexto aprovado:** um único professor utiliza a funcionalidade com suas turmas
  disponíveis. O cenário começa na tela Turmas e não exige autenticação nem seleção
  de notificações entre professores.
- **Métodos e relações:** Services.consultarHistorico acessa HistoricoNotificacoes
  pela seta já existente e coordena listar. A composição com Notificacao fornece
  os registros do histórico. listar está visível na classe do servidor; cliente,
  Email Service, Interface e suas relações permanecem inalterados.
- **Dados apresentados:** retornar a tentativa da turma 2026.2 de ESS, em
  25/08/2026 às 09:00, com motivo Notas pendentes e resultado Enviado, e a da turma
  2026.2 de Introdução a Programação, em 27/08/2026 às 09:00, com o mesmo motivo
  e resultado Falha. Os dados são os registrados nas respectivas notificações.
- **Preservação:** a consulta mantém todos os registros, seus identificadores e
  estados, sem solicitar email ou reenvio.

A regra central do cenário de listagem passa de Parcial para representada.
Esta é uma validação conceitual do domínio; não acrescenta métodos de navegação
às classes do cliente. A filtragem, as pendências históricas e o prazo registrado
nos detalhes são descritos a seguir.

## Percurso da filtragem do histórico

- **Métodos aprovados:** Services.filtrarHistorico(disciplina, turma) coordena
  HistoricoNotificacoes.filtrar(disciplina, turma). A associação entre as classes
  e a composição com Notificacao já existem; não são acrescentadas relações.
- **Dados existentes:** turmaRegistrada identifica a turma e sua disciplina,
  como 2026.2 de ESS. Não se acrescenta disciplinaRegistrada nem outro atributo
  em Notificacao. O filtro usa os dados históricos registrados.
- **Resultado do cenário:** selecionando ESS e 2026.2 de ESS, retornar a notificação
  de 25/08/2026 às 09:00, com motivo Notas pendentes e resultado Enviado. As
  notificações de 2026.1 de ESS e 2026.2 de Introdução a Programação ficam fora
  desse resultado, mas permanecem no histórico com todos os seus dados.
- **Preservação:** a filtragem mantém identificadores, datas, motivos, resultados
  e demais dados. A consulta não envia email nem executa reenvio.

A regra central de filtragem passa de Pendente para representada. As classes do
cliente, Email Service, Interface, Notificacao e todas as relações permanecem
inalteradas. No incremento da filtragem, o nome e os passos do cenário Gherkin
foram preservados. Depois, a autenticação foi retirada com aprovação do responsável:
o cenário começa com o professor no Histórico de notificações, sem filtros aplicados.

## Percurso das pendências históricas nos detalhes

- **Dado aprovado:** Notificacao acrescenta apenas pendenciasRegistradas, uma
  lista dos alunos e avaliações sem nota informados naquela tentativa.
- **Conteúdo preservado:** a notificação de 25/08/2026 às 09:00 registra João da
  Silva - Prova 2 e Maria Souza - Projeto 1. O cadastro das notas 8,0 e 9,0 em
  26/08/2026 às 10:00 não altera essa lista anterior.
- **Consulta existente:** Services.consultarDetalhesNotificacao coordena
  HistoricoNotificacoes.buscar(idNotificacao) e devolve também a lista registrada
  na tentativa selecionada. Não recalcula as pendências pelas notas atuais.
- **Tentativas distintas:** cada novo registro preserva sua própria lista; o
  registro de um reenvio não modifica a lista da tentativa anterior.

O único acréscimo no desenho é o atributo pendenciasRegistradas em Notificacao.
Os métodos e relações existentes atendem à consulta. Cliente, Email Service,
Interface, demais classes, nomes e passos dos cenários permanecem inalterados.
O prazo registrado foi acrescentado em um incremento separado, aprovado e
descrito a seguir.

## Percurso do prazo registrado nos detalhes

- **Dado aprovado:** Notificacao acrescenta prazoRegistrado, com o prazo acadêmico
  informado naquela tentativa. Class.prazoAcademico permanece como prazo oficial
  utilizado na configuração e no processamento dos lembretes.
- **Origem do valor:** NotificacaoService acessa a mesma Class por Classes, como já
  previsto no processamento, e copia seu prazo ao compor a Notificacao registrada
  em HistoricoNotificacoes. Todas essas relações já estão desenhadas.
- **Resultado do cenário:** a consulta da notificação de 25/08/2026 às 09:00
  devolve prazoRegistrado de 31/08/2026 às 23:59 e as pendências João da Silva -
  Prova 2 e Maria Souza - Projeto 1. A data/hora da tentativa continua distinta
  da data limite para cadastrar as notas.
- **Consulta e preservação:** Services.consultarDetalhesNotificacao usa o método
  buscar(idNotificacao) existente e devolve também prazoRegistrado. Registrar
  outra tentativa preserva o prazo e os demais dados dos registros anteriores.

O único acréscimo deste incremento no desenho é prazoRegistrado em Notificacao;
os métodos e as relações existentes são mantidos. O cenário de detalhes passa
de Parcial para Regra central representada. Seus nomes e passos permanecem
inalterados; esta classificação é conceitual e não comprova execução da interface.

## Verificação de descoberta e execução (registro histórico)

Os resultados desta seção referem-se à versão anterior com 26 cenários, antes da
retirada aprovada do cenário de restrição às próprias turmas. Não foram refeitos
nesta revisão conceitual e não representam uma verificação dos 25 cenários atuais.

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
Na versão então verificada, as marcações de acompanhamento acrescentavam apenas
comentários à feature de lembretes e não corrigiam os separadores de seção.
Seus passos permaneciam idênticos aos da main, assim como o conteúdo completo
das outras três features. As correções
de sintaxe, a integração do runner e a implementação dos passos ficam para trabalho posterior.
As três outras features foram verificadas quanto à descoberta, sem avaliação
de sua cobertura de negócio neste modelo de lembretes.
