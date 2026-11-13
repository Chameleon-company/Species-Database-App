const isAdminLoginPage = window.location.pathname.includes("login-admin.html");

const ADMIN_DASHBOARD_URLS = {
  dev: "http://localhost:5173",
  prod: "https://species-database-app-123.onrender.com/",
};

function getAdminDashboardUrl() {
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return isLocalHost ? ADMIN_DASHBOARD_URLS.dev : ADMIN_DASHBOARD_URLS.prod;
}

function initGoogle()
{
  const buttonWidth = Math.min(360, Math.max(280, window.innerWidth - 80));

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
      width: buttonWidth,
    })
  }
}
function redirectPostLogin() {
  const role = localStorage.getItem("role");

  if (role === "admin" && localStorage.getItem("admin_token")) {
    window.location.replace(getAdminDashboardUrl());
    return;
  }

  const lang = localStorage.getItem("appLanguage") || "en";

  if (lang === "tet") {
    window.location.replace("tetum.html");
  } else {
    window.location.replace("home.html");
  }
}

//need to make sure user cant go back tologin adn wont be prompted if they are already logged in
(function checkExistingLogin() {
  const userId = localStorage.getItem("user_id")
  const role = localStorage.getItem("role")
  const adminToken = localStorage.getItem("admin_token")

  if (role === "admin" && adminToken) {
    window.location.replace(getAdminDashboardUrl())
    return
  }

  if(userId)
  {
    const lang = localStorage.getItem("appLanguage") || "en"
    window.location.replace(lang === "tet" ? "tetum.html" : "home.html")
  }

})

document.addEventListener("DOMContentLoaded", () => {
  //login only displayed if user not already logged in
  document.body.style.display = "block"
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
  const loginEndpoint = isAdminLoginPage
    ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminLogin || "/api/auth/admin-login"}`
    : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.login}`;


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
      const res = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password })
      })

      const data = await res.json()

      if(!res.ok)
      {
        errorBox.textContent = data.error || "Login failed"
        errorBox.style.display = "block"
        return
      }

      console.log("LOGIN SUCCESS:", data)

      if (isAdminLoginPage) {
        localStorage.removeItem("user_id")
        localStorage.setItem("admin_token", data.access_token)
        localStorage.setItem("role", "admin")
      } else {
        //storing user locally
        localStorage.setItem("user_id", data.user_id)
        localStorage.setItem("role", data.role)
      }


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

    const fetchRes = await fetch(`${API_CONFIG.baseUrl}/api/auth/google-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({id_token: res.credential})
    })

    const data = await fetchRes.json()

    if(!fetchRes.ok)
    {
      alert(data.error || "admin login failed")
      return
    }
    localStorage.setItem("admin_token", data.access_token)
    localStorage.setItem("role", "admin")
    localStorage.removeItem("user_id")

    console.log("admin login success")

    window.location.replace(getAdminDashboardUrl())

  }
  catch(err){
    console.error(err)
    alert("google login failed")
  }    
}
