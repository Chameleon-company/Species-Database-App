Feature: Category 17 - Data Sync & Versioning
  As a user
  I want reliable data synchronization and version control
  So that app data remains updated and consistent

  @C17_T1
  Scenario: Sync option visibility when online
    Given internet connection is enabled
    When user navigates to Home or Settings
    Then sync option should be visible and enabled
    And sync option should be localized correctly

  @C17_T2
  Scenario: Manual sync initiation
    Given device is online
    When user taps manual sync option
    Then sync process should start
    And loading indicator should be displayed

  @C17_T3
  Scenario: Sync success confirmation
    When user completes manual sync
    Then success message should be displayed
    And app should return to stable state

  @C17_T4
  Scenario: Sync failure error message
    Given network is unstable
    When sync is interrupted during process
    Then sync failure message should be displayed
    And retry guidance should be provided

  @C17_T5
  Scenario: Automatic sync on app launch
    Given internet connection is enabled
    When user launches the app
    Then automatic sync should trigger
    And no user interaction should be required

  @C17_T6
  Scenario: Incremental sync only new data
    Given initial full sync is completed
    When backend data is updated and sync is triggered again
    Then only incremental changes should be downloaded

  @C17_T7
  Scenario: Version number update after sync
    When user performs successful sync
    Then dataset version number should increment correctly
    And version should match backend

  @C17_T8
  Scenario: Version display visibility
    When user navigates to App Info screen
    Then current dataset version should be visible
    And version format should be correct

  @C17_T9
  Scenario: Sync while app in use
    Given user is actively using the app
    When sync runs in parallel
    Then app should remain responsive
    And user flow should not be interrupted

  @C17_T10
  Scenario: Sync resume after interruption
    Given sync is in progress
    When network interruption occurs and is restored
    Then sync should resume or retry safely

  @C17_T11
  Scenario: Sync data integrity
    When user browses data after sync
    Then no duplicate or corrupted data should appear
    And data consistency should be maintained

  @C17_T12
  Scenario: Sync language specific data
    Given app language is English
    When sync is performed and language is switched
    Then language specific data should be synced correctly

  @C17_T13
  Scenario: Sync offline restriction
    Given internet connection is disabled
    When user attempts to initiate sync
    Then sync should be blocked gracefully
    And offline message should be displayed

  @C17_T14
  Scenario: Sync on low-end device
    Given user is using a low-end device
    When data sync is initiated
    Then performance should be acceptable
    And app should not freeze or crash

  @C17_T15
  Scenario: Background sync behavior
    Given sync is running
    When app is minimized and restored
    Then sync result should be reflected correctly

  @C17_T16
  Scenario: Sync state persistence on app restart
    Given sync is interrupted by app restart
    When app is relaunched
    Then sync state should be recovered safely

  @C17_T17
  Scenario: Sync with partial local data
    Given some local cached data is cleared
    When sync is performed
    Then missing data should be restored correctly
    And valid data should not be overwritten

  @C17_T18
  Scenario: Sync error logging
    When sync failure occurs
    Then error details should be logged correctly
    And logs should support QA debugging

  @C17_T19
  Scenario: Sync accessibility and messaging
    When user observes sync messages
    Then text and indicators should be accessible
    And no UI overlap should occur

  @C17_T20
  Scenario: Sync and versioning regression check
    When sync and versioning tests are executed
    Then no regression should be detected
    And story should be ready for sprint sign-off

