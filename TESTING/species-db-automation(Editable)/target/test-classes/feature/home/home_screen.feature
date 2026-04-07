Feature: Home screen validation

  Scenario: Home screen loads successfully
    Given user is logged in or guest
    When home screen is displayed
    Then search bar should be visible
    And language switch button should be visible
    And species list should be displayed
