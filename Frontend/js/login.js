function initGoogle()
{
  google.accounts.id.initialize({
    client_id: "1052574621817-njpilvbmv49riq322c9vdi02pibcbbvg.apps.googleusercontent.com",
    callback: handleGoogleResponse,
    ux_mode: "popup", ///sicne on mobile
  })

  const btn = document.getElementById("googleBtn")
  if(btn) {
    google.accounts.id.renderButton(btn, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360,
    })
  }
}
function redirectPostLogin() {
  const lang = localStorage.getItem("appLanguage") || "en";

  if (lang === "tet") {
    window.location.href = "tetum.html";
  } else {
    window.location.href = "home.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("loaded");

  const interval = setInterval(() => {
    if(window.google?.accounts?.id)
    {
      clearInterval(interval)
      initGoogle()
    }
  }, 50)

  document.getElementById("guestBtn")?.addEventListener("click", () => {
    console.log("Guest sign-up clicked");
    // Go to the language page
    if (localStorage.getItem("appLanguage") == "tet") {
      window.location.href = "tetum.html"; //  redirect to tetum page
    } else {
      window.location.href = "home.html"; //  redirect to home page
    }
  });

  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const errorBox = document.getElementById("loginError")


  document.getElementById("emailContinueBtn")?.addEventListener("click", async () => {
    const name = usernameInput.value.trim();
    const password = passwordInput.value;

      errorBox.style.display = "none"

    if (!name || !password) {
      errorBox.textContent = "Username and password required."
      errorBox.style.display = "block"
      return
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({name, password})
      })

      const data = await res.json()


      if(!res.ok)
      {
        errorBox.textContent = data.error || "Login failed"
        errorBox.style.display = "block"
        return
      }

      console.log("LOGIN SUCCESS:", data)

      //storing user locally
      localStorage.setItem("user_id", data.user_id)
      localStorage.setItem("role", data.role)


      console.log("Logged in as", data.role)

      redirectPostLogin();
    }
    catch (err)
    {
      console.error(err)
      errorBox.textContent = "Cannot connect to server."
      errorBox.style.display= "block"
    }
  });

});

async function handleGoogleResponse(res) {

  const errorBox = document.getElementById("loginError");
  if (errorBox) errorBox.style.display = "none";


  try {
    if(!res.credential)
    {
      throw new Error("no google credential returned")
    }

    const fetchRes = await fetch(
      "http://127.0.0.1:5000/api/auth/google-admin",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({id_token: res.credential})
      }
    )

    const data = await fetchRes.json()

    if(!fetchRes.ok)
    {
      alert(data.error || "admin login failed")
      return
    }
    localStorage.setItem("admin_token", data.access_token)
    localStorage.setItem("role", "admin")

    console.log("admin login success")

    window.location.href = "home.html"

  }
  catch(err){
    console.error(err)
    alert("google login failed")
  }    
}
