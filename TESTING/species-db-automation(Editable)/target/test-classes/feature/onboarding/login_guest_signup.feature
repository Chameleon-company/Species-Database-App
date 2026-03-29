Feature: Login and guest access

  Scenario: Continue as guest
    Given app is launched
    When user selects Continue as Guest
    Then home screen should be displayed

  Scenario: Sign up with email
    Given app is launched
    When user enters valid email
    And taps Continue with Email
    Then onboarding should complete successfully
