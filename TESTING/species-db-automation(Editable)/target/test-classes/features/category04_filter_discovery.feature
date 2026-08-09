Feature: Category 4 - Filter & Discovery
  As a user
  I want to filter species using multiple criteria
  So that I can discover relevant species efficiently

  @C4_T1
  Scenario: Filter option visibility on Home screen
    Given user is on the Home screen
    Then filter option should be visible and enabled
    And filter label and icon should be displayed correctly
    And filter option should be accessible in offline mode

  @C4_T2
  Scenario: Open Filter screen
    When user taps on filter option
    Then filter screen should open successfully
    And all filter categories should be displayed
    And no UI overlap or rendering issue should occur

  @C4_T3
  Scenario: Quick filter by leaf type
    Given filter screen is open
    When user selects a leaf type filter
    And applies the filter
    Then species results should match selected leaf type

  @C4_T4
  Scenario: Quick filter by fruit type
    Given filter screen is open
    When user selects a fruit type filter
    And applies the filter
    Then species results should match selected fruit type

  @C4_T5
  Scenario: Multiple filter combination
    Given filter screen is open
    When user selects multiple filter options
    And applies the filters
    Then results should satisfy all selected criteria

  @C4_T6
  Scenario: Clear all filters
    Given filters are applied
    When user clears all filters
    Then default unfiltered species list should be restored

  @C4_T7
  Scenario: Filter persistence on back navigation
    Given filters are applied
    When user navigates back and re-enters filter view
    Then filter state should persist as per requirement

  @C4_T8
  Scenario: Filter with active search query
    Given a search query is entered
    When user applies filters
    Then results should match search and filter criteria

  @C4_T9
  Scenario: Filter reset on search clear
    Given search and filters are applied
    When user clears the search input
    Then filter behavior should follow defined requirement

  @C4_T10
  Scenario: No results after filtering
    When user applies filters with no matching species
    Then no results message should be displayed
    And message should be user-friendly and localized

  @C4_T11
  Scenario: Filter functionality in offline mode
    Given internet connection is disabled
    When user applies filters
    Then results should be displayed using cached data

  @C4_T12
  Scenario: Filter performance with large dataset
    When user applies filters repeatedly on large dataset
    Then filter response time should be acceptable
    And app should remain stable

  @C4_T13
  Scenario: Invalid filter input handling
    When invalid filter values are applied
    Then app should handle the scenario gracefully

  @C4_T14
  Scenario: Filter UI accessibility
    When user views filter screen
    Then filter UI should be accessible and readable

  @C4_T15
  Scenario: Filter language consistency
    Given app language is changed
    When user opens filter screen
    Then all filter labels should reflect selected language

  @C4_T16
  Scenario: Close filter without applying
    Given filter screen is open
    When user closes filter without applying
    Then no filter changes should be applied

  @C4_T17
  Scenario: Filter state on app restore
    Given filters are applied
    When app is minimized and restored
    Then filter state should be preserved

  @C4_T18
  Scenario: Filter state after data sync
    Given filters are applied
    When data sync occurs
    Then filtered results should remain consistent

  @C4_T19
  Scenario: Filter error recovery
    When filtering fails due to system error
    Then appropriate error message should be shown
    And retry option should be available

  @C4_T20
  Scenario: Filter regression check
    When filter tests are executed on new build
    Then all filter features should work as expected

