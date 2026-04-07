@Automation
Feature: Home page plant listing and filters

  Scenario: Default A-Z order and All selected
    Given user is on Home page
    Then "All" should be active filter

  Scenario: Sort plants Z-A
    Given user is on Home page
    When user clicks on "A-Z"
    And user selects option "Z → A"

  Scenario: Leaf Type - Simple
    Given user is on Home page
    When user clicks on "Leaf Type"
    And user selects option "Simple"
    Then first plant name should be "Aleurites moluccana"

  Scenario: Leaf Type - Single
    Given user is on Home page
    When user clicks on "Leaf Type"
    And user selects option "Pinnately compound (single)"
    Then first plant name should be "Toona ciliata"

  Scenario: Leaf Type - Double
    Given user is on Home page
    When user clicks on "Leaf Type"
    And user selects option "Pinnately compound (double)"
    Then first plant name should be "Albizia lebbeck"

  Scenario: Leaf Type - Triple
    Given user is on Home page
    When user clicks on "Leaf Type"
    And user selects option "Pinnately compound (triple)"
    Then first plant name should be "Azadirachta indica"

  Scenario: Leaf Type - Palmately Compound
    Given user is on Home page
    When user clicks on "Leaf Type"
    And user selects option "Palmately compound"
    Then first plant name should be "Sterculia foetida"

  Scenario: Fruit Type - Drupe
    Given user is on Home page
    When user clicks on "Fruit Type"
    And user selects option "Drupe"
    Then first plant name should be "Aleurites moluccana"

  Scenario: Fruit Type - Capsule
    Given user is on Home page
    When user clicks on "Fruit Type"
    And user selects option "Capsule"
    Then first plant name should be "Toona ciliata"

  Scenario: Fruit Type - Follicle
    Given user is on Home page
    When user clicks on "Fruit Type"
    And user selects option "Follicle"
    Then first plant name should be "Sterculia foetida"

  Scenario: Fruit Type - Pod
    Given user is on Home page
    When user clicks on "Fruit Type"
    And user selects option "Pod"
    Then first plant name should be "Albizia lebbeck"

  Scenario: Open species details
    Given user is on Home page
    When user clicks on first plant
    Then species page should open
