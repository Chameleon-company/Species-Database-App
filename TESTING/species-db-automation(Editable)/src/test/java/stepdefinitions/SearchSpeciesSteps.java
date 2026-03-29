package stepdefinitions;

import io.cucumber.java.en.*;
import pages.HomePage;
import utils.DriverManager;


public class SearchSpeciesSteps {

    HomePage homePage = new HomePage(DriverManager.getDriver());

    @When("user enters {string} in search bar")
    public void user_enters_species(String keyword) {
        homePage.searchSpecies(keyword);
    }

    @Then("matching species results should be displayed")
    public void matching_species_results_should_be_displayed() {
        homePage.verifySearchResults();
    }
}
