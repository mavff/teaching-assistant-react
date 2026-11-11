
@gui-lembretes
Feature: Configuração de lembretes de notas pendentes

  Scenario: Configuração da quantidade, datas e horários dos lembretes
    Given que existe uma turma "ESS" de testes sem lembretes configurados
    And o prazo acadêmico está definido para daqui a 40 dias
    And o professor está na tela "Turmas"
    When o professor acessa a configuração de lembretes da turma "ESS"
    And informa "2" como quantidade de lembretes
    And define o primeiro lembrete para daqui a 7 dias às "09:00"
    And define o segundo lembrete para daqui a 14 dias às "14:00"
    And salva a configuração
    Then a tela apresenta a mensagem "Configuração salva com sucesso"
    And a quantidade de lembretes configurados é "2"
    And o primeiro lembrete apresenta a data e o horário definidos
    And o segundo lembrete apresenta a data e o horário definidos
    And o prazo acadêmico permanece inalterado
