Feature: Language default selection

  Scenario: Default language selection on app launch
    Given application is launched
    Then English AU radio button should be selected
    And Tetum radio button should be unselected

  Scenario: Selecting Tetum updates selected language section
    Given application is launched
    When user selects Tetum language
    Then selected language should change to Tetum
    And Tetum radio button should be selected
    And English AU radio button should be unselected
