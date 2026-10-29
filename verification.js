
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const SESSION_KEY = "TIT_DEMO_SESSION";
  const CANDIDATES_KEY = "TIT_CANDIDATES";

  const loadingMessage = document.getElementById("loadingMessage");
  const candidateDetails = document.getElementById("candidateDetails");
  const accessError = document.getElementById("accessError");
  const verificationForm = document.getElementById("verificationForm");
  const confirmCheckbox = document.getElementById("confirmDetails");
  const continueButton = document.getElementById("continueButton");
  const verificationError = document.getElementById("verificationError");

  document.getElementById("currentYear").textContent =
    String(new Date().getFullYear());

  // Show an error without interpreting text as HTML.
  function showError(message) {
    verificationError.textContent = message;
    verificationError.hidden = false;
  }

  function hideError() {
    verificationError.textContent = "";
    verificationError.hidden = true;
  }

  // Convert YYYY-MM-DD to DD-MM-YYYY for display.
  function formatDate(dateValue) {
    if (typeof dateValue !== "string") {
      return "Not available";
    }

    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return "Not available";
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    // Reject invalid dates such as 2026-02-31.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "Not available";
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  // Render all candidate data as text, never as HTML.
  function setText(id, value) {
    const element = document.getElementById(id);

    element.textContent =
      typeof value === "string" && value.trim()
        ? value.trim()
        : "Not available";
  }

  function showAccessError() {
    loadingMessage.hidden = true;
    candidateDetails.hidden = true;
    accessError.hidden = false;
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  let candidate = null;

  try {
    // The login page must have set this session marker.
    const sessionRegistrationNumber =
      sessionStorage.getItem(SESSION_KEY);

    if (!sessionRegistrationNumber) {
      redirectToLogin();
      return;
    }

    const storedCandidates = localStorage.getItem(CANDIDATES_KEY);

    if (!storedCandidates) {
      showAccessError();
      return;
    }

    const candidates = JSON.parse(storedCandidates);

    if (!Array.isArray(candidates)) {
      showAccessError();
      return;
    }

    // Match the logged-in registration number to a registered candidate.
    candidate = candidates.find(function (item) {
      return (
        item &&
        typeof item.registrationNumber === "string" &&
        item.registrationNumber === sessionRegistrationNumber
      );
    });

    if (!candidate) {
      sessionStorage.removeItem(SESSION_KEY);
      showAccessError();
      return;
    }

    // Display candidate information safely.
    setText("candidateName", candidate.candidateName);
    setText("fatherName", candidate.fatherName);
    setText("candidateClass", candidate.candidateClass);
    setText("candidateDob", formatDate(candidate.dob));
    setText("registrationNumber", candidate.registrationNumber);

    loadingMessage.hidden = true;
    accessError.hidden = true;
    candidateDetails.hidden = false;

  } catch (error) {
    console.error("Candidate verification could not be completed.");

    showAccessError();
    return;
  }

  // Continue remains disabled until the checkbox is selected.
  confirmCheckbox.addEventListener("change", function () {
    continueButton.disabled = !confirmCheckbox.checked;
    hideError();
  });

  verificationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    hideError();

    // Require explicit confirmation.
    if (!confirmCheckbox.checked) {
      continueButton.disabled = true;
      showError("Please confirm your candidate details before continuing.");
      return;
    }

    // Recheck the session and candidate record before proceeding.
    try {
      const currentSession = sessionStorage.getItem(SESSION_KEY);
      const latestCandidates = JSON.parse(
        localStorage.getItem(CANDIDATES_KEY) || "[]"
      );

      const candidateStillExists =
        Array.isArray(latestCandidates) &&
        latestCandidates.some(function (item) {
          return (
            item &&
            item.registrationNumber === currentSession &&
            item.registrationNumber === candidate.registrationNumber
          );
        });

      if (!currentSession || !candidateStillExists) {
        showError("Your session or registration could not be verified. Please log in again.");
        continueButton.disabled = true;
        return;
      }

      // Keep the existing login session for the next demo page.
      // The instructions page will be created in the next step.
      window.location.href = "instructions.html";

    } catch (error) {
      console.error("Unable to recheck candidate registration.");
      showError("Unable to verify your details. Please log in again.");
    }
  });
});
