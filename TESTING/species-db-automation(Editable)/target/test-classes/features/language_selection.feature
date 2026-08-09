Feature: Language selection during onboarding

  Scenario: Select language on first launch
    Given app is launched for the first time
    When user sees language selection screen
    And user selects "English"
    And user taps Continue
    Then selected language should be applied
    And onboarding screen should be displayed
