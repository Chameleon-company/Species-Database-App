@category1 @app_entry @wip
Feature: App Entry & First-Time Setup
  This feature validates application behavior during first launch,
  onboarding, permissions, language selection, and setup stability.

  # C1_T1_Fresh_App_Launch
  Scenario: App launch on fresh installation
    Given app is installed for the first time
    When user launches the app
    Then app loading screen should be displayed
    And welcome or onboarding screen should appear

  # C1_T2_App_Launch_On_Low_End_Device
  Scenario: App launch on low-end device with limited resources
    Given app is installed on a low performance device or slow network
    When user launches the app
    Then app should display loading screen without freezing
    And app should not crash during startup

  # C1_T3_Loading_Screen_Visibility
  Scenario: Loading screen visibility during app startup
    When user launches the app
    Then loading indicator or animation should be visible
    And no blank or white screen should be displayed

  # C1_T4_Loading_To_Welcome_Transition
  Scenario: Transition from loading screen to welcome screen
    When user launches the app
    Then app should automatically navigate to welcome screen
    And transition should be smooth without UI flicker

  # C1_T5_Welcome_Screen_Content_Validation
  Scenario: Welcome screen content validation
    Given user is on welcome screen
    Then app title and description should be displayed correctly
    And continue or get started button should be visible and clickable
    And default language content should be shown correctly

  # C1_T6_Onboarding_Flow_Sequence
  Scenario: Sequential onboarding flow navigation
    Given user starts onboarding flow
    When user navigates through onboarding screens
    Then instructional text and images should be visible on each screen
    And final onboarding screen should navigate to next setup step

  # C1_T7_Onboarding_Skip_Functionality
  Scenario: Skip onboarding during first-time setup
    Given user is in onboarding flow
    When user taps skip option
    Then onboarding should be bypassed
    And user should be redirected to language selection or home screen

  # C1_T8_First_Time_Language_Selection_English
  Scenario: First-time language selection as English
    Given user is on language selection screen
    When user selects English language
    Then language selection should be confirmed
    And all subsequent UI text should appear in English

  # C1_T9_First_Time_Language_Selection_Tetum
  Scenario: First-time language selection as Tetum
    Given user is on language selection screen
    When user selects Tetum language
    Then language selection should be confirmed
    And all UI text should appear in Tetum

  # C1_T10_Language_Persistence_After_Restart
  Scenario: Language persistence after app restart
    Given user has selected a language during setup
    When user closes and relaunches the app
    Then previously selected language should be retained

  # C1_T11_Offline_Storage_Permission_Prompt
  Scenario: Offline storage permission prompt on first launch
    Given app is freshly installed
    When user launches the app
    Then offline storage permission prompt should be displayed
    And permission message should be clear and understandable

  # C1_T12_Offline_Storage_Permission_Allow
  Scenario: Allow offline storage permission
    Given offline storage permission prompt is displayed
    When user allows the permission
    Then permission should be granted successfully
    And app should proceed to next setup step
    And no error message should be shown

  # C1_T13_Offline_Storage_Permission_Deny
  Scenario: Deny offline storage permission
    Given offline storage permission prompt is displayed
    When user denies the permission
    Then warning or informational message should be displayed
    And app should remain functional with limited features
    And app should not crash

  # C1_T14_Permission_Retry_Mechanism
  Scenario: Retry permission flow after denial
    Given offline storage permission was denied
    When user restarts the app
    Then permission request should be shown again or accessible via settings
    And permission retry flow should work correctly

  # C1_T15_First_Launch_Without_Internet
  Scenario: First app launch without internet connection
    Given internet connection is disabled
    When user launches the app for the first time
    Then offline warning message should be displayed
    And app should not crash
    And setup flow should continue

  # C1_T16_First_Launch_With_Internet
  Scenario: First app launch with active internet connection
    Given stable internet connection is available
    When user launches the app for the first time
    Then initial data synchronization should be triggered
    And successful sync confirmation should be shown

  # C1_T17_Back_Navigation_During_Onboarding
  Scenario: Back navigation during onboarding flow
    Given user is in onboarding flow
    When user presses device back button
    Then previous onboarding screen should be displayed
    And app should not exit unexpectedly

  # C1_T18_App_Minimize_And_Restore_During_Setup
  Scenario: Minimize and restore app during setup
    Given user is in setup flow
    When user minimizes and restores the app
    Then current setup state should be preserved

  # C1_T19_Screen_Rotation_During_Setup
  Scenario: Screen rotation during setup screens
    Given user is in setup screens
    When device orientation is rotated
    Then UI should adjust correctly
    And no data loss or crash should occur

  # C1_T20_Consistent_Behaviour_On_Multiple_Launches
  Scenario: Consistent behavior on multiple app launches
    Given user has completed first-time setup
    When user launches the app multiple times
    Then app should directly open home screen
    And onboarding or setup screens should not reappear

