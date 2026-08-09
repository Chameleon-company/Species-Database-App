Feature: Category 20 - Security & Permissions
  As a user
  I want my data and permissions to be handled securely
  So that the application is safe and privacy compliant

  @C20_T1
  Scenario: Permission request on first use
    Given app is launched for the first time
    When user triggers a permission required feature
    Then system permission prompt should appear
    And permission prompt text should be clear and contextual

  @C20_T2
  Scenario: Camera permission allow
    When user allows camera permission
    Then camera feature should open successfully
    And no security error should appear

  @C20_T3
  Scenario: Camera permission deny
    When user denies camera permission
    Then user friendly denial message should be displayed
    And retry guidance should be provided

  @C20_T4
  Scenario: Storage permission allow
    When user allows storage permission
    Then storage dependent feature should proceed successfully

  @C20_T5
  Scenario: Storage permission deny
    When user denies storage permission
    Then restricted feature access message should be shown
    And app should remain stable

  @C20_T6
  Scenario: Permission retry flow
    Given permission was denied earlier
    When user retries the same feature
    Then app should explain why permission is required
    And option to open system settings should be available

  @C20_T7
  Scenario: Permission state persistence
    Given user grants or denies permissions
    When app is relaunched
    Then permission state should be remembered correctly

  @C20_T8
  Scenario: Restricted feature access control
    Given permission is denied
    When user accesses restricted feature directly
    Then feature should be blocked gracefully

  @C20_T9
  Scenario: No unnecessary permission request
    When user navigates non-permission features
    Then no unnecessary permission prompt should appear

  @C20_T10
  Scenario: Sensitive data local storage security
    Then no sensitive data should be stored in plain text
    And storage should follow platform security guidelines

  @C20_T11
  Scenario: Data access isolation
    Then app data should be isolated from other apps
    And OS level sandboxing should be enforced

  @C20_T12
  Scenario: Secure API communication
    When app performs network operations
    Then all API calls should use HTTPS
    And certificates should be valid

  @C20_T13
  Scenario: Man in the middle attack resistance
    When MITM attack is simulated
    Then invalid certificates should be rejected

  @C20_T14
  Scenario: Offline data tampering protection
    Given cached data is modified manually
    When app is relaunched offline
    Then corruption should be detected safely

  @C20_T15
  Scenario: Permission and security message localization
    When app language is changed
    Then permission and security messages should be localized

  @C20_T16
  Scenario: Permission behavior after OS update
    Given OS update resets permissions
    When app is relaunched
    Then permissions should be re-requested gracefully

  @C20_T17
  Scenario: Security behavior on low end device
    Given app runs on low-end device
    Then security and permission behavior should remain consistent

  @C20_T18
  Scenario: Error handling for security failures
    When security failure occurs
    Then user friendly error should be shown
    And internal details should not be exposed

  @C20_T19
  Scenario: Privacy compliance check
    Then requested permissions should match declared functionality
    And no excessive permissions should be used

  @C20_T20
  Scenario: Security and permissions regression check
    When all security tests are executed
    Then no regression should be found
    And story should be ready for sprint sign-off

