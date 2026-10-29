
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const SESSION_KEY = "TIT_DEMO_SESSION";
  const CANDIDATES_KEY = "TIT_CANDIDATES";

  const loadingMessage = document.getElementById("loadingMessage");
  const instructionContent = document.getElementById("instructionContent");
  const accessError = document.getElementById("accessError");
  const instructionsForm = document.getElementById("instructionsForm");
  const acceptCheckbox = document.getElementById("acceptInstructions");
  const startButton = document.getElementById("startButton");
  const instructionError = document.getElementById("instructionError");

  document.getElementById("currentYear").textContent =
    String(new Date().getFullYear());

  function showError(message) {
    instructionError.textContent = message;
    instructionError.hidden = false;
  }

  function hideError() {
    instructionError.textContent = "";
    instructionError.hidden = true;
  }

  function setText(id, value) {
    document.getElementById(id).textContent =
      typeof value === "string" && value.trim()
        ? value.trim()
        : "Not available";
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  let candidate = null;

  try {
    const sessionRegistrationNumber =
      sessionStorage.getItem(SESSION_KEY);

    if (!sessionRegistrationNumber) {
      redirectToLogin();
      return;
    }

    const storedCandidates = localStorage.getItem(CANDIDATES_KEY);
    const candidates = JSON.parse(storedCandidates || "[]");

    if (!Array.isArray(candidates)) {
      throw new Error("Invalid candidate records.");
    }

    candidate = candidates.find(function (item) {
      return (
        item &&
        typeof item.registrationNumber === "string" &&
        item.registrationNumber === sessionRegistrationNumber
      );
    });

    if (!candidate) {
      sessionStorage.removeItem(SESSION_KEY);
      redirectToLogin();
      return;
    }

    setText("candidateName", candidate.candidateName);
    setText("registrationNumber", candidate.registrationNumber);

    loadingMessage.hidden = true;
    instructionContent.hidden = false;
    accessError.hidden = true;

  } catch (error) {
    console.error("Unable to verify the candidate session.");
    loadingMessage.hidden = true;
    accessError.hidden = false;
    return;
  }

  // The candidate must accept the instructions before starting.
  acceptCheckbox.addEventListener("change", function () {
    startButton.disabled = !acceptCheckbox.checked;
    hideError();
  });

  instructionsForm.addEventListener("submit", function (event) {
    event.preventDefault();
    hideError();

    if (!acceptCheckbox.checked) {
      startButton.disabled = true;
      showError("Please read and accept the instructions before starting.");
      return;
    }

    try {
      // Revalidate the login session and registration before continuing.
      const currentSession = sessionStorage.getItem(SESSION_KEY);
      const candidates = JSON.parse(
        localStorage.getItem(CANDIDATES_KEY) || "[]"
      );

      const validCandidate =
        currentSession &&
        currentSession === candidate.registrationNumber &&
        Array.isArray(candidates) &&
        candidates.some(function (item) {
          return (
            item &&
            item.registrationNumber === currentSession
          );
        });

      if (!validCandidate) {
        showError("Your candidate session is no longer valid. Please log in again.");
        startButton.disabled = true;
        return;
      }

      // Record that the candidate accepted the instructions.
      // The actual attempt and timer must be handled by exam.js.
      sessionStorage.setItem(
        "TIT_INSTRUCTIONS_ACCEPTED",
        currentSession
      );

      window.location.href = "exam.html";

    } catch (error) {
      console.error("Could not continue to the examination.");
      showError("Something went wrong. Please try logging in again.");
    }
  });
});
