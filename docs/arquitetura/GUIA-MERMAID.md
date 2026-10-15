# Guia de edição do modelo DDD em Mermaid

A equipe mantém um único modelo, construído progressivamente a partir da base
apresentada pelo professor. Cada integrante pode propor os conceitos necessários
à sua feature e discutir sua integração com o restante do modelo.

## 1. Qual arquivo usar

| Arquivo | Uso |
| --- | --- |
| [modelo-ddd.mmd](modelo-ddd.mmd) | Fonte oficial do diagrama. Contém somente código Mermaid, incluindo configuração e comentários. |
| [GUIA-MERMAID.md](GUIA-MERMAID.md) | Este guia: instruções e exemplos isolados. |
| [ddd-notificacoes-incremental.png](ddd-notificacoes-incremental.png) | Imagem exportada para visualização rápida. |
| [exportar-modelo-ddd.py](../../scripts/exportar-modelo-ddd.py) | Exporta o Mermaid e acrescenta a legenda abaixo do diagrama no PNG. |

Edite o `.mmd` para modificar o modelo. O PNG precisa ser atualizado depois das
mudanças aprovadas; editar a imagem não modifica o código. O arquivo `.mmd` pode
ser aberto em qualquer editor de texto. No GitHub, ele pode ser consultado como
texto; use o Mermaid Live para renderizar o código completo.

## 2. Abrir no Mermaid Live

1. Abra [Mermaid Live Editor](https://mermaid.live/).
2. Se aparecer uma oferta de outro produto, escolha **Stay on mermaid.live**.
3. Abra `modelo-ddd.mmd` no editor de texto ou no GitHub e copie todo o conteúdo.
4. No painel **Code** do Mermaid Live, selecione todo o exemplo inicial e
   substitua-o pelo conteúdo copiado.
5. Inclua o cabeçalho entre `---`, o `classDiagram` e todas as linhas seguintes.
   O arquivo já está pronto: não acrescente delimitadores Markdown como
   ` ```mermaid ` ou ` ``` `.
6. Confira o desenho no painel de visualização. Use os controles de zoom e
   **Reset view** para navegar pelo diagrama.

Alterar o código no Mermaid Live não atualiza o repositório automaticamente.
Depois de editar, copie todo o código de volta para `modelo-ddd.mmd` na sua branch.
Uma URL compartilhada do editor também não substitui o arquivo versionado no Git.

## 3. Entender as partes do arquivo

- O cabeçalho `config`, entre `---`, define aparência e espaçamento.
- `classDiagram` define o tipo de diagrama; `direction LR` organiza-o da
  esquerda para a direita.
- `namespace Cliente` reúne os módulos do cliente, como configuração e histórico.
- `namespace Servidor` reúne os objetos e serviços do servidor.
- As linhas depois das declarações representam as relações entre os elementos.
- `style` e `note` acrescentam destaques e anotações.
- Linhas iniciadas por `%%` são comentários e não criam relações no desenho.

Uma caixa escrita com `class` não é automaticamente uma entidade de DDD. Ela
pode representar um módulo, uma entidade, um objeto de valor, um serviço ou uma
coleção, conforme o conceito discutido pela equipe. Entidades precisam de
identidade e continuidade; objetos de valor são definidos por seus valores.

As associações indicam acesso ou referência. Elas não determinam a sequência de
requisições nem garantem que um cenário esteja implementado. As operações
representadas são conceituais: seus nomes não fixam endpoints ou tipos da aplicação.

Os comentários sobre propostas pendentes não significam que essas propostas
estejam aprovadas ou desenhadas. Uma decisão discutida precisa ser revisada
antes de entrar no modelo.

## 4. Adicionar uma classe, atributos e métodos

Este exemplo é independente e pode ser colado sozinho no Mermaid Live. Ele
ensina a sintaxe; não adiciona uma entidade real ao projeto.

```mermaid
classDiagram
namespace Servidor {
  class ExemploEntidade["Entidade de exemplo"] {
    id
    descricao
    validar()
  }
}
```

- `ExemploEntidade` é o identificador usado nas relações. Escolha identificadores
  únicos, sem espaços; por exemplo, `MinhaEntidade` ou `MinhaEntidadeCliente`.
- O texto entre colchetes e aspas é o nome visível. Ele pode ter espaços e acentos.
- `id` e `descricao` são atributos; uma linha com parênteses, como `validar()`,
  representa uma operação.
- Para ampliar a classe, acrescente seus atributos e operações dentro das chaves.

Para incluir uma classe no modelo principal, copie somente sua declaração para
o `namespace` adequado que já existe no `.mmd`. Mantenha apenas um `classDiagram`
e o cabeçalho de configuração original. Evite declarar duas vezes o mesmo elemento.

## 5. Adicionar relações e cardinalidades

Este segundo exemplo também é independente. As classes são fictícias e servem
somente para demonstrar uma configuração com itens e um serviço com acesso a ela.

```mermaid
classDiagram
direction LR
namespace Servidor {
  class ExemploConfiguracao
  class ExemploItem {
    id
  }
  class ExemploServico {
    consultar()
  }
}
ExemploConfiguracao "1" *--> "*" ExemploItem : itens
ExemploServico --> ExemploConfiguracao : acesso
```

No modelo principal, declare os elementos primeiro e acrescente a relação na
seção de relações correspondente. Use seus identificadores, não seus nomes visíveis.

### Legenda do modelo

![Modelo DDD com legenda de relações e multiplicidades](ddd-notificacoes-incremental.png)

A legenda também faz parte do próprio PNG, para acompanhar a imagem compartilhada.
Ela explica a notação; não acrescenta classes ou relações ao modelo.

| Sintaxe | Significado |
| --- | --- |
| `A --> B` | Associação com navegação de A para B: A acessa ou referencia B. |
| `B <-- A` | O mesmo acesso de A para B; a escrita invertida pode ajudar a organizar o layout. |
| `A -- B` | Ligação sem uma direção de navegação indicada. |
| `A *--> B` | Composição com navegação: B faz parte de A; o losango preenchido fica em A. |
| `A o--> B` | Agregação com navegação: A agrupa B; o losango vazio fica em A. |
| `A --> B : origem` | Associação com um rótulo que explica seu significado. |
| `A "1" --> "*" B` | Cada A associa-se a zero ou mais B; cada B associa-se a um A. |
| Ligação pontilhada de anotação | Conecta uma nota explicativa ao elemento; não acrescenta uma associação de domínio. |

As multiplicidades aparecem entre aspas junto aos extremos: `"1"` significa um,
`"0..1"` significa zero ou um, `"*"` significa zero ou mais e `"1..*"` significa
um ou mais. Escolha-as a partir das regras da feature, não da posição das caixas.

O losango fica no extremo do todo ou agrupador. O asterisco tem dois usos distintos:
em `*--` é o comando Mermaid para desenhar composição; em `"*"` junto ao extremo
é uma multiplicidade. Uma seta representa acesso ou referência, sem definir
sequência de chamadas, navegação de telas ou autorização.

O modelo original também contém extremos combinados, como a relação entre
`Student` e `Enrolment`. Preserve sua notação enquanto a equipe não revisar seu
significado. Agregação na notação UML não é sinônimo de agregado em DDD: um agregado
DDD delimita objetos cujas regras de consistência precisam ser protegidas conjuntamente.

Antes de escolher composição, discuta o pertencimento e o ciclo de vida das
partes. Uma relação útil para acessar dados não exige necessariamente composição.

## 6. Ajustar o espaço sem alterar o modelo

O Mermaid calcula as posições. No cabeçalho existente:

- Aumente `nodeSpacing` para ampliar o espaço entre elementos.
- Aumente `rankSpacing` para ampliar o espaço entre camadas do desenho.
- Ajuste `fontSize` com cuidado para manter nomes e operações legíveis.

O cabeçalho usa `markdownAutoWrap: false` para manter as operações em uma linha
e evitar sobreposição entre métodos quando a assinatura é longa. Preserve essa
opção ao exportar ou colar a fonte completa no Mermaid Live.

Faça ajustes pequenos e observe o resultado. Preserve a indentação do YAML e os
nomes das configurações. Para resolver falta de espaço, ajuste a apresentação;
qualquer remoção de relação precisa de uma justificativa conceitual própria.

## 7. Conferir a feature antes de propor a mudança

Escolha um cenário e verifique:

1. Quais informações ele exige e onde estão representadas ou serão obtidas.
2. Quais objetos ou serviços precisam acessar essas informações.
3. Quais relações e multiplicidades permitem esse acesso.
4. Quais regras e mudanças de estado precisam ser definidas.
5. Como representar o caso de sucesso e as rejeições ou falhas previstas.

Para um lembrete de notas pendentes, por exemplo, precisamos considerar o
agendamento, a turma, o professor destinatário, as pendências e o resultado do
processamento. Listar esses dados não aprova automaticamente novas classes:
primeiro discuta com a equipe como cada informação deve ser representada.

Um caminho de setas não prova que o cenário funciona. A análise do diagrama é
conceitual; os testes da futura implementação precisam comprovar suas regras.
Quando outra equipe ainda não disponibiliza uma dependência, combine seu contrato
e os dados necessários para um mock/stub. Não trate esse dado simulado como uma
funcionalidade já implementada no projeto.

### Atualização completa da configuração de lembretes

`Services.configurarLembretes()` continua sendo a entrada conceitual da aplicação.
Em `ConfiguracaoLembretes`, a operação
`atualizar(quantidade, lembretesPropostos, instanteAtual, prazoAcademico)` representa a validação
do conjunto final pretendido antes de aplicar qualquer alteração.

`lembretesPropostos` são os dados de edição, não uma nova entidade nem lembretes que já
foram alterados. A quantidade informada deve corresponder ao total final,
incluindo os enviados que serão preservados; ela não é um novo atributo permanente.

`instanteAtual` é a data e o horário que o serviço obtém consultando o relógio do
servidor uma vez por atualização. O professor não informa esse argumento, e a
configuração não o guarda como atributo. Ele é utilizado apenas para comparar
os agendamentos novos ou alterados com o momento da operação. `reagendar` recebe
o mesmo contexto temporal; a operação recebe o valor, não uma função de relógio.

Novos lembretes precisam de data e horário. Agendamentos novos ou alterados não
podem estar no passado nem após o prazo recebido. Os enviados devem continuar
presentes e inalterados; suas datas antigas não são rejeitadas como se fossem
novos agendamentos. Alterações em lembretes existentes preservam seus identificadores.

A operação valida o conjunto antes de aplicar as mudanças, preservando as regras
de `add`, `remove` e `reagendar`. Uma rejeição mantém toda a configuração anterior
intacta; não modifica outras turmas nem os registros históricos. Essa regra ainda
precisará ser implementada e garantida na gravação em armazenamento.

Exemplos para percorrer conceitualmente:

| Situação proposta | Resultado esperado no domínio |
| --- | --- |
| Duas datas válidas e quantidade dois | Aceitar a configuração completa. |
| Quantidade três com apenas duas datas preenchidas | Rejeitar; preservar a configuração anterior. |
| Um novo agendamento passado ou após o prazo | Rejeitar; não aplicar parcialmente as outras mudanças. |
| Reduzir três lembretes para dois, mantendo o enviado | Aceitar a remoção do não enviado e preservar os demais. |
| Alterar ou excluir um enviado | Rejeitar; preservar o conjunto anterior. |
| Reagendar um não enviado dentro dos limites | Preservar seu id e o isolamento entre turmas. |

Esses exemplos cobrem regras de domínio presentes em cenários GUI. Não comprovam
autenticação, navegação, mensagens, persistência ou testes executáveis aprovados.
O contrato concreto do relógio e a origem de `prazoAcademico`, os estados ainda indefinidos, as notas
pendentes, o processamento automático e a concorrência continuam pendentes.

### Registro dos resultados de envio

Nesta feature, cada `Notificacao` representa uma tentativa de envio realizada.
`Lembrete Service` tem acesso a `HistoricoNotificacoes` para coordenar seu registro
pela operação `registrar(Notificacao)`. A associação representa acesso ou referência;
ela não define uma sequência de chamadas.

`registrar` acrescenta a notificação sem substituir ou alterar os registros anteriores.
Em uma falha, o registro preserva o resultado `Falha` e a descrição do erro. Se um
reenvio for aceito pelo serviço de email, outra notificação registra `Enviado`.
Os dois registros referenciam o mesmo lembrete de origem.

| Acontecimento | Resultado esperado no histórico de tentativas |
| --- | --- |
| Uma tentativa é aceita pelo serviço de email | Acrescentar uma notificação com resultado Enviado. |
| Uma tentativa falha | Acrescentar uma notificação com resultado Falha e descrição do erro. |
| Um reenvio tem sucesso após uma falha | Preservar a falha e acrescentar o sucesso, ambos para o mesmo lembrete. |
| Novos resultados são registrados | Preservar todos os registros anteriores. |
| Um processamento não realiza tentativa de email | Não acrescentar uma notificação de tentativa; seu registro próprio continua pendente. |

Assim, a parte de registro do cenário de reenvio pode ser explicada com duas
notificações e um único lembrete enviado. `Enviado` significa aceitação pelo serviço
de email, não confirmação de recebimento ou leitura pelo destinatário.

O incremento detalha o registro no modelo; não implementa envio ou persistência.
Continuam pendentes a identificação do professor e da turma no histórico, os detalhes
históricos das pendências, o registro dos processamentos ignorados, os estados,
a programação dos reenvios e a prevenção de duplicidade e concorrência.
Portanto, ele não comprova o cenário completo de envio nem a consulta GUI.

Há uma diferença de linguagem a validar: os cenários GUI usam motivo para o propósito
do aviso, como "Notas pendentes", e descrição da falha para o erro; alguns cenários
service usam motivo para a causa da falha. O modelo mantém seus atributos atuais,
sem alterar os cenários nem considerar essa diferença resolvida.

## 8. Trabalhar em equipe com branches e PRs

Enquanto o modelo estiver na branch `docs/modelo-ddd-incremental`, crie sua branch
própria a partir dela. Depois de sua integração à `main`, use a `main` atualizada
como base. Cada integrante deve escolher um nome de branch exclusivo.

Exemplo para um clone cujo `origin` contém a branch compartilhada do DDD:

```sh
git fetch origin
git switch -c docs/ddd-minha-feature origin/docs/modelo-ddd-incremental
```

Edite e valide o `.mmd`, atualize o PNG quando o modelo mudar e registre os arquivos:

```sh
git add -- docs/arquitetura/modelo-ddd.mmd docs/arquitetura/ddd-notificacoes-incremental.png
git commit -m "docs: estende o modelo DDD para minha feature"
git push -u origin docs/ddd-minha-feature
```

Se editar o guia, inclua também `GUIA-MERMAID.md` no commit. Os comandos pressupõem
que você esteja na pasta do repositório e que possa publicar no seu `origin`.

Abra um PR para a branch que a equipe definiu como destino: neste estágio, a
branch compartilhada do DDD; depois de integrada, a `main`. No PR, explique o
conceito acrescentado, as relações e os cenários que motivam a proposta. Peça
revisão à equipe antes de integrar a alteração. O PR deve conter o código atualizado
e sua visualização, sem mudanças incidentais na aplicação.

Quando houver alterações concorrentes, compare as mudanças nas classes e nas
relações durante a resolução do conflito. Depois de resolvê-lo, abra o código final
novamente no Mermaid Live e gere uma imagem com legenda pelo procedimento abaixo.

## 9. Atualizar a imagem e revisar o resultado

1. Confira a fonte completa no Mermaid Live, incluindo o cabeçalho de configuração.
2. Execute o exportador para gerar o PNG com a legenda incorporada.
3. Abra o PNG e confira caixas, operações, relações e legibilidade do rodapé.
4. Inclua a fonte e a imagem correspondente na revisão. Se editar o guia ou o
   exportador, inclua esses arquivos também.

### Preparar as ferramentas de exportação

O script usa Python 3 com Pillow e Mermaid CLI 12.0.0 com seu navegador Puppeteer.
São ferramentas de documentação; não alteram as dependências do cliente ou servidor.
Não é necessário ter Codex. O exemplo abaixo é para Linux/macOS, executado na raiz
do repositório, e mantém o ambiente Python em uma pasta irmã:

```sh
python3 -m venv ../ddd-export-python
../ddd-export-python/bin/python -m pip install Pillow
npx --yes --package @mermaid-js/mermaid-cli@12.0.0 -- \
  ../ddd-export-python/bin/python scripts/exportar-modelo-ddd.py
```

O primeiro uso pode baixar as ferramentas e o navegador. Em outros sistemas,
use o executável Python do ambiente criado. A fonte padrão da legenda é
`DejaVuSans.ttf`; se não estiver disponível, informe uma fonte TrueType com
suporte a português usando `--font /caminho/fonte.ttf`.

### Usar ferramentas já instaladas

Se `mmdc` e Pillow já estão disponíveis no ambiente:

```sh
python3 scripts/exportar-modelo-ddd.py
```

Para informar o executável Mermaid e uma configuração do navegador:

```sh
python3 scripts/exportar-modelo-ddd.py \
  --mmdc /caminho/para/mmdc \
  --puppeteer-config /caminho/para/puppeteer.json
```

O JSON do Puppeteer pode indicar um navegador instalado, por exemplo
`{"executablePath": "/caminho/para/chrome"}`. Use os caminhos da sua máquina.
O exportador não depende de caminhos temporários específicos.

Por padrão, ele lê `docs/arquitetura/modelo-ddd.mmd` e grava
`docs/arquitetura/ddd-notificacoes-incremental.png`, com largura de 6800 pixels.
Também aceita `--input`, `--output`, `--width` e `--svg`; este último salva um SVG
adicional do modelo, sem o rodapé, para inspeção. `--help` lista as opções.

O rodapé é desenhado pelo exportador, sem modificar os pixels do diagrama
renderizado. O PNG contém o SHA-256 da fonte em seus metadados para permitir
conferir qual versão foi exportada. Para reproduzir a aparência, mantenha a
mesma versão do Mermaid, navegador e fontes.

### Exportação direta no Mermaid Live

Em **Actions → PNG**, o Mermaid Live exporta o diagrama da fonte `.mmd`, sem a
legenda adicional. Essa exportação é útil para prévias. Para atualizar o PNG
versionado com o rodapé, use o script. A legenda não é parte do domínio e não
deve ser simulada acrescentando classes ou associações artificiais ao `.mmd`.

O código é a fonte oficial. A exportação pode variar visualmente entre versões
do Mermaid; compare os conceitos e as relações, além da aparência.

Antes de concluir, confirme que o arquivo abre sem erro, que os novos identificadores
são únicos, que não surgiram caixas por erros de digitação nas relações e que a
base do professor permanece representada, salvo uma alteração justificada e revisada.

## Referências de sintaxe

- [Diagramas de classes Mermaid](https://mermaid.js.org/syntax/classDiagram.html).
- [Configuração e cabeçalho YAML](https://mermaid.js.org/config/configuration.html).
- [Mermaid Live Editor](https://mermaid.live/).
