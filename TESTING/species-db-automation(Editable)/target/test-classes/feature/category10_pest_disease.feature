Feature: Category 10 - Pest & Disease Information
  As a user
  I want to view pest and disease information
  So that I can protect and maintain species health

  @C10_T1
  Scenario: Pest and disease section visibility
    Given user is on Species Detail page with pest and disease data
    Then pest and disease section should be visible
    And section header should be clearly labeled

  @C10_T2
  Scenario: Pest and disease content completeness
    When user views pest and disease information
    Then all listed pests and diseases should be displayed
    And content should match backend data

  @C10_T3
  Scenario: Pest and disease description clarity
    When user reads pest and disease descriptions
    Then descriptions should be clear and actionable

  @C10_T4
  Scenario: Pest and disease prevention guidance
    When preventive guidance is available
    Then guidance steps should be logically ordered
    And aligned with species context

  @C10_T5
  Scenario: Pest and disease visual association
    When pest and disease visuals are present
    Then visuals should load correctly
    And map to correct pest or disease

  @C10_T6
  Scenario: Offline access to pest and disease content
    Given internet connection is disabled
    When user opens previously viewed Species Detail page
    Then pest and disease content should load offline

  @C10_T7
  Scenario: Partial offline content handling
    Given internet connection is disabled
    When some pest or disease media is missing
    Then text content should remain available
    And appropriate placeholder message should be shown

  @C10_T8
  Scenario: Pest and disease language consistency
    Given app language is changed
    When user opens pest and disease section
    Then content should update to selected language

  @C10_T9
  Scenario: Pest and disease scroll behavior
    When user scrolls long pest and disease content
    Then scrolling should be smooth
    And app should remain responsive

  @C10_T10
  Scenario: Pest and disease content update after sync
    When data sync is completed
    Then pest and disease content should reflect updated data

  @C10_T11
  Scenario: Pest and disease invalid data handling
    When pest or disease data is missing or malformed
    Then fallback message should be displayed
    And app should not crash

  @C10_T12
  Scenario: Pest and disease state persistence
    When app is minimized on pest and disease section
    And app is restored
    Then scroll position and content state should be preserved

  @C10_T13
  Scenario: Pest and disease on low-end device
    Given user is on low-end device
    When user views pest and disease content
    Then performance should remain acceptable

  @C10_T14
  Scenario: Pest and disease accessibility basics
    When user reviews pest and disease content
    Then accessibility standards should be satisfied

  @C10_T15
  Scenario: Pest and disease error recovery
    When pest and disease content fails to load
    Then user friendly error message should be shown
    And retry option should be available if applicable

  @C10_T16
  Scenario: Pest and disease regression content check
    When pest and disease content is compared across builds
    Then no unintended changes should be observed

  @C10_T17
  Scenario: Pest and disease print or share restriction
    When user attempts to print or share pest and disease content
    Then behavior should follow defined requirements

  @C10_T18
  Scenario: Pest and disease content length validation
    When user reviews pest and disease content length
    Then content length should be appropriate
    And no text overflow should occur

  @C10_T19
  Scenario: Pest and disease content regression
    When pest and disease scenarios are executed after new build
    Then no regression issues should be observed

  @C10_T20
  Scenario: Pest and disease regression check
    When full pest and disease regression is executed
    Then all test cases should pass
    And story should be ready for sprint sign-off

