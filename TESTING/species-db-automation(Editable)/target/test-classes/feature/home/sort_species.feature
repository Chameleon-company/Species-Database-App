Feature: Sort species list

  Scenario: Sort species from A to Z
    Given user is on home screen
    When user opens sort options
    And selects "A-Z"
    Then species list should be sorted alphabetically

  Scenario: Sort species from Z to A
    Given user is on home screen
    When user opens sort options
    And selects "Z-A"
    Then species list should be sorted in reverse order
