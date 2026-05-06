Feature: Category 11 - Decision-Tree Species Identifier
  As a user
  I want to identify species using a decision-tree flow
  So that I can determine the correct species step by step

  @C11_T1
  Scenario: Decision-tree entry point visibility
    Given user is on the Home screen
    Then decision-tree identifier option should be visible
    And option should be enabled and localized correctly

  @C11_T2
  Scenario: Decision-tree launch
    When user launches decision-tree identifier
    Then decision-tree flow screen should open
    And first question should be displayed correctly

  @C11_T3
  Scenario: First question content validation
    When user views the first decision-tree question
    Then question text should be clear
    And YES and NO options should be visible and clickable

  @C11_T4
  Scenario: YES option navigation
    When user selects YES option
    Then decision-tree should navigate to correct next step

  @C11_T5
  Scenario: NO option navigation
    When user selects NO option
    Then decision-tree should navigate to alternate branch correctly

  @C11_T6
  Scenario: Multiple level decision-tree flow
    When user progresses through multiple decision-tree questions
    Then each transition should follow defined logic
    And no steps should be skipped or duplicated

  @C11_T7
  Scenario: Final species identification result
    When user completes the decision-tree flow
    Then final species identification result should be displayed
    And result should match decision-tree logic

  @C11_T8
  Scenario: Result navigation to Species Detail page
    Given final species identification result is displayed
    When user taps on suggested species
    Then Species Detail page should open correctly

  @C11_T9
  Scenario: Reset decision-tree flow
    When user resets the decision-tree flow
    Then flow should restart from the first question
    And no previous state should remain

  @C11_T10
  Scenario: Back navigation in decision-tree
    Given user is mid-way in decision-tree flow
    When user navigates back
    Then previous question should be displayed correctly

  @C11_T11
  Scenario: Decision-tree offline functionality
    Given internet connection is disabled
    When user completes decision-tree flow
    Then correct identification result should be produced offline

  @C11_T12
  Scenario: Partial data offline handling
    Given internet connection is disabled
    When some decision-tree media is missing
    Then text-based questions should still function
    And placeholder message should be shown for missing media

  @C11_T13
  Scenario: Decision-tree language consistency
    Given app language is changed
    When user launches decision-tree identifier
    Then all questions and options should appear in selected language

  @C11_T14
  Scenario: Decision-tree state persistence
    Given user is mid-way in decision-tree flow
    When app is minimized and restored
    Then current decision-tree step should be preserved

  @C11_T15
  Scenario: Decision-tree on low-end device
    Given user is on low-end device
    When user completes decision-tree flow
    Then performance should remain acceptable

  @C11_T16
  Scenario: Invalid decision path handling
    When decision-tree data is corrupted or incomplete
    Then app should show fallback error message
    And app should remain stable

  @C11_T17
  Scenario: Decision-tree accessibility basics
    When user reviews decision-tree controls
    Then YES and NO buttons should be accessible and readable

  @C11_T18
  Scenario: Decision-tree update after data sync
    When data sync is completed
    Then updated decision-tree logic should be reflected

  @C11_T19
  Scenario: Decision-tree error recovery
    When decision-tree fails to load due to error
    Then user friendly error message should be displayed
    And retry option should be available if applicable

  @C11_T20
  Scenario: Decision-tree regression check
    When decision-tree scenarios are executed on new build
    Then no regression issues should be observed
    And story should be ready for sprint sign-off

