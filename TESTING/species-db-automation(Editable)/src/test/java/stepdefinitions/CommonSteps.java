package stepdefinitions;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import utils.DriverManager;

public class CommonSteps {

    @Given("framework is initialized")
    public void framework_is_initialized() {

        DriverManager.getDriver().get("http://localhost:3000");

        System.out.println("Framework initialized and application launched");
    }

    @When("I execute cucumber tests")
    public void i_execute_cucumber_tests() {
        System.out.println("Executing cucumber test steps");
    }

    @Then("execution should complete successfully")
    public void execution_should_complete_successfully() {
        System.out.println("Execution completed successfully");
    }
}
