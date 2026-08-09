Feature: Category 3 - Search Functionality
  As a user
  I want to search species using different criteria
  So that I can quickly find relevant species information

  Background:
    Given application is launched
    And user is on the Home screen

  Scenario: C3_T1_Search_Field_Visibility_On_Home
    Then search input field should be visible and enabled
    And search placeholder text should be displayed correctly
    And search field should be tappable

  Scenario: C3_T2_Activate_Search_Mode
    When user taps on the search field
    Then application should enter search mode
    And on-screen keyboard should appear
    And focus should remain on search field

  Scenario: C3_T3_Search_By_Exact_Species_Name
    When user enters full species name in search field
    And user submits the search
    Then exact matching species results should be displayed

  Scenario: C3_T4_Search_By_Partial_Name
    When user enters partial species name
    Then matching species containing the keyword should appear
    And unrelated species should not be displayed

  Scenario: C3_T5_Search_Suggestions_Display
    When user types characters in search field
    Then search suggestions should appear dynamically
    And suggestions should be relevant

  Scenario: C3_T6_Select_Search_Suggestion
    When user selects a search suggestion
    Then search should execute automatically
    And correct species results should be shown

  Scenario: C3_T7_Case_Insensitive_Search
    When user searches using mixed or uppercase characters
    Then search results should be returned correctly

  Scenario: C3_T8_Search_By_Common_Name
    When user searches using a common species name
    Then species mapped to that common name should appear

  Scenario: C3_T9_Search_By_Scientific_Name
    When user searches using a scientific name
    Then correct scientific species record should be displayed

  Scenario: C3_T10_Search_No_Results_State
    When user searches with an invalid keyword
    Then no results found message should be displayed

  Scenario: C3_T11_Clear_Search_Input
    When user clears the search input
    Then default Home screen state should be restored

  Scenario: C3_T12_Search_Persistence_On_Back_Navigation
    Given user has performed a search
    When user navigates back from species detail page
    Then previous search query and results should persist

  Scenario: C3_T13_Search_With_Active_Filters
    Given filters are applied
    When user performs a search
    Then search results should respect both search and filters

  Scenario: C3_T14_Search_Reset_On_Filter_Clear
    Given search is performed with filters
    When user clears all filters
    Then results should reflect search term only

  Scenario: C3_T15_Search_Performance_Offline
    Given internet connection is disabled
    When user searches using cached data
    Then results should be displayed successfully

  Scenario: C3_T16_Search_With_Large_Dataset
    Given application has large species dataset
    When user performs multiple searches rapidly
    Then app should not lag or crash

  Scenario: C3_T17_Search_Language_Consistency
    Given app language is changed
    When user performs a search
    Then results should match selected language

  Scenario: C3_T18_Invalid_Character_Input_Handling
    When user enters special characters in search field
    Then application should handle input gracefully

  Scenario: C3_T19_Search_Field_Accessibility
    Then search field should meet accessibility standards

  Scenario: C3_T20_Search_Regression_Check
    When search functionality is executed after new build
    Then all core search flows should work correctly

