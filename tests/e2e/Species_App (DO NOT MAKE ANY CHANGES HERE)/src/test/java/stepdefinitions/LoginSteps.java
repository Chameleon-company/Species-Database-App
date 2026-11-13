package stepdefinitions;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.testng.Assert;
import utils.DriverFactory;

public class LoginSteps {

    WebDriver driver = DriverFactory.getDriver();

    // ✅ Correct & stable validation
    @Then("Login page is displayed")
    public void login_page_is_displayed() {
        Assert.assertTrue(
                driver.getCurrentUrl().contains("login.html"),
                "Login page did not load"
        );
    }

    // ✅ Handle Continue as Guest properly
    @When("the user clicks on {string}")
    public void the_user_clicks_on(String buttonText) {

        if (buttonText.equalsIgnoreCase("Continue as Guest")) {
            driver.findElement(By.id("guestBtn")).click();
            return;
        }

        // ❌ All other buttons are intentionally NOT interactable
        Assert.fail(buttonText + " is not interactable in current UI implementation");
    }

    // ❌ Expected failures (assignment-valid)
    @When("the user clicks on {string} without entering email")
    public void the_user_clicks_on_without_entering_email(String buttonText) {
        Assert.fail("Email flow not implemented yet");
    }

    @When("the user enters email")
    public void the_user_enters_email() {
        Assert.fail("Email input not implemented yet");
    }

    @Then("Registration page should open")
    public void registration_page_should_open() {
        Assert.fail("Registration not implemented");
    }

    @Then("an error dialog should be displayed")
    public void an_error_dialog_should_be_displayed() {
        Assert.fail("Error dialog not implemented");
    }

    @Then("password field should be displayed")
    public void password_field_should_be_displayed() {
        Assert.fail("Password field not implemented");
    }

    @Then("Google registration page should open")
    public void google_registration_page_should_open() {
        Assert.fail("Google auth not implemented");
    }

    // ✅ ONLY SUCCESS SCENARIO
    @Then("Home page should open")
    public void home_page_should_open() {
        Assert.assertEquals(
                driver.getCurrentUrl(),
                "http://localhost:5500/Frontend/home.html",
                "Home page did not open"
        );
    }
}
