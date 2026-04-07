package stepdefinitions;

import io.cucumber.java.en.Given;

public class CommonNetworkSteps {

    @Given("internet is disabled")
    public void internet_is_disabled() {
        System.out.println("Internet disabled (mock)");
    }
}
