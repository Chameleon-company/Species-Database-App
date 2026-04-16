package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;
import org.junit.Assert;

import java.time.Duration;

public class LanguageSelectionPage {

    WebDriver driver;
    WebDriverWait wait;

    public LanguageSelectionPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    // 🔹 Screen title
    By languageTitle = By.xpath("//*[contains(text(),'Choose a Language')]");

    // 🔹 Radio buttons
    By englishRadio = By.xpath("//input[@type='radio' and @value='ENGLISH AU']");
    By tetumRadio   = By.xpath("//input[@type='radio' and @value='Tetum']");

    // 🔹 "You selected" text
    By selectedLanguageText = By.id("selected-language"); 
    // ⚠️ agar id different ho, bas bata dena

    // ---------- Actions ----------

    public void waitForLanguageScreen() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(languageTitle));
    }

    public void selectTetum() {
        wait.until(ExpectedConditions.elementToBeClickable(tetumRadio)).click();
    }

    // ---------- Verifications ----------

    public void verifySelectedLanguageText(String expectedLanguage) {
    WebElement selectedLang = wait.until(
            ExpectedConditions.visibilityOfElementLocated(selectedLanguageValue)
    );

    Assert.assertEquals(
            expectedLanguage,
            selectedLang.getText().trim()
    );
	}


    public void verifyTetumSelected() {
        Assert.assertTrue(driver.findElement(tetumRadio).isSelected());
    }

    public void verifyEnglishAUUnselected() {
        Assert.assertFalse(driver.findElement(englishRadio).isSelected());
    }

    // (from Test Case-1, still valid)
    public void verifyEnglishAUSelected() {
        Assert.assertTrue(driver.findElement(englishRadio).isSelected());
    }

    public void verifyTetumUnselected() {
        Assert.assertFalse(driver.findElement(tetumRadio).isSelected());
    }
}
