Feature: Category 5 - Species Results List
  As a user
  I want to view species results clearly
  So that I can browse and select species efficiently

  @C5_T1
  Scenario: Results list display on search
    Given user is on the Home screen
    When user performs a valid search
    Then species results list should be displayed
    And results list should render without layout issues

  @C5_T2
  Scenario: Results list display on filter
    Given filter screen is open
    When user applies one or more filters
    Then filtered species results list should be displayed
    And results should match applied filters

  @C5_T3
  Scenario: Result item content validation
    When user views the species results list
    Then each result item should display required fields
    And content should be readable and localized

  @C5_T4
  Scenario: Result item tap navigation
    When user taps on a species result item
    Then user should be navigated to species detail page
    And correct species details should load

  @C5_T5
  Scenario: Results list scroll behavior
    Given species results list has multiple entries
    When user scrolls through the list
    Then scrolling should be smooth
    And no duplicate or missing items should appear

  @C5_T6
  Scenario: Pagination or lazy loading
    Given species results list is large
    When user scrolls towards the end of the list
    Then additional results should load correctly

  @C5_T7
  Scenario: Results list empty state
    When no species match the search or filter
    Then empty state message should be displayed
    And message should be localized and user-friendly

  @C5_T8
  Scenario: Results list offline access
    Given internet connection is disabled
    When user performs search or filter
    Then results list should load using cached data

  @C5_T9
  Scenario: Results list ordering consistency
    When user performs the same search multiple times
    Then results ordering should remain consistent

  @C5_T10
  Scenario: Results list update on search change
    Given initial search is performed
    When user modifies the search keyword
    Then results list should update correctly

  @C5_T11
  Scenario: Results list update on filter change
    Given initial filters are applied
    When user modifies filter selection
    Then results list should update accurately

  @C5_T12
  Scenario: Back navigation from results
    Given user is viewing species results
    When user navigates to detail page and returns
    Then previous results list state should be preserved

  @C5_T13
  Scenario: Results list state persistence
    Given species results are displayed
    When app is minimized and restored
    Then results list state should remain unchanged

  @C5_T14
  Scenario: Results list rotation handling
    When user rotates device orientation
    Then results list layout should adapt correctly

  @C5_T15
  Scenario: Results list performance on low-end device
    Given user is on a low-end device
    When large results list is loaded
    Then app should remain stable and responsive

  @C5_T16
  Scenario: Results list language consistency
    Given app language is changed
    When user performs search or filter
    Then results list content should reflect selected language

  @C5_T17
  Scenario: Results list after data sync
    When data sync is completed
    Then updated species should appear correctly in results

  @C5_T18
  Scenario: Results list error handling
    When results list fails to load due to system error
    Then appropriate error message should be displayed
    And retry option should be available

  @C5_T19
  Scenario: Results list accessibility basics
    When user interacts with results list
    Then accessibility standards should be satisfied

  @C5_T20
  Scenario: Results list regression check
    When results list scenarios are executed on new build
    Then no regression issues should be observed

