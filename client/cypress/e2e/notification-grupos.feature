# language: pt
Funcionalidade: Notificação de alocação de monitor e aluno

  Como aluno ou monitor de um grupo do SGM
  Eu quero ser notificado sempre que a composição do meu grupo mudar
  Para que eu saiba quem são os participantes atuais do grupo sem precisar checar manualmente

  @grupos-gui
  Cenário: notificar grupo ao alocar monitor
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    Quando o professor aloca o monitor "joaosilva" ao grupo "ESS-G3"
    Então o sistema envia uma notificação de alocação para "Mariana", "Pedro" e "joaosilva"
    E o grupo "ESS-G3" passa a ter "joaosilva" como monitor

  @grupos-integracao
  Cenário: notificar grupo ao adicionar aluno a grupo com monitor
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando o professor adiciona o aluno "Carla" ao grupo "ESS-G3"
    Então o sistema envia uma notificação de aviso para "Mariana", "Pedro", "Carla" e "joaosilva"
    E o grupo "ESS-G3" passa a ter "Mariana", "Pedro" e "Carla" como alunos

  @grupos-gui
  Cenário: não notificar quando alocação de monitor falha
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E não há nenhum monitor disponível no momento
    Quando o professor tenta alocar um monitor ao grupo "ESS-G3"
    Então o sistema exibe uma mensagem informando que não há monitor disponível
    E nenhuma notificação é enviada
    E o grupo "ESS-G3" continua sem monitor definido

  @grupos-gui
  Cenário: não notificar ao tentar adicionar aluno já pertencente ao grupo
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando o professor tenta adicionar o aluno "Pedro" novamente ao grupo "ESS-G3"
    Então o sistema exibe uma mensagem informando que o aluno já pertence ao grupo
    E nenhuma notificação é enviada
    E o grupo "ESS-G3" mantém apenas "Mariana" e "Pedro" como alunos

  @grupos-gui
  Cenário: notificar participantes na realocação de monitor entre grupos
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    Quando o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o sistema envia uma notificação de saída para os alunos do grupo "ESS-G3"
    E o sistema envia uma notificação de entrada para os alunos do grupo "ESS-G4"
    E o histórico de notificações do grupo "ESS-G3" registra a notificação de saída para "Mariana" e "Pedro"

  @grupos-gui
  Cenário: atualizar os grupos após a realocação de monitor entre grupos
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    Quando o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o grupo "ESS-G3" passa a não ter monitor definido
    E o grupo "ESS-G4" passa a ter "joaosilva" como monitor

  @grupos-gui
  Cenário: alocação automática quando há apenas um monitor disponível
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    Quando o sistema de alocação automática é executado para o grupo "ESS-G5"
    Então o sistema aloca o monitor "mariaeduarda" ao grupo "ESS-G5"
    E o sistema envia uma notificação de alocação para "Rafael", "Julia" e "mariaeduarda"

  @grupos-gui
  Cenário: atualizar a lista de monitores após a alocação automática
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    Quando o sistema de alocação automática é executado para o grupo "ESS-G5"
    Então a lista de monitores da disciplina mostra "mariaeduarda" como alocado ao grupo "ESS-G5" por alocação automática
    E a lista de monitores da disciplina não mostra monitores livres

  @grupos-gui
  Cenário: notificar alunos quando monitor é removido do grupo sem realocação
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando o professor remove o monitor "joaosilva" do grupo "ESS-G3" sem realocá-lo
    Então o sistema envia uma notificação de remoção para "Mariana" e "Pedro"
    E o grupo "ESS-G3" passa a não ter monitor definido

  @grupos-gui
  Cenário: não notificar quando realocação de monitor falha
    Dado o monitor "joaosilva" está alocado ao grupo "ESS-G3"
    E o grupo "ESS-G4" não existe no sistema
    Quando o professor tenta realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o sistema exibe uma mensagem informando que o grupo de destino não existe
    E nenhuma notificação é enviada
    E o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"

  @grupos-gui
  Cenário: notificar apenas o novo monitor quando grupo não possui alunos
    Dado o grupo "ESS-G6" existe sem nenhum aluno e sem monitor definido
    Quando o professor aloca o monitor "carloseduardo" ao grupo "ESS-G6"
    Então o sistema envia uma notificação de alocação apenas para "carloseduardo"
    E o grupo "ESS-G6" passa a ter "carloseduardo" como monitor

  @grupos-gui
  Cenário: notificar monitor quando é designado como responsável por múltiplos grupos
    Dado o monitor "joaosilva" já está alocado ao grupo "ESS-G3"
    E o grupo "ESS-G7" existe com os alunos "Ana" e "Bruno" e sem monitor definido
    Quando o professor aloca o monitor "joaosilva" também ao grupo "ESS-G7"
    Então o sistema envia uma notificação para os alunos do grupo "ESS-G7"
    E o sistema envia uma notificação para "joaosilva" informando o acúmulo de grupos
    E o grupo "ESS-G3" permanece com "joaosilva" como monitor, sem alteração
