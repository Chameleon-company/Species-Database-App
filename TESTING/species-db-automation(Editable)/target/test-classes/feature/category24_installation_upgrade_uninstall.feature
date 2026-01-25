Feature: Category 24 - Installation, Upgrade and Uninstall
  As a QA and release team
  We want to ensure installation, upgrade and uninstall flows are stable
  So that users do not face data loss or broken states

  @C24_T1
  Scenario: Fresh installation success
    Given app is not installed on the device
    When user installs the app
    Then app should install and launch successfully

  @C24_T2
  Scenario: First launch after install
    When app is launched for the first time
    Then onboarding or welcome flow should appear
    And no crash should occur

  @C24_T3
  Scenario: Install on low storage device
    Given device storage is low
    When user installs the app
    Then appropriate installation error should be shown

  @C24_T4
  Scenario: Install on low end device
    Given device is low end
    When app is installed and launched
    Then app should work with acceptable performance

  @C24_T5
  Scenario: Upgrade app preserves user data
    Given older app version with user data exists
    When app is upgraded
    Then user data should be preserved

  @C24_T6
  Scenario: Upgrade app preserves settings
    Given older app version with custom settings exists
    When app is upgraded
    Then settings should persist correctly

  @C24_T7
  Scenario: Upgrade app database migration
    Given older app version with local database exists
    When app is upgraded
    Then database migration should complete successfully

  @C24_T8
  Scenario: Upgrade with interrupted process
    When app upgrade is interrupted
    And app is relaunched
    Then app should recover gracefully

  @C24_T9
  Scenario: Downgrade app handling
    Given newer app version is installed
    When older version is installed over it
    Then app should behave as per platform rules

  @C24_T10
  Scenario: Uninstall app cleanup
    When user uninstalls the app
    Then app data should be removed successfully

  @C24_T11
  Scenario: Reinstall after uninstall
    Given app is uninstalled
    When app is reinstalled
    Then app should behave as fresh install

  @C24_T12
  Scenario: Uninstall with offline data
    Given offline data is cached
    When app is uninstalled
    Then offline data should be removed

  @C24_T13
  Scenario: Install permission prompts
    When app is installed and permissions are required
    Then permission prompts should be shown correctly

  @C24_T14
  Scenario: Upgrade on low end device
    Given older app version on low end device
    When app is upgraded
    Then upgrade should complete successfully

  @C24_T15
  Scenario: Install on different OS versions
    When app is installed on supported OS versions
    Then app should remain compatible and stable

  @C24_T16
  Scenario: Upgrade with major version change
    Given older major version is installed
    When app is upgraded to new major version
    Then migration and compatibility checks should pass

  @C24_T17
  Scenario: Upgrade failure error handling
    When upgrade fails due to system issue
    Then user friendly error should be shown

  @C24_T18
  Scenario: Install and upgrade logging
    When install or upgrade occurs
    Then install and upgrade events should be logged

  @C24_T19
  Scenario: Install and upgrade localization
    When device language is changed
    And app is installed or upgraded
    Then onboarding and messages should be localized

  @C24_T20
  Scenario: Installation upgrade uninstall regression check
    When full install upgrade uninstall suite is executed
    Then no regression should be found
    And build should be ready for sprint sign off

