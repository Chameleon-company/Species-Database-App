const isAdminLoginPage = window.location.pathname.includes("login-admin.html");
const isTetumLoginPage = window.location.pathname.includes("tetum");

//Remembers "Continue as Guest" so the next launch opens the species list (cleared by Sign out)
const GUEST_FLAG_KEY = "guest";

//How long a sign-in request may take before we give up
const LOGIN_TIMEOUT_MS = 20000;

//Messages shown on the login pages. Tetum only where a reviewed string exists
//(packages/i18n/messages/tet.json); the rest stays English until translated.
const LOGIN_TEXT = {
  required: "Username and password required.",
  invalid: "Incorrect username or password.",
  disabled: "This account is disabled. Please contact your administrator.",
  tooMany: "Too many sign-in attempts. Please wait a few minutes and try again.",
  failed: "Sign-in failed. Please try again.",
  server: isTetumLoginPage ? "Iha problema. Favor tenta fali." : "Server error, please try again later.",
  network: isTetumLoginPage
    ? "La bele kontaktu servidor. Verifika ita-boot nia koneksaun no tenta fali."
    : "Cannot connect to server. Check your connection and try again.",
  timeout: isTetumLoginPage
    ? "La bele kontaktu servidor. Verifika ita-boot nia koneksaun no tenta fali."
    : "The server is taking too long to respond. Please try again.",
  signingIn: isTetumLoginPage ? "Hein hela..." : "Signing in...",
};

const ADMIN_DASHBOARD_URLS = {
  dev: "http://localhost:5173",
  prod: "https://species-database-app-123.onrender.com/",
};

function getAdminDashboardUrl() {
  //Same test as scripts/config.js: the Android app runs at https://localhost, which is not a dev server
  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
  const isLocalHost =
    !isNative &&
    window.location.protocol === "http:" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  return isLocalHost ? ADMIN_DASHBOARD_URLS.dev : ADMIN_DASHBOARD_URLS.prod;
}

//Reads a fetch response as JSON only when the server says it is JSON (a proxy or
//error page can send HTML). Returns null when there is no usable JSON body.
async function readJsonBody(res) {
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return await res.json();
  } catch (err) {
    console.warn("[Login] Response is not valid JSON", err);
    return null;
  }
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
  const isGuest = localStorage.getItem(GUEST_FLAG_KEY) === "1"

  //only the admin sign-in page forwards admins; the field sign-in and guest pages stay reachable
  if (isAdminLoginPage && role === "admin" && adminToken) {
    window.location.replace(getAdminDashboardUrl())
    return
  }

  //the admin sign-in page stays reachable for field users and guests
  if (isAdminLoginPage) return

  if(userId || isGuest)
  {
    const lang = localStorage.getItem("appLanguage") || "en"
    window.location.replace(lang === "tet" ? "tetum.html" : "home.html")
  }

})()

document.addEventListener("DOMContentLoaded", () => {
  //login only displayed if user not already logged in
  document.body.style.display = "block"
  document.body.classList.add("loaded");

  //Google sign-in only exists on pages with a #googleBtn (they load the GSI script)
  if (document.getElementById("googleBtn")) {
    const interval = setInterval(() => {
      if(window.google?.accounts?.id)
      {
        clearInterval(interval)
        initGoogle()
      }
    }, 50)
  }

  document.getElementById("guestBtn")?.addEventListener("click", () => {
    console.log("Guest sign-up clicked");
    localStorage.setItem(GUEST_FLAG_KEY, "1");
    // replace: back from the species list should not return to the login page
    if (localStorage.getItem("appLanguage") == "tet") {
      window.location.replace("tetum.html"); //  redirect to tetum page
    } else {
      window.location.replace("home.html"); //  redirect to home page
    }
  });

  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const errorBox = document.getElementById("loginError")
  const signInBtn = document.getElementById("emailContinueBtn")
  const loginEndpoint = isAdminLoginPage
    ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.adminLogin || "/api/auth/admin-login"}`
    : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.login}`;

  let signingIn = false

  function showError(message) {
    errorBox.textContent = message
    errorBox.style.display = "block"
  }

  //Message for a failed (non-2xx) answer, chosen from the status code. The server's own
  //text is English and technical, so it only goes to the console.
  function messageForStatus(status) {
    if (status === 400) return LOGIN_TEXT.required
    if (status === 401) return LOGIN_TEXT.invalid
    if (status === 403) return isAdminLoginPage ? LOGIN_TEXT.failed : LOGIN_TEXT.disabled //admin 403 can also mean "not an admin"
    if (status === 429) return LOGIN_TEXT.tooMany
    if (status >= 500) return `${LOGIN_TEXT.server} (${status})`
    return LOGIN_TEXT.failed
  }

  signInBtn?.addEventListener("click", async () => {
    if (signingIn) return //a request is already running

    const name = usernameInput.value.trim();
    const password = passwordInput.value;

      errorBox.style.display = "none"

    if (!name || !password) {
      showError(LOGIN_TEXT.required)
      return
    }

    signingIn = true
    const buttonLabel = signInBtn.textContent
    signInBtn.disabled = true
    signInBtn.textContent = LOGIN_TEXT.signingIn

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

    try {
      let res
      try {
        res = await fetch(loginEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password }),
          signal: controller.signal,
        })
      }
      catch (err)
      {
        //only a real network failure or our timeout ends up here
        console.error("[Login] Request failed:", err)
        showError(err?.name === "AbortError" ? LOGIN_TEXT.timeout : LOGIN_TEXT.network)
        return
      }

      const data = await readJsonBody(res)

      if(!res.ok)
      {
        console.warn("[Login] Sign-in refused:", res.status, data?.error)
        //a non-JSON answer did not come from the API (proxy or error page): treat it as a server error
        showError((data || res.status >= 500) ? messageForStatus(res.status) : `${LOGIN_TEXT.server} (${res.status})`)
        return
      }

      const loginOk = isAdminLoginPage ? data?.access_token : data?.user_id
      if (!loginOk) {
        //a 2xx answer without the expected JSON (for example a captive portal page)
        console.warn("[Login] Unexpected response:", res.status, res.headers.get("content-type"))
        showError(`${LOGIN_TEXT.server} (${res.status})`)
        return
      }

      if (isAdminLoginPage) {
        localStorage.removeItem("user_id")
        localStorage.setItem("admin_token", data.access_token)
        localStorage.setItem("role", "admin")
      } else {
        //storing user locally
        localStorage.setItem("user_id", data.user_id)
        localStorage.setItem("role", data.role)
        localStorage.removeItem(GUEST_FLAG_KEY)
        localStorage.removeItem("admin_token") //an old admin token must not send a field sign-in to the dashboard
      }


      redirectPostLogin();
    }
    catch (err)
    {
      console.error("[Login] Unexpected error:", err)
      showError(LOGIN_TEXT.failed)
    }
    finally
    {
      clearTimeout(timer)
      signingIn = false
      signInBtn.disabled = false
      signInBtn.textContent = buttonLabel
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

    const data = await readJsonBody(fetchRes)

    if(!fetchRes.ok || !data?.access_token)
    {
      console.warn("[Login] Google admin sign-in refused:", fetchRes.status, data?.error)
      alert("admin login failed")
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
