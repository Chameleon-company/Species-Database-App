@Automation

Feature: Login and registration

  Background:
    Given the application is launched
    And user selects "ENGLISH AU"
    And user clicks on Continue
    And Login page is displayed

  Scenario: Navigate to registration page
    When the user clicks on "Sign In"
    Then Registration page should open

  Scenario: Email validation error
    When the user clicks on "Continue with Email" without entering email
    Then an error dialog should be displayed

  Scenario: Email input reveals password field
    When the user enters email
    And clicks on "Continue with Email"
    Then password field should be displayed

  Scenario: Sign up with Google
    When the user clicks on "Sign Up With Google"
    Then Google registration page should open

  Scenario: Continue as guest
    When the user clicks on "Continue as Guest"
    Then Home page should open
