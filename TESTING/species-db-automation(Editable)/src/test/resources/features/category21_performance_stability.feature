Feature: Category 21 - Performance & Stability
  As a user
  I want the app to be fast and stable
  So that it performs reliably under all conditions

  @C21_T1
  Scenario: App launch time cold start
    Given app is completely killed
    When user launches the app
    Then cold start launch time should meet performance threshold

  @C21_T2
  Scenario: App launch time warm start
    Given app was launched before
    When user relaunches the app from background
    Then warm start time should be within acceptable limits

  @C21_T3
  Scenario: Home screen render performance
    When user navigates to Home screen
    Then all UI elements should render quickly
    And no blank screen should appear

  @C21_T4
  Scenario: Search response time
    When user performs search with cached data
    Then search response time should meet SLA

  @C21_T5
  Scenario: Filter application performance
    When user applies multiple filters on large dataset
    Then filter execution should be within performance limits

  @C21_T6
  Scenario: Species detail load time
    When user opens species detail page
    Then full content should load within acceptable time

  @C21_T7
  Scenario: Image gallery load performance
    When user opens image gallery with multiple images
    Then thumbnails and images should load smoothly

  @C21_T8
  Scenario: Video playback performance
    When user plays tutorial video
    Then buffering should be minimal
    And audio video should remain in sync

  @C21_T9
  Scenario: Offline mode performance
    Given app is offline
    When user navigates core screens
    Then app should remain responsive

  @C21_T10
  Scenario: Data sync performance
    When user initiates data sync
    Then sync should complete within defined time
    And app should remain usable

  @C21_T11
  Scenario: Memory usage normal flow
    When user uses app for extended session
    Then memory usage should remain stable

  @C21_T12
  Scenario: Memory leak detection
    When user repeatedly opens and closes species pages
    Then memory should be released correctly

  @C21_T13
  Scenario: CPU usage during heavy operations
    When user performs intensive operations
    Then CPU usage should stay within acceptable range

  @C21_T14
  Scenario: App stability during long session
    When app is used continuously
    Then no crash or freeze should occur

  @C21_T15
  Scenario: Background foreground stability
    When app is minimized and restored repeatedly
    Then app stat

