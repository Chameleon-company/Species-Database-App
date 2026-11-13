package stepdefinitions;

import org.junit.Assert;
import io.cucumber.java.en.Then;
import pages.HomePage;
import utils.DriverManager;

public class HomeScreenSteps {


    HomePage homePage = new HomePage(DriverManager.getDriver());

    @Then("Home screen should be visible")
    public void home_screen_should_be_visible() {
        homePage.verifyHomeLoaded();
    }
}
