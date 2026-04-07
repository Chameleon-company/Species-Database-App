package stepdefinitions;

import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.testng.Assert;
import utils.DriverFactory;

public class LanguageSteps {

    WebDriver driver = DriverFactory.getDriver();

    // Launch app (NO zoom, NO hacks)
    @Given("the application is launched")
    public void the_application_is_launched() {
        driver.get("http://localhost:5500/Frontend/");
    }

    // Single, clean language selection step
    @When("user selects {string}")
    public void user_selects_language(String language) {
        WebElement languageRow = driver.findElement(
                By.xpath("//div[@id='langList']//div[contains(@class,'row')][.//div[text()='" + language + "']]")
        );
        languageRow.click();
    }

    // Continue button
    @And("user clicks on Continue")
    public void user_clicks_on_continue() {
        driver.findElement(By.id("continueBtn")).click();
    }

    // Verify You Selected section
    @Then("{string} should be selected in You Selected section")
    public void language_should_be_selected_in_you_selected_section(String expectedLanguage) {
        String actual = driver.findElement(By.id("selectedName")).getText();
        Assert.assertEquals(actual, expectedLanguage, "Wrong language in You Selected section");
    }

    // Verify selected in All Languages
    @Then("{string} should be selected in All Languages section")
    public void language_should_be_selected_in_all_languages_section(String language) {
        WebElement row = driver.findElement(
                By.xpath("//div[@id='langList']//div[contains(@class,'row selected')][.//div[text()='" + language + "']]")
        );
        Assert.assertTrue(row.isDisplayed(), "Language is not selected in All Languages");
    }

    // Verify unselected in All Languages
    @Then("{string} should be unselected in All Languages section")
    public void language_should_be_unselected_in_all_languages_section(String language) {
        WebElement row = driver.findElement(
                By.xpath("//div[@id='langList']//div[contains(@class,'row')][.//div[text()='" + language + "']]")
        );

        String ariaSelected = row.getAttribute("aria-selected");
        Assert.assertEquals(ariaSelected, "false", "Language is still selected");
    }
}
