Feature: E2E smoke regression

  Scenario: Complete critical user flow
    Given app is freshly installed
    When user selects language
    And continues as guest
    And searches a species
    And opens species detail
    Then app should work without crash
