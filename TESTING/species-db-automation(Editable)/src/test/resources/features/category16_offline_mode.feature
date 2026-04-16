Feature: Category 16 - Offline Mode & Data
  As a user
  I want the app to function correctly in offline mode
  So that I can access cached data without internet

  @C16_T1
  Scenario: Offline mode detection on app launch
    Given internet connection is disabled
    When user launches the application
    Then app should detect offline mode
    And offline indicator should be displayed

  @C16_T2
  Scenario: Offline indicator visibility
    Given app is launched in offline mode
    When user navigates to Home screen
    Then offline indicator should be clearly visible
    And indicator should not obstruct primary UI elements

  @C16_T3
  Scenario: Access cached data offline
    Given internet connection is disabled
    When user opens Search or Results list
    Then cached species data should load successfully
    And no network error should be shown

  @C16_T4
  Scenario: Access species detail offline
    Given internet connection is disabled
    When user opens a previously viewed species detail page
    Then text content and cached media should load correctly
    And app should remain responsive

  @C16_T5
  Scenario: Partial data offline handling
    Given internet connection is disabled
    When user opens species detail with partially cached data
    Then available content should load correctly
    And missing content message should be displayed

  @C16_T6
  Scenario: Offline search functionality
    Given internet connection is disabled
    When user performs search using local data
    Then search results should be returned correctly
    And search performance should be acceptable

  @C16_T7
  Scenario: Offline filter functionality
    Given internet connection is disabled
    When user applies filters on cached dataset
    Then filtered results should be displayed accurately
    And no network call should be made

  @C16_T8
  Scenario: Offline navigation stability
    Given internet connection is disabled
    When user navigates across app screens
    Then navigation should be smooth
    And no crash or freeze should occur

  @C16_T9
  Scenario: Offline action restriction
    Given internet connection is disabled
    When user attempts internet dependent action
    Then restriction message should be displayed
    And app should not retry failing network calls

  @C16_T10
  Scenario: Offline to online transition
    Given app is running in offline mode
    When internet connection is enabled
    Then app should detect connectivity change
    And sync or online indicator should become available

  @C16_T11
  Scenario: Online to offline transition
    Given app is running online
    When internet connection is disabled
    Then app should switch to offline mode gracefully
    And current screen should not be disrupted

  @C16_T12
  Scenario: Offline data integrity
    Given user accesses cached data offline
    Then data should be accurate and consistent
    And no corrupted data should appear

  @C16_T13
  Scenario: Offline data persistence after restart
    Given internet connection is disabled
    When app is closed and relaunched
    Then cached data should remain accessible offline

  @C16_T14
  Scenario: Offline storage usage visibility
    When user opens Offline Content Manager
    Then cached data size should be displayed correctly
    And information should be readable and localized

  @C16_T15
  Scenario: Offline data clear functionality
    Given user opens Offline Content Manager
    When user clears cached data
    Then offline data should be removed successfully
    And offline access should no longer be available

  @C16_T16
  Scenario: Offline data clear confirmation
    When user initiates offline data clear action
    Then confirmation prompt should be displayed
    And data should be cleared only after confirmation

  @C16_T17
  Scenario: Offline mode on low-end device
    Given user is using a low-end device
    When app is used completely offline
    Then performance should be acceptable
    And app should not crash or freeze

  @C16_T18
  Scenario: Offline error recovery
    Given local storage access failure occurs
    When user tries to load cached data
    Then user friendly error message should be displayed
    And app should remain stable

  @C16_T19
  Scenario: Offline UI accessibility basics
    When user views offline indicators and messages
    Then text and controls should be accessible
    And no UI overlap should occur

  @C16_T20
  Scenario: Offline mode regression check
    When offline mode test suite is executed
    Then no regression should be detected
    And story should be ready for sprint sign-off

