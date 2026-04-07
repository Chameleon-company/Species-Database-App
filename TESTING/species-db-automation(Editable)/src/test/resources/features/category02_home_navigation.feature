@category2 @home @navigation @wip
Feature: Home Screen & Primary Navigation
  This feature validates Home screen loading, UI elements,
  navigation flows, state persistence, and stability.

  # C2_T1_Home_Screen_Load_Post_Setup
  Scenario: Home screen load after first-time setup
    Given user has completed first-time setup
    When app navigates to Home screen
    Then Home screen should load without delay
    And no blank or partially rendered UI should appear

  # C2_T2_Home_UI_Elements_Visibility
  Scenario: Home screen UI elements visibility
    Given user is on Home screen
    Then search bar, filter option, navigation icons, and primary content should be visible
    And Home screen elements should be properly aligned and readable
    And Home screen UI elements should be touch responsive

  # C2_T3_Default_Home_State
  Scenario: Default Home screen state after launch
    When user launches the app after setup
    Then Home screen should display default state
    And no filters should be applied by default
    And initial species list or guidance text should be shown

  # C2_T4_Navigation_To_Search_Screen
  Scenario: Navigation from Home to Search screen
    Given user is on Home screen
    When user taps on search bar
    Then Search screen should open
    And keyboard should open automatically
    And app should remain responsive

  # C2_T5_Navigation_To_Filter_Screen
  Scenario: Navigation from Home to Filter screen
    Given user is on Home screen
    When user taps on Filter option
    Then Filter screen or modal should open successfully
    And all filter categories should be visible
    And no UI overlap or crash should occur

  # C2_T6_Back_Navigation_From_Filter
  Scenario: Back navigation from Filter to Home
    Given user is on Filter screen from Home
    When user navigates back
    Then user should return to Home screen
    And Home screen state should be preserved

  # C2_T7_Home_Navigation_Offline_Mode
  Scenario: Home navigation in offline mode
    Given internet connection is disabled
    When user reaches Home screen
    Then Home navigation should work offline
    And offline indicator should be displayed correctly

  # C2_T8_Tap_Response_On_Home_Items
  Scenario: Tap response on Home screen elements
    Given user is on Home screen
    When user taps on multiple Home UI elements
    Then each tap should trigger expected action
    And no unresponsive UI elements should exist
    And no accidental multiple navigations should occur

  # C2_T9_Back_Button_Behavior_From_Home
  Scenario: Back button behavior from Home screen
    Given user is on Home screen
    When user presses device back button
    Then exit confirmation dialog should appear if implemented
    And app should not exit abruptly

  # C2_T10_Home_Screen_State_Persistence
  Scenario: Home screen state persistence after navigation
    Given user performs search or filter actions
    When user navigates back to Home screen
    Then previous Home state should be retained or reset as per requirement
    And no unexpected refresh should occur

  # C2_T11_Home_Screen_Reload_On_App_Restore
  Scenario: Home screen reload on app restore
    Given user is on Home screen
    When app is minimized and restored
    Then Home screen should reload correctly
    And no duplicate navigation or data reload issues should occur

  # C2_T12_Screen_Rotation_On_Home
  Scenario: Screen rotation on Home screen
    Given user is on Home screen
    When device orientation is rotated
    Then Home screen layout should adjust correctly
    And no UI distortion or crash should occur

  # C2_T13_Navigation_Performance_On_Low_End_Device
  Scenario: Navigation performance on low-end device
    Given app is running on low-end device
    When user navigates between Home, Search, and Filter
    Then navigation latency should be acceptable
    And app should not freeze or crash

  # C2_T14_Invalid_Navigation_Prevention
  Scenario: Prevention of invalid navigation
    Given user is on Home screen
    When user rapidly taps multiple navigation elements
    Then duplicate or conflicting screens should not open
    And app should handle rapid input gracefully

  # C2_T15_Home_Screen_Accessibility_Basics
  Scenario: Home screen accessibility basics
    Given user is on Home screen
    Then text size, contrast, and touch targets should be appropriate
    And text should be readable without overlap or clipping

  # C2_T16_Home_Screen_Language_Consistency
  Scenario: Home screen language consistency
    Given app language is changed
    When user navigates to Home screen
    Then all Home screen text should update to selected language
    And no mixed language text should be displayed

  # C2_T17_Home_Screen_After_Data_Sync
  Scenario: Home screen after data synchronization
    Given data synchronization is completed
    When user navigates to Home screen
    Then updated content should be displayed correctly
    And no stale or duplicate data should appear

  # C2_T18_Home_Screen_Empty_Data_State
  Scenario: Home screen empty data state
    Given no species data is available
    When user opens Home screen
    Then informative empty state message should be shown
    And app should not crash or display broken UI

  # C2_T19_Home_Screen_Error_Recovery
  Scenario: Home screen error recovery
    Given backend or API failure occurs
    When user navigates to Home screen
    Then user friendly error message should be displayed
    And retry or fallback option should be available

  # C2_T20_Home_Screen_Regression_Check
  Scenario: Home screen regression verification
    Given new build is deployed
    When user performs Home screen navigation
    Then all Home navigation paths should work correctly
    And no previously working feature should be broken

