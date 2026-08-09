Feature: Search species

  Scenario: Search species using keyword
    Given user is on home screen
    When user enters "Albizia" in search bar
    Then matching species results should be displayed
