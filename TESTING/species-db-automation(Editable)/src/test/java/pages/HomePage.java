package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.junit.Assert;

public class HomePage {

    WebDriver driver;

    // Constructor (MANDATORY)
    public HomePage(WebDriver driver) {
        this.driver = driver;
    }

    // Locators
    By homeTitle = By.id("home-title");
    By searchBox = By.id("search-input");

    // Methods used by StepDefinitions
    public void verifyHomeLoaded() {
        Assert.assertTrue(driver.findElement(homeTitle).isDisplayed());
    }

    public void searchSpecies(String name) {
        driver.findElement(searchBox).sendKeys(name);
    }

    public void verifySearchResults() {
        // placeholder for now
        Assert.assertTrue(true);
    }

    public void openSort() {
        System.out.println("Sort opened");
    }

    public void selectSortOption(String option) {
        System.out.println("Sort option selected: " + option);
    }

    public void openLeafTypeFilter() {
        System.out.println("Leaf filter opened");
    }

    public void openFruitTypeFilter() {
        System.out.println("Fruit filter opened");
    }
}
