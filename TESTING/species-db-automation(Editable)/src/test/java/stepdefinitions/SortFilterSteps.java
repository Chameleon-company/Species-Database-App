package stepdefinitions;

import io.cucumber.java.en.*;
import pages.HomePage;
import utils.DriverManager;


public class SortFilterSteps {

    HomePage homePage = new HomePage(DriverManager.getDriver());

    @When("user opens sort options")
    public void user_opens_sort_options() {
        homePage.openSort();
    }

    @When("selects {string}")
    public void selects_sort_option(String option) {
        homePage.selectSortOption(option);
    }

    @When("user opens Leaf Type filter")
    public void user_opens_leaf_type_filter() {
        homePage.openLeafTypeFilter();
    }

    @When("user opens Fruit Type filter")
    public void user_opens_fruit_type_filter() {
        homePage.openFruitTypeFilter();
    }
}
