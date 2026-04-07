Feature: Category 18 - Language & Localization
  As a user
  I want the application to support multiple languages
  So that all content is displayed correctly in my selected language

  @C18_T1
  Scenario: Language selection option visibility
    Given user opens Settings or Language menu
    Then language selection option should be visible and enabled
    And supported languages should be listed clearly

  @C18_T2
  Scenario: Change app language successfully
    When user selects a different language
    Then app UI should reload or update language
    And all visible text should change to selected language

  @C18_T3
  Scenario: Language persistence after app restart
    Given user changes app language
    When app is closed and relaunched
    Then selected language should be preserved

  @C18_T4
  Scenario: Home screen localization
    Given app language is set to non-default language
    When user navigates to Home screen
    Then all labels and messages should be localized

  @C18_T5
  Scenario: Search and filter localization
    When user performs search and filter in selected language
    Then search placeholders and filters should be localized
    And no mixed language UI should appear

  @C18_T6
  Scenario: Species detail localization
    When user opens species detail page
    Then headings descriptions and labels should be localized
    And content should match selected language dataset

  @C18_T7
  Scenario: Decision tree localization
    When user launches decision tree identifier
    Then all questions and options should appear in selected language

  @C18_T8
  Scenario: Identify by photo localization
    When user launches identify by photo feature
    Then prompts permissions and results should be localized

  @C18_T9
  Scenario: Video and media label localization
    When user opens video tutorial or image gallery
    Then captions titles and labels should be localized

  @C18_T10
  Scenario: Error message localization
    When error scenario is triggered
    Then error messages should appear in selected language

  @C18_T11
  Scenario: Offline mode localization
    Given internet connection is disabled
    When user navigates app offline
    Then offline indicators and messages should be localized

  @C18_T12
  Scenario: Language specific data sync
    Given user changes app language
    When user performs data sync
    Then language specific data should be downloaded correctly

  @C18_T13
  Scenario: Text overflow and truncation
    Given selected language has long text
    When user navigates across screens
    Then no text should overflow or overlap

  @C18_T14
  Scenario: Font rendering and special characters
    When user switches to language with special characters
    Then characters should render correctly

  @C18_T15
  Scenario: Language switch during active session
    Given user is actively using the app
    When user switches language mid-session
    Then UI should update without crash

  @C18_T16
  Scenario: Language on low end device
    Given user is using a low-end device
    When user switches language repeatedly
    Then app should remain stable

  @C18_T17
  Scenario: Language accessibility basics
    When user reviews localized UI
    Then text should be readable and accessible

  @C18_T18
  Scenario: Language data update after sync
    When user syncs data after language change
    Then new translations should be reflected correctly

  @C18_T19
  Scenario: Language fallback behavior
    Given translation key is missing
    When user navigates to affected screen
    Then fallback language behavior should work correctly

  @C18_T20
  Scenario: Language and localization regression check
    When all localization tests are executed
    Then no regression should be found
    And story should be ready for sprint sign-off

