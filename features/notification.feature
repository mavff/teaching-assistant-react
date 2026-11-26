Feature: Notificação de alocação de monitor e aluno

  Como aluno ou monitor de um grupo do SGM
  Eu quero ser notificado sempre que a composição do meu grupo mudar
  Para que eu saiba quem são os participantes atuais do grupo sem precisar checar manualmente

  Scenario: criar grupo com alunos cadastrados
    Given o aluno "Ana" está cadastrado no sistema
    And o aluno "Bruno" está cadastrado no sistema
    And o grupo "ESS-G8" não existe no sistema
    And eu estou na página "Groups"
    When o professor cria o grupo "ESS-G8" com os alunos "Ana" e "Bruno"
    Then o grupo "ESS-G8" passa a ter "Ana" e "Bruno" como alunos
    And o grupo "ESS-G8" está sem monitor definido
    And nenhuma notificação é enviada

  Scenario: não criar grupo com nome já existente
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And eu estou na página "Groups"
    When o professor tenta criar o grupo "ESS-G3" sem alunos
    Then o sistema exibe a mensagem de erro "Group already exists"
    And o grupo "ESS-G3" mantém apenas "Mariana" e "Pedro" como alunos

  Scenario: cadastrar monitor com nome e e-mail
    Given o monitor "joaosilva" não está cadastrado
    And eu estou na página "Groups"
    When o professor cadastra o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    Then a lista de monitores da disciplina mostra "João Silva", com login "joaosilva" e e-mail "joao@cin.ufpe.br", como livre

  Scenario: não cadastrar monitor com e-mail inválido
    Given o monitor "joaosilva" não está cadastrado
    And eu estou na página "Groups"
    When o professor tenta cadastrar o monitor "joaosilva" com nome "João Silva" e e-mail "joao"
    Then o sistema exibe a mensagem de erro "Invalid monitor email"
    And a lista de monitores da disciplina não mostra "joaosilva"

  Scenario: notificar grupo ao alocar monitor
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And o monitor "joaosilva" está cadastrado e livre
    And eu estou na página "Groups"
    When o professor aloca o monitor "joaosilva" ao grupo "ESS-G3"
    Then o sistema envia uma notificação de alocação para "Mariana", "Pedro" e "joaosilva"
    And o grupo "ESS-G3" passa a ter "joaosilva" como monitor

  Scenario: não alocar outro monitor a grupo que já tem monitor
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o monitor "mariaeduarda" está cadastrado e livre
    And eu estou na página "Groups"
    When o professor tenta alocar o monitor "mariaeduarda" ao grupo "ESS-G3"
    Then o sistema exibe a mensagem de erro "The group already has a monitor"
    And nenhuma notificação é enviada
    And o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"

  Scenario: notificar grupo ao adicionar aluno a grupo com monitor
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o aluno "Carla" está cadastrado no sistema
    And eu estou na página "Groups"
    When o professor adiciona o aluno "Carla" ao grupo "ESS-G3"
    Then o sistema envia uma notificação de aviso para "Mariana", "Pedro", "Carla" e "joaosilva"
    And o grupo "ESS-G3" passa a ter "Mariana", "Pedro" e "Carla" como alunos

  Scenario: não oferecer para adição aluno que já pertence ao grupo
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o aluno "Pedro" está cadastrado no sistema
    And o aluno "Carla" está cadastrado no sistema
    When eu abro a página "Groups"
    Then a lista de alunos para adicionar ao grupo "ESS-G3" oferece "Carla" e não oferece "Pedro"

  Scenario: não oferecer aluno que já pertence a outro grupo
    Given o aluno "Carla" está cadastrado no sistema
    And o aluno "Ana" está cadastrado no sistema
    And o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    When eu abro a página "Groups"
    Then a lista de alunos para adicionar ao grupo "ESS-G4" oferece "Ana" e não oferece "Carla"
    And a lista de alunos do novo grupo oferece "Ana" e não oferece "Carla"

  Scenario: não notificar quando alocação de monitor falha
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And não há nenhum monitor disponível no momento
    And eu estou na página "Groups"
    When o professor tenta alocar um monitor ao grupo "ESS-G3"
    Then o sistema exibe uma mensagem informando que não há monitor disponível
    And nenhuma notificação é enviada
    And o grupo "ESS-G3" está sem monitor definido

  Scenario: notificar participantes na realocação de monitor entre grupos
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    And eu estou na página "Groups"
    When o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Then o sistema envia uma notificação de saída do grupo "ESS-G3" para "Mariana" e "Pedro"
    And o sistema envia uma notificação de entrada do grupo "ESS-G4" para "Lucas" e "Beatriz"
    And o histórico de notificações do grupo "ESS-G3" registra a notificação de saída para "Mariana" e "Pedro"

  Scenario: atualizar os grupos após a realocação de monitor entre grupos
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    And eu estou na página "Groups"
    When o professor realoca o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Then o grupo "ESS-G3" está sem monitor definido
    And o grupo "ESS-G4" passa a ter "joaosilva" como monitor

  Scenario: alocação automática quando há apenas um monitor disponível
    Given o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    And o monitor "mariaeduarda" é o único monitor livre no momento
    And eu estou na página "Groups"
    When o sistema de alocação automática é executado para o grupo "ESS-G5"
    Then o grupo "ESS-G5" passa a ter "mariaeduarda" como monitor
    And o sistema envia uma notificação de alocação para "Rafael", "Julia" e "mariaeduarda"

  Scenario: atualizar a lista de monitores após a alocação automática
    Given o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    And o monitor "mariaeduarda" é o único monitor livre no momento
    And eu estou na página "Groups"
    When o sistema de alocação automática é executado para o grupo "ESS-G5"
    Then a lista de monitores da disciplina mostra "mariaeduarda" como alocado ao grupo "ESS-G5" por alocação automática
    And a lista de monitores da disciplina não mostra monitores livres

  Scenario: não notificar quando a alocação automática não encontra monitor livre
    Given o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    And não há nenhum monitor disponível no momento
    And eu estou na página "Groups"
    When o sistema de alocação automática é executado para o grupo "ESS-G5"
    Then o sistema exibe uma mensagem informando que não há monitor disponível
    And nenhuma notificação é enviada
    And o grupo "ESS-G5" está sem monitor definido

  Scenario: notificar alunos quando monitor é removido do grupo sem realocação
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And eu estou na página "Groups"
    When o professor remove o monitor "joaosilva" do grupo "ESS-G3" sem realocá-lo
    Then o sistema envia uma notificação de remoção do grupo "ESS-G3" para "Mariana" e "Pedro"
    And o grupo "ESS-G3" está sem monitor definido

  Scenario: não notificar quando realocação de monitor falha
    Given o monitor "joaosilva" está alocado ao grupo "ESS-G3"
    And o grupo "ESS-G4" não existe no sistema
    And eu estou na página "Groups"
    When o professor tenta realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Then o sistema exibe uma mensagem informando que o grupo de destino não existe
    And nenhuma notificação é enviada
    And o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"

  Scenario: notificar apenas o novo monitor quando grupo não possui alunos
    Given o grupo "ESS-G6" existe sem nenhum aluno e sem monitor definido
    And o monitor "carloseduardo" está cadastrado e livre
    And eu estou na página "Groups"
    When o professor aloca o monitor "carloseduardo" ao grupo "ESS-G6"
    Then o sistema envia uma notificação de alocação do grupo "ESS-G6" apenas para "carloseduardo"
    And o grupo "ESS-G6" passa a ter "carloseduardo" como monitor

  Scenario: notificar monitor quando é designado como responsável por múltiplos grupos
    Given o monitor "joaosilva" está alocado ao grupo "ESS-G3"
    And o grupo "ESS-G7" existe com os alunos "Ana" e "Bruno" e sem monitor definido
    And eu estou na página "Groups"
    When o professor aloca o monitor "joaosilva" também ao grupo "ESS-G7"
    Then o sistema envia uma notificação de alocação do grupo "ESS-G7" para "Ana" e "Bruno"
    And o sistema envia uma notificação para "joaosilva" informando o acúmulo de grupos
    And o monitor "joaosilva" permanece alocado ao grupo "ESS-G3"
    And nenhuma notificação do grupo "ESS-G3" é enviada

  Scenario: alocar monitor ao grupo (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And o monitor "joaosilva" está cadastrado e livre
    When eu peço ao sistema para alocar o monitor "joaosilva" ao grupo "ESS-G3"
    Then o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    And o histórico do grupo "ESS-G3" registra notificações de alocação enviadas para "Mariana", "Pedro" e "joaosilva"

  Scenario: alocar monitor quando não há monitor disponível (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And não há nenhum monitor disponível no momento
    When eu peço ao sistema para alocar um monitor qualquer ao grupo "ESS-G3"
    Then o servidor retorna o erro "No monitor available"
    And o sistema não registra nenhuma notificação
    And o sistema armazena o grupo "ESS-G3" sem monitor

  Scenario: alocar monitor não cadastrado (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    And o monitor "ninguem" não está cadastrado
    When eu peço ao sistema para alocar o monitor "ninguem" ao grupo "ESS-G3"
    Then o servidor retorna o erro "Monitor does not exist"
    And o sistema não registra nenhuma notificação
    And o sistema armazena o grupo "ESS-G3" sem monitor

  Scenario: adicionar aluno a grupo com monitor (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    When eu peço ao sistema para adicionar o aluno "Carla" ao grupo "ESS-G3"
    Then o sistema armazena apenas "Mariana", "Pedro" e "Carla" como alunos do grupo "ESS-G3"
    And o histórico do grupo "ESS-G3" registra notificações de aviso enviadas para "Mariana", "Pedro", "Carla" e "joaosilva"

  Scenario: realocar monitor para grupo que já possui monitor (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e o monitor "mariaeduarda"
    When eu peço ao sistema para realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Then o servidor retorna o erro "The destination group already has a monitor"
    And o sistema não registra nenhuma notificação
    And o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    And o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G4"

  Scenario: remover monitor de grupo sem monitor (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    When eu peço ao sistema para remover o monitor do grupo "ESS-G3"
    Then o servidor retorna o erro "The group has no monitor"
    And o sistema não registra nenhuma notificação

  Scenario: alocação automática do único monitor livre (serviço)
    Given o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    And o monitor "mariaeduarda" é o único monitor livre no momento
    When eu peço ao sistema a alocação automática de monitor para o grupo "ESS-G5"
    Then o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G5"
    And o sistema não tem monitores livres
    And o histórico do grupo "ESS-G5" registra notificações de alocação enviadas para "Rafael", "Julia" e "mariaeduarda"

  Scenario: criar grupo com alunos (serviço)
    Given o grupo "ESS-G8" não existe no sistema
    When eu peço ao sistema para criar o grupo "ESS-G8" com os alunos "Ana" e "Bruno"
    Then o sistema armazena apenas "Ana" e "Bruno" como alunos do grupo "ESS-G8"
    And o sistema armazena o grupo "ESS-G8" sem monitor
    And o sistema não registra nenhuma notificação

  Scenario: cadastrar monitor com nome e e-mail (serviço)
    Given o monitor "joaosilva" não está cadastrado
    When eu peço ao sistema para cadastrar o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    Then o sistema armazena o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    And o sistema mostra o monitor "joaosilva" como livre

  Scenario: cadastrar monitor já cadastrado (serviço)
    Given o monitor "joaosilva" está cadastrado com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    When eu peço ao sistema para cadastrar o monitor "joaosilva" com nome "Outro João" e e-mail "outro@cin.ufpe.br"
    Then o servidor retorna o erro "Monitor already registered"
    And o sistema armazena o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"

  Scenario: adicionar aluno que já pertence ao grupo (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    When eu peço ao sistema para adicionar o aluno "Pedro" ao grupo "ESS-G3"
    Then o servidor retorna o erro "The student is already in the group"
    And o sistema não registra nenhuma notificação
    And o sistema armazena apenas "Mariana" e "Pedro" como alunos do grupo "ESS-G3"

  Scenario: realocar monitor que não está no grupo de origem (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "mariaeduarda"
    And o monitor "joaosilva" está cadastrado e livre
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    When eu peço ao sistema para realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Then o servidor retorna o erro "The monitor is not allocated to the source group"
    And o sistema não registra nenhuma notificação
    And o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G3"
    And o sistema armazena o grupo "ESS-G4" sem monitor

  Scenario: adicionar aluno que já pertence a outro grupo (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    And o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e o monitor "joaosilva"
    When eu peço ao sistema para adicionar o aluno "Carla" ao grupo "ESS-G4"
    Then o servidor retorna o erro "Carla is already in group ESS-G3"
    And o sistema não registra nenhuma notificação
    And o sistema armazena apenas "Lucas" e "Beatriz" como alunos do grupo "ESS-G4"
    And o sistema armazena apenas "Carla" e "Pedro" como alunos do grupo "ESS-G3"

  Scenario: criar grupo com aluno que já pertence a outro grupo (serviço)
    Given o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    And o grupo "ESS-G8" não existe no sistema
    When eu peço ao sistema para criar o grupo "ESS-G8" com os alunos "Ana" e "Carla"
    Then o servidor retorna o erro "Carla is already in group ESS-G3"
    And o grupo "ESS-G8" não existe no sistema
