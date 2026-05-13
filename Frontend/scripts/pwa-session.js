/**
 * PWA field app: credentials live in localStorage (user_id, role).
 * Clears them and returns the user to the correct login screen.
 */
function pwaLoginUrl() {
  var lang = localStorage.getItem("appLanguage") || "en";
  return lang === "tet" ? "login_tetum.html" : "login.html";
}

function clearPwaAuthStorage() {
  localStorage.removeItem("user_id");
  localStorage.removeItem("role");
  // Field login.js can store admin_token on Google path; clear so no auth remains.
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_role");
}

function performPwaLogout() {
  var adminTok = (localStorage.getItem("admin_token") || "").trim();
  var cfg = typeof window !== "undefined" ? window.API_CONFIG : null;
  var base = cfg && cfg.baseUrl ? String(cfg.baseUrl).replace(/\/$/, "") : "";

  function done() {
    clearPwaAuthStorage();
    window.location.replace(pwaLoginUrl());
  }

  if (adminTok && base) {
    fetch(base + "/api/auth/admin-logout", {
      method: "POST",
      headers: { Authorization: adminTok },
    })
      .catch(function () {})
      .finally(done);
    return;
  }

  done();
}
