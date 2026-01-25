@Automation

Feature: Language selection screen

  Scenario: Default language selection on launch
    Given the application is launched
    Then "ENGLISH AU" should be selected in You Selected section
    And "ENGLISH AU" should be selected in All Languages section
    And "Tetum" should be unselected in All Languages section

  Scenario: Change language from ENGLISH AU to Tetum
    Given the application is launched
    When the user selects "Tetum" from All Languages
    Then "Tetum" should be selected in You Selected section
    And "Tetum" should be selected in All Languages section
    And "ENGLISH AU" should be unselected in All Languages section
