package stepdefinitions;

import io.cucumber.java.en.*;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import org.testng.Assert;
import utils.DriverFactory;

import java.time.Duration;
import java.util.List;

public class HomeSteps {

    WebDriver driver = DriverFactory.getDriver();
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

    @Given("user is on Home page")
    public void user_is_on_home_page() {
        driver.get("http://localhost:5500/Frontend/home.html");
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.id("filter-carousel")));
    }

    // ---------------- FILTER BAR ----------------

    @When("user clicks on {string}")
    public void user_clicks_on(String filter) {

        String dataFilter = switch (filter) {
            case "A-Z" -> "a-z";
            case "Leaf Type" -> "leaf-type";
            case "Fruit Type" -> "fruit-type";
            default -> throw new RuntimeException("Unknown filter: " + filter);
        };

        driver.findElement(By.xpath(
                "//button[@class='filter-button' and @data-filter='" + dataFilter + "']"
        )).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.className("filter-modal")));
    }

    // ---------------- MODAL OPTIONS ----------------

    @And("user selects option {string}")
    public void user_selects_option(String option) {
        WebElement optionBtn = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//button[@class='placeholder-option' and normalize-space()='" + option + "']")
        ));
        optionBtn.click();

        // Wait for modal to disappear
        wait.until(ExpectedConditions.invisibilityOfElementLocated(
                By.className("filter-modal")));

        // Wait for plant list to refresh
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//h3")));
    }

    // ---------------- ASSERTIONS ----------------

    @Then("first plant name should be {string}")
    public void first_plant_name_should_be(String expected) {

        // Get FIRST visible plant name
        List<WebElement> plantNames = driver.findElements(By.xpath("//h3"));

        Assert.assertFalse(plantNames.isEmpty(), "No plants found on page");

        String actual = plantNames.get(0).getText().trim();

        Assert.assertEquals(actual, expected,
                "Incorrect plant shown after filter");
    }

    @Then("{string} should be active filter")
    public void tab_should_be_active(String filter) {
        WebElement active = driver.findElement(
                By.cssSelector(".filter-button.active"));
        Assert.assertEquals(active.getText().trim(), filter);
    }

    // ---------------- SPECIES PAGE ----------------

    @When("user clicks on first plant")
    public void user_clicks_on_first_plant() {

        WebElement firstPlant = wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("//h3")));

        firstPlant.click();
    }

    @Then("species page should open")
    public void species_page_should_open() {

        // Wait for navigation to species detail page
        wait.until(ExpectedConditions.urlContains("specie.html"));

        String currentUrl = driver.getCurrentUrl();

        Assert.assertTrue(
                currentUrl.contains("specie.html"),
                "Species detail page did not open. Current URL: " + currentUrl
        );

        // Optional: validate species name heading is visible
        WebElement speciesName = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.tagName("h3"))
        );

        Assert.assertTrue(speciesName.isDisplayed(),
                "Species name is not visible on detail page");
    }

}
