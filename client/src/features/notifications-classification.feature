@notifications
Feature: Quartile notification after all grades of a class were entered
  As a student
  I want to be told my quartile when every grade of the class has been entered
  So that I know where I stand in the class, without seeing anyone else's data

  Background:
    Given a class whose students have every grade except "Refactoring":
      | name      | cpf            | grades                  | refactoring |
      | Ana Test  | 901.000.000-01 | MA,MA,MA,MA,MA          | MA          |
      | Bia Test  | 901.000.000-02 | MPA,MPA,MPA,MPA,MPA     | MPA         |
      | Caio Test | 901.000.000-03 | MANA,MPA,MANA,MPA,MANA  | MPA         |
      | Davi Test | 901.000.000-04 | MANA,MANA,MANA,MANA,MANA| MANA        |

  Scenario: Nobody is notified while a grade is still missing
    When the "Refactoring" grade is entered for "Ana Test"
    And the "Refactoring" grade is entered for "Bia Test"
    And the "Refactoring" grade is entered for "Caio Test"
    Then "Ana Test" sees no notifications on the notifications tab
    And "Davi Test" sees no notifications on the notifications tab

  Scenario: Every student is told their quartile after the last grade
    When the "Refactoring" grade is entered for "Ana Test"
    And the "Refactoring" grade is entered for "Bia Test"
    And the "Refactoring" grade is entered for "Caio Test"
    And the "Refactoring" grade is entered for "Davi Test"
    And "Ana Test" opens the notifications tab
    Then "Ana Test" sees 1 notification
    And the notification is shown as "Classificação" and unread
    And the notification message is "Todas as notas da turma foram lançadas. Você está no quarto quartil da turma (grupo dos 25% com maior desempenho)."
    And the notification e-mail result is "Ignorado"
    When "Davi Test" opens the notifications tab
    Then "Davi Test" sees 1 notification
    And the notification message is "Todas as notas da turma foram lançadas. Você está no primeiro quartil da turma (grupo dos 25% com menor desempenho)."
    And the notifications page shows nothing about "Ana Test", "Bia Test" or "Caio Test"

  Scenario: The same completion does not generate duplicate notifications
    When the "Refactoring" grade is entered for "Ana Test"
    And the "Refactoring" grade is entered for "Bia Test"
    And the "Refactoring" grade is entered for "Caio Test"
    And the "Refactoring" grade is entered for "Davi Test"
    And the "Refactoring" grade is entered for "Davi Test"
    And "Davi Test" opens the notifications tab
    Then "Davi Test" sees 1 notification
