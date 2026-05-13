Feature: Category 9 - Seed Germination & Cultivation Guides
  As a user
  I want to view seed germination and cultivation guidance
  So that I can grow species correctly and confidently

  @C9_T1
  Scenario: Germination section visibility
    Given user is on Species Detail page with germination content
    Then germination section should be visible
    And section header should be clearly labeled

  @C9_T2
  Scenario: Germination content completeness
    When user views germination section
    Then all required germination steps should be present
    And content should match backend records

  @C9_T3
  Scenario: Germination step order
    When user reads germination steps sequentially
    Then steps should be displayed in logical order

  @C9_T4
  Scenario: Germination text readability
    When user views germination content on mobile device
    Then text should be readable and properly formatted

  @C9_T5
  Scenario: Cultivation guide visibility
    When user scrolls beyond germination steps
    Then cultivation guidance section should be visible

  @C9_T6
  Scenario: Cultivation content accuracy
    When user reviews cultivation instructions
    Then information should align with species-specific data

  @C9_T7
  Scenario: Offline access to germination content
    Given internet connection is disabled
    When user opens previously viewed Species Detail page
    Then germination and cultivation content should load offline

  @C9_T8
  Scenario: Partial offline content handling
    Given internet connection is disabled
    When some media is missing
    Then text instructions should still load
    And appropriate placeholder message should be shown

  @C9_T9
  Scenario: Germination with linked video
    When user taps germination-related video link
    Then video player should open
    And correct video should be associated

  @C9_T10
  Scenario: Germination language consistency
    Given app language is changed
    When user opens germination section
    Then content should update to selected language

  @C9_T11
  Scenario: Germination state persistence
    When app is minimized on germination section
    And app is restored
    Then scroll position and content state should be preserved

  @C9_T12
  Scenario: Germination scroll performance
    When user scrolls long germination content
    Then scrolling should be smooth and responsive

  @C9_T13
  Scenario: Germination on low-end device
    Given user is on low-end device
    When user views germination content
    Then performance should remain acceptable

  @C9_T14
  Scenario: Germination data update after sync
    When data sync is completed
    Then germination content should reflect updated data

  @C9_T15
  Scenario: Germination invalid data handling
    When germination data is missing or malformed
    Then fallback message should be displayed
    And app should not crash

  @C9_T16
  Scenario: Germination accessibility basics
    When user reviews germination content
    Then accessibility standards should be satisfied

  @C9_T17
  Scenario: Germination print or share restriction
    When user attempts to print or share germination content
    Then behavior should follow defined requirements

  @C9_T18
  Scenario: Germination error recovery
    When germination content fails to load
    Then error or fallback message should be shown
    And retry option should be available if applicable

  @C9_T19
  Scenario: Germination content regression
    When germination content is compared across builds
    Then no unintended changes should be observed

  @C9_T20
  Scenario: Germination regression check
    When germination scenarios are executed on new build
    Then no regression issues should be observed

