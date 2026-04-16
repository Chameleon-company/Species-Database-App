Feature: Category 14 - Compare Species
  As a user
  I want to compare multiple species side by side
  So that I can make informed identification and selection decisions

  @C14_T1
  Scenario: Compare feature entry visibility
    Given user is on Home or Results screen
    Then Compare Species option should be visible and enabled
    And compare feature should be accessible offline

  @C14_T2
  Scenario: Select species for comparison
    When user selects first species for comparison
    And user selects second species for comparison
    Then selection indicators should be displayed correctly
    And selection count should update accurately

  @C14_T3
  Scenario: Minimum selection validation
    Given user selects only one species
    When user initiates comparison
    Then minimum selection validation message should be shown
    And comparison view should not open

  @C14_T4
  Scenario: Maximum selection limit
    Given user selects maximum allowed species
    When user selects one more species
    Then selection should be restricted
    And informative message should be displayed

  @C14_T5
  Scenario: Launch comparison view
    Given valid species are selected for comparison
    When user taps Compare action
    Then comparison view should open successfully
    And selected species should be displayed side by side

  @C14_T6
  Scenario: Comparison attributes display
    Then all key comparison attributes should be displayed
    And attribute labels should be consistent across species

  @C14_T7
  Scenario: Data accuracy in comparison
    When user compares species attributes
    Then comparison data should match Species Detail pages
    And no data mixing should occur

  @C14_T8
  Scenario: Scroll behavior in comparison view
    When user scrolls vertically in comparison view
    Then scrolling should be smooth
    And column alignment should remain intact

  @C14_T9
  Scenario: Horizontal scroll if applicable
    When comparison exceeds screen width
    Then horizontal scrolling should work correctly
    And no column misalignment should occur

  @C14_T10
  Scenario: Navigate from comparison to Species Detail
    When user opens Species Detail from comparison view
    Then correct Species Detail page should open
    And back navigation should return to comparison view

  @C14_T11
  Scenario: Offline comparison functionality
    Given internet connection is disabled
    When user compares cached species
    Then comparison should work correctly offline

  @C14_T12
  Scenario: Partial offline data handling
    Given internet connection is disabled
    When comparison data is partially available
    Then available attributes should be shown
    And missing data should be indicated clearly

  @C14_T13
  Scenario: Language consistency in comparison
    Given app language is changed
    When user opens comparison view
    Then all comparison labels should update to selected language

  @C14_T14
  Scenario: Comparison state persistence
    Given comparison view is open
    When app is minimized and restored
    Then comparison state should be preserved

  @C14_T15
  Scenario: Comparison on low-end device
    Given user is on a low-end device
    When user compares multiple species
    Then app should remain responsive

  @C14_T16
  Scenario: Remove species from comparison
    Given comparison view is open
    When user removes a species
    Then comparison view should update correctly

  @C14_T17
  Scenario: Clear all comparison selection
    When user clears all comparison selections
    Then all selections should be removed
    And user should return to previous screen

  @C14_T18
  Scenario: Invalid comparison data handling
    When comparison data is invalid or malformed
    Then graceful fallback or error message should be shown

  @C14_T19
  Scenario: Comparison accessibility basics
    Then comparison view should be accessible and readable

  @C14_T20
  Scenario: Comparison regression check
    When comparison scenarios are executed on new build
    Then no regression issues should be observed
    And story should be ready for sprint sign-off

