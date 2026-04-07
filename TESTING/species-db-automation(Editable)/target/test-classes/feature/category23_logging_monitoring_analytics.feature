Feature: Category 23 - Logging, Monitoring and Analytics
  As a product and engineering team
  We want reliable logging and analytics
  So that user behavior, errors, and performance are monitored correctly

  @C23_T1
  Scenario: Application log generation on launch
    When application is launched
    Then launch events should be logged with timestamp and level

  @C23_T2
  Scenario: User action event logging
    When user performs key actions
    Then corresponding analytics events should be logged
    And no duplicate events should exist

  @C23_T3
  Scenario: Navigation event tracking
    When user navigates across screens
    Then screen view events should be logged in correct order

  @C23_T4
  Scenario: Error event logging
    When an application error occurs
    Then error event should be logged with error details
    And no sensitive data should be logged

  @C23_T5
  Scenario: Crash logging and reporting
    Given a crash occurs
    When application is relaunched
    Then crash report should be generated and queued

  @C23_T6
  Scenario: Offline event queueing
    Given device is offline
    When user performs tracked actions
    Then analytics events should be queued locally

  @C23_T7
  Scenario: Analytics event sync on reconnect
    Given events are queued offline
    When internet connection is restored
    Then events should sync once without duplication

  @C23_T8
  Scenario: Sync event logging
    When user initiates data sync
    Then sync start, success and failure events should be logged

  @C23_T9
  Scenario: Performance metric logging
    When user performs heavy operations
    Then performance metrics should be logged correctly

  @C23_T10
  Scenario: Background event tracking
    When app moves to background and foreground
    Then lifecycle events should be logged correctly

  @C23_T11
  Scenario: Analytics disabled state
    Given analytics tracking is disabled
    When user performs actions
    Then no analytics events should be generated

  @C23_T12
  Scenario: Log level configuration
    When app runs in different build modes
    Then appropriate log levels should be used

  @C23_T13
  Scenario: Sensitive data exclusion from logs
    When user data related actions occur
    Then no sensitive data should appear in logs

  @C23_T14
  Scenario: Analytics event naming consistency
    When analytics events are reviewed
    Then event naming should follow defined conventions

  @C23_T15
  Scenario: Analytics data accuracy
    When a known user action sequence is performed
    Then analytics events should match exactly

  @C23_T16
  Scenario: Logging on low end device
    Given app runs on low end device
    When user performs normal usage
    Then logging should not degrade performance

  @C23_T17
  Scenario: Analytics and logging localization independence
    When app language is changed
    Then analytics events should remain language independent

  @C23_T18
  Scenario: Log retention and cleanup
    When app is used extensively
    Then old logs should be rotated or cleaned up

  @C23_T19
  Scenario: Error monitoring alert triggering
    When repeated errors occur
    Then monitoring alerts should be triggered correctly

  @C23_T20
  Scenario: Logging and analytics regression check
    When full logging suite is executed
    Then no regression should be found
    And story should be ready for sprint sign off

