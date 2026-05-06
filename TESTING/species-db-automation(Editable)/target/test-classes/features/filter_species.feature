Feature: Filter species

  Scenario: Filter species by leaf type
    Given user is on home screen
    When user opens Leaf Type filter
    And selects "Simple"
    Then species list should be filtered accordingly

  Scenario: Filter species by fruit type
    Given user is on home screen
    When user opens Fruit Type filter
    And selects "Drupe"
    Then species list should be filtered accordingly
