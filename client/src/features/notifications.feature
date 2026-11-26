@notifications
Feature: Quartile change notifications
  As a student
  I want to be notified when my performance quartile in a class changes
  So that I know how my relative performance evolved, without seeing anyone else's data

  # Every student has all 6 grades, so the class is complete and each student already
  # received the classification notification. Only the changes below are new.
  Background:
    Given a complete class with four graded students:
      | name      | cpf            | requirements | design | quartile |
      | Ana Test  | 901.000.000-01 | MA           | MA     | 4        |
      | Bia Test  | 901.000.000-02 | MPA          | MPA    | 3        |
      | Caio Test | 901.000.000-03 | MANA         | MPA    | 2        |
      | Davi Test | 901.000.000-04 | MANA         | MANA   | 1        |

  Scenario: A student who moves up a quartile is notified
    When the design grade of "Davi Test" is updated to "MA"
    And "Davi Test" opens the notifications tab
    Then "Davi Test" sees 2 notifications
    And the notifications include a quartile change from "Q1" to "Q2"
    And the "Evolução" notification is unread
    And the notifications include the message "Parabéns! Seu desempenho apresentou evolução e você avançou para o segundo quartil da turma."
    And every notification shows when it was generated

  Scenario: A student who moves down a quartile is notified
    When the design grade of "Davi Test" is updated to "MA"
    And "Caio Test" opens the notifications tab
    Then "Caio Test" sees 2 notifications
    And the notifications include a quartile change from "Q2" to "Q1"
    And the "Redução" notification is unread
    And the notifications include the message "Seu desempenho apresentou uma redução em relação à avaliação anterior. Confira os conteúdos e identifique oportunidades de melhoria."

  Scenario: A student who stays in the same quartile is not notified of a change
    When the design grade of "Davi Test" is updated to "MA"
    And "Ana Test" opens the notifications tab
    Then "Ana Test" sees only the classification notification

  Scenario: An evaluation update that changes no quartile generates no notification
    When the design grade of "Ana Test" is updated to "MPA"
    And the design grade of "Caio Test" is updated to "MA"
    Then "Ana Test" has only the classification notification on the notifications tab
    And "Bia Test" has only the classification notification on the notifications tab
    And "Caio Test" has only the classification notification on the notifications tab
    And "Davi Test" has only the classification notification on the notifications tab

  Scenario: The same change does not generate duplicate notifications
    When the design grade of "Davi Test" is updated to "MA"
    And the design grade of "Davi Test" is updated to "MA"
    And "Davi Test" opens the notifications tab
    Then "Davi Test" sees 2 notifications

  Scenario: A student does not see data of other students
    When the design grade of "Davi Test" is updated to "MA"
    And "Davi Test" opens the notifications tab
    Then the notifications page shows nothing about "Caio Test", "Ana Test" or "Bia Test"

  Scenario: A student can mark a notification as read
    When the design grade of "Davi Test" is updated to "MA"
    And "Davi Test" opens the notifications tab
    And "Davi Test" marks the "Evolução" notification as read
    Then the "Evolução" notification is read
