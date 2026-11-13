Feature: Category 25 - End to End Regression Suite
  As a QA team
  We want to validate complete user journeys
  So that the application is release ready

  @C25_T1
  Scenario: App launch to Home
    When app is installed and launched
    Then Home screen should load successfully

  @C25_T2
  Scenario: Search to Species Detail
    Given user is on Home screen
    When user searches for a species
    And selects a species from results
    Then Species Detail page should load

  @C25_T3
  Scenario: Filter to Results to Detail
    When user applies filters
    And selects a filtered species
    Then correct Species Detail page should open

  @C25_T4
  Scenario: Species Detail to Image Gallery
    When user opens Image Gallery from Species Detail
    Then images should open and close correctly

  @C25_T5
  Scenario: Species Detail to Video Tutorial
    When user plays tutorial video
    Then video should play smoothly and exit correctly

  @C25_T6
  Scenario: Seed Germination guide flow
    When user opens Seed Germination section
    Then cultivation guidance should be visible

  @C25_T7
  Scenario: Pest and Disease information flow
    When user opens Pest and Disease section
    Then pest information should load correctly

  @C25_T8
  Scenario: Decision Tree identification
    When user completes Decision Tree identification
    Then correct Species Detail page should open

  @C25_T9
  Scenario: Identify by Photo using Camera
    When user identifies species using camera
    Then identification results should be shown

  @C25_T10
  Scenario: Identify by Photo using Gallery
    When user identifies species using gallery image
    Then identification results should be shown

  @C25_T11
  Scenario: Environmental suitability check
    When user performs suitability check
    Then recommended species list should be shown

  @C25_T12
  Scenario: Compare species flow
    When user compares multiple species
    Then comparison screen should display correctly

  @C25_T13
  Scenario: Favorites flow
    When user adds species to Favorites
    Then species should appear in Favorites list

  @C25_T14
  Scenario: Recently Viewed flow
    When user views multiple species
    Then Recently Viewed list should update correctly

  @C25_T15
  Scenario: Offline core flow
    Given app has cached data
    When user uses app offline
    Then offline data should be accessible

  @C25_T16
  Scenario: Offline to Online sync
    When user goes from offline to online
    Then data sync should complete successfully

  @C25_T17
  Scenario: Settings and language change
    When user changes app language
    Then language should update across screens

  @C25_T18
  Scenario: Security permission flow
    When user handles permission flows
    Then app should remain secure and stable

  @C25_T19
  Scenario: Long session stability
    When user uses app for long session
    Then app should remain responsive

  @C25_T20
  Scenario: Upgrade regression
    When app is upgraded to new version
    Then all E2E flows should still pass

  @C25_T21
  Scenario: Analytics and logging validation
    When user completes full E2E journey
    Then analytics events should be captured correctly

  @C25_T22
  Scenario: Performance smoke
    When user executes critical flows
    Then performance should meet baseline

  @C25_T23
  Scenario: Accessibility smoke
    When accessibility features are enabled
    Then key flows should remain usable

  @C25_T24
  Scenario: Crash recovery
    When app crashes during E2E flow
    Then app should recover without data loss

  @C25_T25
  Scenario: Final E2E regression signoff
    When full E2E regression suite is executed
    Then release should be approved for deployment
