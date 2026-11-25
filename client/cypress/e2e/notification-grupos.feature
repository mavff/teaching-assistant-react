# language: pt
@grupos-gui
Funcionalidade: Notificação de alocação de monitor e aluno

  Como aluno ou monitor de um grupo do SGM
  Eu quero ser notificado sempre que a composição do meu grupo mudar
  Para que eu saiba quem são os participantes atuais do grupo sem precisar checar manualmente

  Cenário: criar grupo com alunos cadastrados
    Dado o aluno "Ana" está cadastrado no sistema
    E o aluno "Bruno" está cadastrado no sistema
    E o grupo "ESS-G8" não existe no sistema
    E eu estou na página "Groups"
    Quando o professor cria o grupo "ESS-G8" com os alunos "Ana" e "Bruno"
    Então o grupo "ESS-G8" passa a ter "Ana" e "Bruno" como alunos
    E o grupo "ESS-G8" está sem monitor definido
    E nenhuma notificação é enviada

  Cenário: não criar grupo com nome já existente
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E eu estou na página "Groups"
    Quando o professor tenta criar o grupo "ESS-G3" sem alunos
    Então o sistema exibe a mensagem de erro "Group already exists"
    E o grupo "ESS-G3" mantém apenas "Mariana" e "Pedro" como alunos

  Cenário: cadastrar monitor com nome e e-mail
    Dado o monitor "joaosilva" não está cadastrado
    E eu estou na página "Groups"
    Quando o professor cadastra o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    Então a lista de monitores da disciplina mostra "João Silva", com login "joaosilva" e e-mail "joao@cin.ufpe.br", como livre

  Cenário: não cadastrar monitor com e-mail inválido
    Dado o monitor "joaosilva" não está cadastrado
    E eu estou na página "Groups"
    Quando o professor tenta cadastrar o monitor "joaosilva" com nome "João Silva" e e-mail "joao"
    Então o sistema exibe a mensagem de erro "Invalid monitor email"
    E a lista de monitores da disciplina não mostra "joaosilva"

  Cenário: notificar grupo ao alocar monitor
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E o monitor "joaosilva" está cadastrado e livre
    E eu estou na página "Groups"
    Quando o professor aloca o monitor "joaosilva" ao grupo "ESS-G3"
    Então o sistema envia uma notificação de alocação para "Mariana", "Pedro" e "joaosilva"
    E o grupo "ESS-G3" passa a ter "joaosilva" como monitor

  Cenário: não alocar outro monitor a grupo que já tem monitor
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o monitor "mariaeduarda" está cadastrado e livre
    E eu estou na página "Groups"
    Quando o professor tenta alocar o monitor "mariaeduarda" ao grupo "ESS-G3"
    Então o sistema exibe a mensagem de erro "The group already has a monitor"
    E nenhuma notificação é enviada
    E o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"

  Cenário: notificar grupo ao adicionar aluno a grupo com monitor
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o aluno "Carla" está cadastrado no sistema
    E eu estou na página "Groups"
    Quando o professor adiciona o aluno "Carla" ao grupo "ESS-G3"
    Então o sistema envia uma notificação de aviso para "Mariana", "Pedro", "Carla" e "joaosilva"
    E o grupo "ESS-G3" passa a ter "Mariana", "Pedro" e "Carla" como alunos

  Cenário: não oferecer para adição aluno que já pertence ao grupo
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o aluno "Pedro" está cadastrado no sistema
    E o aluno "Carla" está cadastrado no sistema
    Quando eu abro a página "Groups"
    Então a lista de alunos para adicionar ao grupo "ESS-G3" oferece "Carla" e não oferece "Pedro"

  Cenário: não oferecer aluno que já pertence a outro grupo
    Dado o aluno "Carla" está cadastrado no sistema
    E o aluno "Ana" está cadastrado no sistema
    E o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    Quando eu abro a página "Groups"
    Então a lista de alunos para adicionar ao grupo "ESS-G4" oferece "Ana" e não oferece "Carla"
    E a lista de alunos do novo grupo oferece "Ana" e não oferece "Carla"

  Cenário: não notificar quando alocação de monitor falha
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E não há nenhum monitor disponível no momento
    E eu estou na página "Groups"
    Quando o professor tenta alocar um monitor ao grupo "ESS-G3"
    Então o sistema exibe uma mensagem informando que não há monitor disponível
    E nenhuma notificação é enviada
    E o grupo "ESS-G3" continua sem monitor definido

  Cenário: notificar participantes na realocação de monitor entre grupos
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    E eu estou na página "Groups"
    Quando o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o sistema envia uma notificação de saída do grupo "ESS-G3" para "Mariana" e "Pedro"
    E o sistema envia uma notificação de entrada do grupo "ESS-G4" para "Lucas" e "Beatriz"
    E o histórico de notificações do grupo "ESS-G3" registra a notificação de saída para "Mariana" e "Pedro"

  Cenário: atualizar os grupos após a realocação de monitor entre grupos
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    E eu estou na página "Groups"
    Quando o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o grupo "ESS-G3" passa a não ter monitor definido
    E o grupo "ESS-G4" passa a ter "joaosilva" como monitor

  Cenário: alocação automática quando há apenas um monitor disponível
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    E eu estou na página "Groups"
    Quando o sistema de alocação automática é executado para o grupo "ESS-G5"
    Então o grupo "ESS-G5" passa a ter "mariaeduarda" como monitor
    E o sistema envia uma notificação de alocação para "Rafael", "Julia" e "mariaeduarda"

  Cenário: atualizar a lista de monitores após a alocação automática
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    E eu estou na página "Groups"
    Quando o sistema de alocação automática é executado para o grupo "ESS-G5"
    Então a lista de monitores da disciplina mostra "mariaeduarda" como alocado ao grupo "ESS-G5" por alocação automática
    E a lista de monitores da disciplina não mostra monitores livres

  Cenário: não notificar quando a alocação automática não encontra monitor livre
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E não há nenhum monitor disponível no momento
    E eu estou na página "Groups"
    Quando o sistema de alocação automática é executado para o grupo "ESS-G5"
    Então o sistema exibe uma mensagem informando que não há monitor disponível
    E nenhuma notificação é enviada
    E o grupo "ESS-G5" continua sem monitor definido

  Cenário: notificar alunos quando monitor é removido do grupo sem realocação
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E eu estou na página "Groups"
    Quando o professor remove o monitor "joaosilva" do grupo "ESS-G3" sem realocá-lo
    Então o sistema envia uma notificação de remoção do grupo "ESS-G3" para "Mariana" e "Pedro"
    E o grupo "ESS-G3" passa a não ter monitor definido

  Cenário: não notificar quando realocação de monitor falha
    Dado o monitor "joaosilva" está alocado ao grupo "ESS-G3"
    E o grupo "ESS-G4" não existe no sistema
    E eu estou na página "Groups"
    Quando o professor tenta realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o sistema exibe uma mensagem informando que o grupo de destino não existe
    E nenhuma notificação é enviada
    E o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"

  Cenário: notificar apenas o novo monitor quando grupo não possui alunos
    Dado o grupo "ESS-G6" existe sem nenhum aluno e sem monitor definido
    E o monitor "carloseduardo" está cadastrado e livre
    E eu estou na página "Groups"
    Quando o professor aloca o monitor "carloseduardo" ao grupo "ESS-G6"
    Então o sistema envia uma notificação de alocação do grupo "ESS-G6" apenas para "carloseduardo"
    E o grupo "ESS-G6" passa a ter "carloseduardo" como monitor

  Cenário: notificar monitor quando é designado como responsável por múltiplos grupos
    Dado o monitor "joaosilva" está alocado ao grupo "ESS-G3"
    E o grupo "ESS-G7" existe com os alunos "Ana" e "Bruno" e sem monitor definido
    E eu estou na página "Groups"
    Quando o professor aloca o monitor "joaosilva" também ao grupo "ESS-G7"
    Então o sistema envia uma notificação de alocação do grupo "ESS-G7" para "Ana" e "Bruno"
    E o sistema envia uma notificação para "joaosilva" informando o acúmulo de grupos
    E o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"
    E nenhuma notificação do grupo "ESS-G3" é enviada
