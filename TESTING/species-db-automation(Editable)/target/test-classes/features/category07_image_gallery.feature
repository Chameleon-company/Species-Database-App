Feature: Category 7 - Image Gallery & Media Viewer
  As a user
  I want to view and interact with species images
  So that I can visually identify species accurately

  @C7_T1
  Scenario: Image Gallery section visibility
    Given user is on Species Detail page with images
    Then Image Gallery section should be visible
    And thumbnails should be displayed correctly
    And section label should be localized

  @C7_T2
  Scenario: Thumbnail image rendering
    When user views image thumbnails
    Then thumbnails should load without distortion
    And images should correspond to correct species

  @C7_T3
  Scenario: Full screen image open
    When user taps on an image thumbnail
    Then full screen image viewer should open
    And selected image should load correctly

  @C7_T4
  Scenario: Image swipe navigation
    Given full screen image viewer is open
    When user swipes between images
    Then images should navigate smoothly in correct order

  @C7_T5
  Scenario: Image zoom in and out
    Given full screen image viewer is open
    When user performs zoom gestures
    Then image zoom should work smoothly

  @C7_T6
  Scenario: Image pan after zoom
    Given image is zoomed in
    When user pans the image
    Then image movement should follow touch accurately

  @C7_T7
  Scenario: Exit full screen image viewer
    Given full screen image viewer is open
    When user exits the viewer
    Then user should return to Species Detail page
    And previous scroll position should be preserved

  @C7_T8
  Scenario: Image orientation handling
    When user rotates device in image viewer
    Then image should adapt correctly to orientation

  @C7_T9
  Scenario: Offline image access
    Given internet connection is disabled
    When user opens cached images
    Then images should load successfully offline

  @C7_T10
  Scenario: Missing image offline handling
    Given internet connection is disabled
    When user opens non-cached image
    Then placeholder or informative message should be displayed

  @C7_T11
  Scenario: Image loading indicator
    When large image is loading
    Then loading indicator should be displayed
    And removed after image loads

  @C7_T12
  Scenario: Image cache reuse
    Given image was previously viewed online
    When user opens the image offline
    Then image should load from cache

  @C7_T13
  Scenario: Image metadata consistency
    When user views image metadata
    Then image labels and types should match backend data

  @C7_T14
  Scenario: Image gallery performance on low-end device
    Given user is on low-end device
    When user interacts with image gallery
    Then performance should remain acceptable

  @C7_T15
  Scenario: Image gallery language independence
    Given app language is changed
    When user opens image gallery
    Then images should remain unchanged
    And captions should reflect selected language

  @C7_T16
  Scenario: Image gallery state persistence
    Given image viewer is open at specific image
    When app is minimized and restored
    Then same image should be displayed

  @C7_T17
  Scenario: Image gallery accessibility basics
    When user reviews image gallery controls
    Then controls should be visible and accessible

  @C7_T18
  Scenario: Corrupted image file handling
    When user opens corrupted image file
    Then app should handle error gracefully

  @C7_T19
  Scenario: Image gallery error recovery
    When image loading fails due to system error
    Then clear error message should be shown
    And retry option should be available

  @C7_T20
  Scenario: Image gallery regression check
    When image gallery scenarios are executed on new build
    Then no regression issues should be observed

