Feature: Category 19 - Settings & Preferences
  As a user
  I want to manage application settings and preferences
  So that my choices persist and work correctly

  @C19_T1
  Scenario: Settings entry visibility
    Given user is on Home or Menu screen
    Then Settings option should be visible and enabled
    And Settings label should be localized correctly

  @C19_T2
  Scenario: Open Settings screen
    When user taps on Settings option
    Then Settings screen should open successfully
    And all sections should render correctly

  @C19_T3
  Scenario: Settings sections visibility
    When user views Settings screen
    Then Language Offline Data Sync Notifications and About sections should be visible
    And all section labels should be localized

  @C19_T4
  Scenario: Change language from Settings
    When user changes language from Settings
    Then app UI should update to selected language

  @C19_T5
  Scenario: Offline data settings access
    When user opens Offline Data settings
    Then cached data information should be displayed correctly

  @C19_T6
  Scenario: Clear offline data from Settings
    When user selects Clear Offline Data option
    Then confirmation dialog should appear
    And data should be cleared only after confirmation

  @C19_T7
  Scenario: Sync settings access
    When user opens Sync settings
    Then sync options should be visible
    And options should reflect connectivity state

  @C19_T8
  Scenario: Enable or disable auto sync
    When user toggles Auto Sync option
    Then auto sync preference should be saved correctly

  @C19_T9
  Scenario: Settings persistence after app restart
    Given user modifies multiple settings
    When app is closed and relaunched
    Then all settings should persist correctly

  @C19_T10
  Scenario: Settings persistence in offline mode
    Given internet connection is disabled
    When user modifies settings and restarts app
    Then settings changes should be retained offline

  @C19_T11
  Scenario: Notifications settings visibility
    When user opens Notifications settings
    Then notification options should be visible and localized

  @C19_T12
  Scenario: Permission redirection from Settings
    Given required permission is denied
    When user opens Permissions from Settings
    Then user should be guided to system settings safely

  @C19_T13
  Scenario: About app information display
    When user opens About section
    Then app version dataset version and build info should be displayed correctly

  @C19_T14
  Scenario: Settings on low end device
    Given user is using a low-end device
    When user interacts with Settings screen
    Then app should remain responsive and stable

  @C19_T15
  Scenario: Settings accessibility basics
    When user reviews Settings UI
    Then text contrast spacing and touch targets should be accessible

  @C19_T16
  Scenario: Reset settings to default
    Given user modifies multiple settings
    When user resets settings to default
    Then settings should revert to default values

  @C19_T17
  Scenario: Settings error handling
    Given local storage failure occurs
    When user attempts to update settings
    Then user friendly error message should be shown

  @C19_T18
  Scenario: Settings state during data sync
    Given user modifies settings
    When data sync is triggered
    Then settings should remain unchanged

  @C19_T19
  Scenario: Settings UI localization check
    When user switches app language
    And navigates through Settings
    Then all Settings labels should be localized

  @C19_T20
  Scenario: Settings regression check
    When all Settings test cases are executed
    Then no regression should be found
    And story should be ready for sprint sign-off

