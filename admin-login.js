
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("loginMessage");

  // DEMO ONLY — not suitable for production authentication.
  const DEMO_USERNAME = "admin";
  const DEMO_PASSWORD = "TIT@2026";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    message.hidden = true;
    message.textContent = "";

    const username =
      document.getElementById("adminUsername").value.trim();

    const password =
      document.getElementById("adminPassword").value;

    if (
      username === DEMO_USERNAME &&
      password === DEMO_PASSWORD
    ) {
      sessionStorage.setItem("TIT_ADMIN_DEMO_SESSION", "active");
      window.location.href = "admin-dashboard.html";
      return;
    }

    message.textContent = "Incorrect username or password. Please try again.";
    message.hidden = false;
  });
});
