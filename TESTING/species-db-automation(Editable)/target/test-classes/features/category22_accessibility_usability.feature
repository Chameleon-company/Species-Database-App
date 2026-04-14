Feature: Category 22 - Accessibility & Usability
  As a user with diverse abilities
  I want the app to be accessible and easy to use
  So that everyone can use it comfortably

  @C22_T1
  Scenario: Accessibility basics compliance
    When user navigates across primary screens
    Then touch targets should meet minimum size
    And UI elements should not be crowded

  @C22_T2
  Scenario: Text readability and contrast
    When user views screens in different lighting
    Then text contrast should meet accessibility guidelines

  @C22_T3
  Scenario: Font scaling support
    Given system font size is increased
    When app is relaunched
    Then text should scale without truncation

  @C22_T4
  Scenario: Screen reader support
    Given screen reader is enabled
    When user navigates UI elements
    Then important elements should be announced correctly

  @C22_T5
  Scenario: Button label clarity
    When user reviews interactive controls
    Then button labels should clearly describe actions

  @C22_T6
  Scenario: Form input usability
    When user enters data in input fields
    Then fields should be easy to interact with
    And validation messages should be clear

  @C22_T7
  Scenario: Error message usability
    When user triggers an error
    Then error message should explain issue and next steps

  @C22_T8
  Scenario: Navigation consistency
    When user navigates across screens
    Then navigation behavior should be consistent

  @C22_T9
  Scenario: Discoverability of key features
    Given user is first time user
    When user explores the app
    Then key features should be easy to discover

  @C22_T10
  Scenario: Usability of offline mode
    Given app is offline
    When user uses offline features
    Then limitations should be clearly communicated

  @C22_T11
  Scenario: Touch gesture usability
    When user performs common gestures
    Then gestures should behave as expected

  @C22_T12
  Scenario: Content scannability
    When user reads long content sections
    Then content should be easy to scan

  @C22_T13
  Scenario: Consistent iconography
    When user reviews icons across the app
    Then icons should have consistent meaning

  @C22_T14
  Scenario: Feedback on user actions
    When user performs an action
    Then user should receive clear feedback

  @C22_T15
  Scenario: Low end device usability
    Given app runs on low end device
    When user performs core flows
    Then usability should remain acceptable

  @C22_T16
  Scenario: Language usability check
    When user switches app language
    Then translated text should remain usable

  @C22_T17
  Scenario: Orientation usability
    When user rotates device orientation
    Then layout should adapt correctly

  @C22_T18
  Scenario: Accessibility error recovery
    Given accessibility features are enabled
    When an error occurs
    Then accessibility support should remain intact

  @C22_T19
  Scenario: Usability regression check
    When usability is compared across builds
    Then no regression should be found

  @C22_T20
  Scenario: Accessibility and usability regression check
    When full accessibility suite is executed
    Then app should meet accessibility guidelines
    And story should be ready for sprint sign off

