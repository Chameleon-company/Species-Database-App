Feature: Category 15 - Favorites & Recently Viewed
  As a user
  I want to manage Favorites and Recently Viewed species
  So that I can quickly access important species

  @C15_T1
  Scenario: Add species to Favorites
    Given user is on Species Detail page
    When user taps Add to Favorites
    Then species should be added to Favorites
    And visual confirmation should be displayed

  @C15_T2
  Scenario: Remove species from Favorites
    Given species is already marked as Favorite
    When user taps Remove from Favorites
    Then species should be removed from Favorites
    And removal confirmation should be displayed

  @C15_T3
  Scenario: Favorites list display
    When user opens Favorites section
    Then list of favorited species should be displayed
    And no duplicate entries should appear

  @C15_T4
  Scenario: Navigate from Favorites to Species Detail
    Given user is on Favorites list
    When user selects a species
    Then correct Species Detail page should open

  @C15_T5
  Scenario: Favorites persistence after app restart
    Given species is added to Favorites
    When app is closed and relaunched
    Then Favorites list should persist

  @C15_T6
  Scenario: Favorites offline access
    Given internet connection is disabled
    When user opens Favorites section
    Then favorited species should load successfully offline

  @C15_T7
  Scenario: Favorites empty state
    Given no species are marked as Favorites
    When user opens Favorites section
    Then empty state message should be displayed

  @C15_T8
  Scenario: Recently Viewed list update
    When user opens multiple Species Detail pages
    And user opens Recently Viewed section
    Then species should appear in correct viewing order

  @C15_T9
  Scenario: Recently Viewed list limit
    Given user has viewed more species than allowed limit
    When user opens Recently Viewed section
    Then older entries should be removed

  @C15_T10
  Scenario: Navigate from Recently Viewed to Species Detail
    When user selects a species from Recently Viewed
    Then correct Species Detail page should open

  @C15_T11
  Scenario: Recently Viewed persistence after app restart
    Given user has viewed multiple species
    When app is closed and relaunched
    Then Recently Viewed list should persist

  @C15_T12
  Scenario: Recently Viewed offline access
    Given internet connection is disabled
    When user opens Recently Viewed section
    Then cached species details should be accessible

  @C15_T13
  Scenario: Remove item from Recently Viewed
    Given user is on Recently Viewed list
    When user removes a species entry
    Then species should be removed from the list

  @C15_T14
  Scenario: Clear all Recently Viewed
    Given user is on Recently Viewed section
    When user clears all entries
    Then empty state message should be displayed

  @C15_T15
  Scenario: Favorites and Recently Viewed language consistency
    Given app language is changed
    When user opens Favorites or Recently Viewed
    Then all labels and messages should appear in selected language

  @C15_T16
  Scenario: Favorites state after data sync
    Given species is added to Favorites
    When data sync is performed
    Then Favorites list should remain unchanged

  @C15_T17
  Scenario: Recently Viewed state after data sync
    Given user has viewed species
    When data sync is performed
    Then Recently Viewed list should remain consistent

  @C15_T18
  Scenario: Favorites on low-end device
    Given user is using a low-end device
    When user adds and removes Favorites repeatedly
    Then app should remain stable

  @C15_T19
  Scenario: Favorites and Recently Viewed error handling
    Given local storage failure occurs
    When user accesses Favorites or Recently Viewed
    Then user friendly error message should be displayed

  @C15_T20
  Scenario: Favorites and Recently Viewed regression check
    When new build is deployed
    Then Favorites and Recently Viewed features should work correctly

