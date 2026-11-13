Feature: Category 8 - Video Playback & Tutorials
  As a user
  I want to watch species tutorial videos
  So that I can learn identification and cultivation visually

  @C8_T1
  Scenario: Video tutorial section visibility
    Given user is on Species Detail page with videos
    Then Video Tutorials section should be visible
    And video thumbnails should be displayed correctly
    And section should be distinguishable from image gallery

  @C8_T2
  Scenario: Video thumbnail rendering
    When user views video thumbnails
    Then thumbnails should load without distortion
    And thumbnails should correspond to correct tutorials

  @C8_T3
  Scenario: Open video player
    When user taps on a video thumbnail
    Then video player should open successfully
    And correct video should be loaded
    And player controls should be visible

  @C8_T4
  Scenario: Video playback online
    Given stable internet connection is available
    When user plays a tutorial video
    Then video should play smoothly
    And audio and video should be in sync

  @C8_T5
  Scenario: Video playback offline from cache
    Given video was fully loaded while online
    And internet connection is disabled
    When user plays the same video
    Then video should play from local cache

  @C8_T6
  Scenario: Video unavailable offline message
    Given internet connection is disabled
    When user plays non-cached video
    Then offline unavailable message should be displayed

  @C8_T7
  Scenario: Video loading indicator
    When user opens large video file
    Then loading indicator should be displayed
    And indicator should disappear when playback starts

  @C8_T8
  Scenario: Play and pause controls
    When video playback is started
    And user uses play or pause controls
    Then playback should respond correctly

  @C8_T9
  Scenario: Seek forward and backward
    When user seeks video forward or backward
    Then playback should resume from selected position

  @C8_T10
  Scenario: Video full screen mode
    When user switches video to full screen mode
    Then video should resize correctly
    And controls should remain accessible

  @C8_T11
  Scenario: Exit video player
    When user exits video player
    Then user should return to Species Detail page
    And app state should remain stable

  @C8_T12
  Scenario: Video orientation handling
    When user rotates device during video playback
    Then video should adapt to orientation change

  @C8_T13
  Scenario: Video playback on low-end device
    Given user is on low-end device
    When video is played
    Then playback performance should be acceptable

  @C8_T14
  Scenario: Video language consistency
    Given app language is changed
    When user opens video tutorials
    Then video titles and descriptions should update to selected language

  @C8_T15
  Scenario: Video state persistence on minimize
    When video playback is minimized
    And app is restored
    Then video should resume or restart as per requirement

  @C8_T16
  Scenario: Sequential video playback
    When user plays multiple videos sequentially
    Then no audio or video overlap should occur

  @C8_T17
  Scenario: Video error handling
    When video playback fails due to error
    Then user friendly error message should be shown
    And retry option should be available

  @C8_T18
  Scenario: Video cache management
    When multiple videos are cached
    Then cached videos should be managed correctly

  @C8_T19
  Scenario: Video accessibility basics
    When user reviews video controls
    Then controls should be accessible and readable

  @C8_T20
  Scenario: Video regression check
    When video scenarios are executed on new build
    Then no regression issues should be observed

