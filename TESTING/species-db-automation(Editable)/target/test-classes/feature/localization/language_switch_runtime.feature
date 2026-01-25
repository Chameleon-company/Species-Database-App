Feature: Runtime language switch

  Scenario: Change language from home screen
    Given user is on home screen
    When user taps language switch button
    And selects "Tetum"
    Then app language should change immediately
    And all visible text should be localized
