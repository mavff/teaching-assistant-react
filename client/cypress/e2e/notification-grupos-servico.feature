# language: pt
@grupos-servico
Funcionalidade: Notificação de alocação de monitor e aluno (serviço)

  Como sistema que usa a API do SGM
  Eu quero que o servidor notifique os participantes quando a composição de um grupo muda
  Para que as regras de alocação valham independentemente da interface usada

  Cenário: alocar monitor ao grupo (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E o monitor "joaosilva" está cadastrado e livre
    Quando eu peço ao sistema para alocar o monitor "joaosilva" ao grupo "ESS-G3"
    Então o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    E o histórico do grupo "ESS-G3" registra notificações de alocação enviadas para "Mariana", "Pedro" e "joaosilva"

  Cenário: alocar monitor quando não há monitor disponível (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E não há nenhum monitor disponível no momento
    Quando eu peço ao sistema para alocar um monitor qualquer ao grupo "ESS-G3"
    Então o servidor retorna o erro "No monitor available"
    E o sistema não registra nenhuma notificação
    E o sistema armazena o grupo "ESS-G3" sem monitor

  Cenário: alocar monitor não cadastrado (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E o monitor "ninguem" não está cadastrado
    Quando eu peço ao sistema para alocar o monitor "ninguem" ao grupo "ESS-G3"
    Então o servidor retorna o erro "Monitor does not exist"
    E o sistema não registra nenhuma notificação
    E o sistema armazena o grupo "ESS-G3" sem monitor

  Cenário: adicionar aluno a grupo com monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando eu peço ao sistema para adicionar o aluno "Carla" ao grupo "ESS-G3"
    Então o sistema armazena apenas "Mariana", "Pedro" e "Carla" como alunos do grupo "ESS-G3"
    E o histórico do grupo "ESS-G3" registra notificações de aviso enviadas para "Mariana", "Pedro", "Carla" e "joaosilva"

  Cenário: realocar monitor para grupo que já possui monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e o monitor "mariaeduarda"
    Quando eu peço ao sistema para realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o servidor retorna o erro "The destination group already has a monitor"
    E o sistema não registra nenhuma notificação
    E o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    E o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G4"

  Cenário: remover monitor de grupo sem monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    Quando eu peço ao sistema para remover o monitor do grupo "ESS-G3"
    Então o servidor retorna o erro "The group has no monitor"
    E o sistema não registra nenhuma notificação

  Cenário: alocação automática do único monitor livre (serviço)
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    Quando eu peço ao sistema a alocação automática de monitor para o grupo "ESS-G5"
    Então o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G5"
    E o sistema não tem monitores livres
    E o histórico do grupo "ESS-G5" registra notificações de alocação enviadas para "Rafael", "Julia" e "mariaeduarda"

  Cenário: criar grupo com alunos (serviço)
    Dado o grupo "ESS-G8" não existe no sistema
    Quando eu peço ao sistema para criar o grupo "ESS-G8" com os alunos "Ana" e "Bruno"
    Então o sistema armazena apenas "Ana" e "Bruno" como alunos do grupo "ESS-G8"
    E o sistema armazena o grupo "ESS-G8" sem monitor
    E o sistema não registra nenhuma notificação

  Cenário: cadastrar monitor com nome e e-mail (serviço)
    Dado o monitor "joaosilva" não está cadastrado
    Quando eu peço ao sistema para cadastrar o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    Então o sistema armazena o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    E o sistema mostra o monitor "joaosilva" como livre

  Cenário: cadastrar monitor já cadastrado (serviço)
    Dado o monitor "joaosilva" está cadastrado com nome "João Silva" e e-mail "joao@cin.ufpe.br"
    Quando eu peço ao sistema para cadastrar o monitor "joaosilva" com nome "Outro João" e e-mail "outro@cin.ufpe.br"
    Então o servidor retorna o erro "Monitor already registered"
    E o sistema armazena o monitor "joaosilva" com nome "João Silva" e e-mail "joao@cin.ufpe.br"

  Cenário: adicionar aluno que já pertence ao grupo (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando eu peço ao sistema para adicionar o aluno "Pedro" ao grupo "ESS-G3"
    Então o servidor retorna o erro "The student is already in the group"
    E o sistema não registra nenhuma notificação
    E o sistema armazena apenas "Mariana" e "Pedro" como alunos do grupo "ESS-G3"

  Cenário: realocar monitor que não está no grupo de origem (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "mariaeduarda"
    E o monitor "joaosilva" está cadastrado e livre
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e sem monitor definido
    Quando eu peço ao sistema para realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o servidor retorna o erro "The monitor is not allocated to the source group"
    E o sistema não registra nenhuma notificação
    E o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G3"
    E o sistema armazena o grupo "ESS-G4" sem monitor

  Cenário: adicionar aluno que já pertence a outro grupo (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e o monitor "joaosilva"
    Quando eu peço ao sistema para adicionar o aluno "Carla" ao grupo "ESS-G4"
    Então o servidor retorna o erro "Carla is already in group ESS-G3"
    E o sistema não registra nenhuma notificação
    E o sistema armazena apenas "Lucas" e "Beatriz" como alunos do grupo "ESS-G4"
    E o sistema armazena apenas "Carla" e "Pedro" como alunos do grupo "ESS-G3"

  Cenário: criar grupo com aluno que já pertence a outro grupo (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Carla" e "Pedro" e sem monitor definido
    E o grupo "ESS-G8" não existe no sistema
    Quando eu peço ao sistema para criar o grupo "ESS-G8" com os alunos "Ana" e "Carla"
    Então o servidor retorna o erro "Carla is already in group ESS-G3"
    E o grupo "ESS-G8" não existe no sistema
