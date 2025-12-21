    document.addEventListener("DOMContentLoaded", () => {
      document.body.classList.add("loaded");
    });

    document.getElementById("googleBtn").addEventListener("click", () => {
      console.log("Google sign-up clicked");
    });

    document.getElementById("facebookBtn").addEventListener("click", () => {
      console.log("Facebook sign-up clicked");
    });

    const emailInput = document.querySelector(".email-input");

    document.getElementById("emailContinueBtn").addEventListener("click", () => {
      const email = emailInput.value.trim();

      if (!email) {
        alert("Please enter your email.");
        emailInput.focus();
        return;
      }

      if (!emailInput.checkValidity()) {
        alert("Please enter a valid email address.");
        emailInput.focus();
        return;
      }

      console.log("Continue with Email:", email);
      // window.location.href = "signup-email.html"; // example redirect
    });

    document.getElementById("signInLink").addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Go to Sign In screen");
    });