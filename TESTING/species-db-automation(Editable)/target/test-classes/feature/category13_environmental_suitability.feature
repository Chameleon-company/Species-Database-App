Feature: Category 13 - Environmental Suitability Checker
  As a user
  I want to evaluate environmental conditions
  So that I can find species suitable for my environment

  @C13_T1
  Scenario: Suitability Checker entry visibility
    Given user is on the Home screen
    Then Environmental Suitability Checker option should be visible and enabled
    And entry point should be localized and accessible offline

  @C13_T2
  Scenario: Launch suitability checker screen
    When user opens Environmental Suitability Checker
    Then suitability checker screen should open successfully
    And input fields and instructions should be visible

  @C13_T3
  Scenario: Input field visibility and labels
    Then all required environmental input fields should be visible
    And field labels should be clear and localized

  @C13_T4
  Scenario: Valid input submission
    When user enters valid environmental inputs
    And user submits suitability form
    Then suitability evaluation should be triggered
    And results should be displayed correctly

  @C13_T5
  Scenario: Missing required input validation
    When user submits suitability form with missing inputs
    Then validation message should be displayed
    And submission should be blocked

  @C13_T6
  Scenario: Invalid input range handling
    When user enters out of range environmental values
    And user submits suitability form
    Then appropriate error message should be displayed
    And app should remain stable

  @C13_T7
  Scenario: Input type restriction
    When user enters invalid characters in numeric fields
    Then input should be rejected or sanitized

  @C13_T8
  Scenario: Suitability result display
    Given valid environmental inputs are submitted
    Then suitable species results should be displayed

  @C13_T9
  Scenario: No suitable species result
    When user submits environmental inputs with no matching species
    Then no suitable species found message should be displayed

  @C13_T10
  Scenario: Navigate from result to Species Detail
    Given suitability results are displayed
    When user selects a recommended species
    Then Species Detail page should open

  @C13_T11
  Scenario: Suitability checker offline functionality
    Given internet connection is disabled
    When user runs suitability checker
    Then evaluation should work using local data

  @C13_T12
  Scenario: Partial offline data handling
    Given internet connection is disabled
    When suitability data is partially unavailable
    Then fallback or warning message should be shown

  @C13_T13
  Scenario: Language consistency in checker
    Given app language is changed
    When user opens suitability checker
    Then all labels and messages should appear in selected language

  @C13_T14
  Scenario: Checker state persistence on minimize
    Given user has entered partial suitability inputs
    When app is minimized and restored
    Then entered values should be preserved

  @C13_T15
  Scenario: Suitability checker on low-end device
    Given user is on a low-end device
    When user runs suitability checker
    Then app should remain responsive

  @C13_T16
  Scenario: Suitability data update after sync
    When data sync is completed
    And user runs suitability checker
    Then results should reflect updated dataset

  @C13_T17
  Scenario: Invalid species mapping handling
    When suitability data contains invalid mappings
    Then app should handle the scenario gracefully

  @C13_T18
  Scenario: Suitability checker accessibility basics
    Then suitability checker UI should be accessible and readable

  @C13_T19
  Scenario: Suitability checker error recovery
    When suitability evaluation fails
    Then user-friendly error message should be displayed
    And retry option should be available

  @C13_T20
  Scenario: Suitability checker regression check
    When suitability checker scenarios are executed on new build
    Then no regression issues should be observed
    And story should be ready for sprint sign-off

