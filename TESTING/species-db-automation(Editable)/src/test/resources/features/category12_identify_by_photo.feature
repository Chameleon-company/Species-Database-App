Feature: Category 12 - Identify by Photo
  As a user
  I want to identify species using a photo
  So that I can quickly recognize a plant using camera or gallery

  @C12_T1
  Scenario: Identify by Photo entry visibility
    Given user is on the Home screen
    Then Identify by Photo option should be visible and enabled
    And option should be localized and accessible offline

  @C12_T2
  Scenario: Open camera for photo identification
    When user selects Identify by Photo using camera
    Then camera interface should open successfully

  @C12_T3
  Scenario: Camera permission request first time
    When user launches camera identification for first time
    Then camera permission prompt should be displayed
    And permission message should be clear and localized

  @C12_T4
  Scenario: Camera permission allow
    When user allows camera permission
    Then camera should open successfully
    And capture option should be available

  @C12_T5
  Scenario: Camera permission deny
    When user denies camera permission
    Then informative warning message should be displayed
    And retry permission option should be available

  @C12_T6
  Scenario: Capture photo successfully
    When user captures a photo for identification
    Then photo should be captured successfully
    And app should proceed to preview or processing step

  @C12_T7
  Scenario: Retake photo option
    Given user has captured a photo
    When user selects retake option
    Then camera should reopen
    And new photo should replace previous capture

  @C12_T8
  Scenario: Select photo from gallery
    When user selects Identify by Photo using gallery
    Then selected image should load successfully

  @C12_T9
  Scenario: Gallery permission request
    When user accesses gallery for first time
    Then gallery permission prompt should be displayed
    And permission flow should be correct

  @C12_T10
  Scenario: Invalid image file handling
    When user submits an unsupported or invalid image
    Then appropriate error message should be displayed
    And app should remain stable

  @C12_T11
  Scenario: Image preview before processing
    Given user has selected or captured an image
    Then image preview screen should be displayed
    And user should be able to proceed or cancel

  @C12_T12
  Scenario: Photo processing indicator
    When user submits image for identification
    Then processing indicator should be displayed
    And indicator should disappear after completion

  @C12_T13
  Scenario: Identification result display
    When photo identification is completed
    Then identification results should be displayed
    And results should be relevant to the image

  @C12_T14
  Scenario: Navigate from result to Species Detail
    Given identification results are displayed
    When user selects a suggested species
    Then Species Detail page should open correctly

  @C12_T15
  Scenario: Identify by Photo offline behavior
    Given internet connection is disabled
    When user attempts Identify by Photo
    Then offline limitation message should be displayed

  @C12_T16
  Scenario: Partial offline fallback
    Given internet connection is disabled
    When user captures or selects photo
    Then fallback or store-for-later message should be shown

  @C12_T17
  Scenario: Language consistency in photo flow
    Given app language is changed
    When user starts Identify by Photo flow
    Then all messages and labels should appear in selected language

  @C12_T18
  Scenario: Photo flow state persistence
    Given user is in Identify by Photo flow
    When app is minimized and restored
    Then flow state should be preserved or recovered gracefully

  @C12_T19
  Scenario: Identify by Photo on low-end device
    Given user is on a low-end device
    When user performs photo identification
    Then app should remain responsive

  @C12_T20
  Scenario: Identify by Photo regression check
    When Identify by Photo scenarios are executed on new build
    Then no regression issues should be observed
    And story should be ready for sprint sign-off

