Feature: Category 6 - Species Detail Page
  As a user
  I want to view detailed species information
  So that I can understand identification, cultivation, and usage

  @C6_T1
  Scenario: Navigation to Species Detail page
    Given user has species results displayed
    When user taps on a species item
    Then Species Detail page should open
    And correct species details should be loaded

  @C6_T2
  Scenario: Species Detail page load time
    When user opens Species Detail page
    Then page content should load within acceptable time
    And no blank or partially rendered UI should appear

  @C6_T3
  Scenario: Species core information display
    When user views Species Detail page
    Then scientific name and common name should be displayed
    And content should be readable and localized

  @C6_T4
  Scenario: Species description and habitat information
    When user scrolls Species Detail page
    Then description and habitat sections should be visible
    And information should be complete and properly formatted

  @C6_T5
  Scenario: Identification characteristics display
    When user navigates to identification section
    Then distinguishing characteristics should be clearly displayed

  @C6_T6
  Scenario: Seed germination section visibility
    When user scrolls to seed germination section
    Then step-by-step germination instructions should be visible
    And section should be accessible offline

  @C6_T7
  Scenario: Pest and disease section display
    When user navigates to pest and disease section
    Then pest and disease information should be displayed correctly

  @C6_T8
  Scenario: Image gallery thumbnail display
    When Species Detail page contains images
    Then image thumbnails should be displayed correctly
    And no broken images should appear

  @C6_T9
  Scenario: Image gallery navigation
    When user opens image gallery
    Then full screen image view should open
    And user should be able to navigate between images

  @C6_T10
  Scenario: Video tutorial access
    When user taps on a video tutorial
    Then video player should open correctly
    And offline unavailability message should appear if applicable

  @C6_T11
  Scenario: Offline access to Species Detail
    Given internet connection is disabled
    When user opens previously viewed Species Detail page
    Then cached content should load successfully

  @C6_T12
  Scenario: Partial offline content handling
    When Species Detail page has missing media offline
    Then placeholder or warning message should be displayed
    And app should remain stable

  @C6_T13
  Scenario: Back navigation from Species Detail
    When user navigates back from Species Detail page
    Then previous screen state should be preserved

  @C6_T14
  Scenario: Species Detail state persistence
    When app is minimized and restored on Species Detail page
    Then same Species Detail page should be restored

  @C6_T15
  Scenario: Screen rotation on Species Detail
    When user rotates device orientation on Species Detail page
    Then layout should adapt correctly without data loss

  @C6_T16
  Scenario: Language switch on Species Detail
    When user changes app language on Species Detail page
    Then all content should update to selected language

  @C6_T17
  Scenario: Species Detail after data sync
    When data sync is completed
    Then Species Detail content should reflect updated data

  @C6_T18
  Scenario: Invalid species ID handling
    When user navigates to invalid Species Detail page
    Then user-friendly error message should be shown
    And app should redirect gracefully

  @C6_T19
  Scenario: Species Detail accessibility basics
    When user reviews Species Detail page
    Then accessibility standards should be satisfied

  @C6_T20
  Scenario: Species Detail regression check
    When Species Detail scenarios are executed on new build
    Then no regression issues should be observed

