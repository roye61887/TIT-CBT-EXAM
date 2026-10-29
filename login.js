
"use strict";

/*
 * TIT CBT Candidate Login
 *
 * DEMO ONLY:
 * Browser localStorage is not secure authentication.
 * Production deployment requires a secure backend.
 */

const loginForm = document.getElementById("loginForm");
const registrationNumberInput =
    document.getElementById("registrationNumber");
const loginDOBInput = document.getElementById("loginDOB");

const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const toggleDOB = document.getElementById("toggleDOB");

/* Normalize registration number to uppercase. */
registrationNumberInput.addEventListener("input", function () {
    registrationNumberInput.value =
        registrationNumberInput.value.trim().toUpperCase();
});

/* Accept DD-MM-YYYY while typing. */
loginDOBInput.addEventListener("input", function () {
    let digits = loginDOBInput.value.replace(/\D/g, "").slice(0, 8);

    if (digits.length > 4) {
        digits =
            digits.slice(0, 2) + "-" +
            digits.slice(2, 4) + "-" +
            digits.slice(4);
    } else if (digits.length > 2) {
        digits =
            digits.slice(0, 2) + "-" +
            digits.slice(2);
    }

    loginDOBInput.value = digits;
});

/* Show or hide the date of birth. */
toggleDOB.addEventListener("click", function () {
    const currentlyHidden = loginDOBInput.type === "password";

    loginDOBInput.type = currentlyHidden ? "text" : "password";
    toggleDOB.textContent = currentlyHidden ? "HIDE" : "SHOW";
});

/* Display login errors. */
function displayLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
}

/* Validate a date in DD-MM-YYYY format. */
function parseDOB(value) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);

    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    if (date > new Date()) {
        return null;
    }

    return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0")
    ].join("-");
}

/* Read demo candidate data. */
function getRegisteredCandidates() {
    const saved = localStorage.getItem("TIT_CANDIDATES");

    if (!saved) {
        return [];
    }

    const candidates = JSON.parse(saved);

    if (!Array.isArray(candidates)) {
        throw new Error("Invalid candidate data.");
    }

    return candidates;
}

/* Handle sign-in. */
loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    loginError.hidden = true;
    loginError.textContent = "";

    const registrationNumber =
        registrationNumberInput.value.trim().toUpperCase();

    const dob = parseDOB(loginDOBInput.value.trim());

    if (!registrationNumber) {
        displayLoginError("Please enter your registration number.");
        return;
    }

    if (!dob) {
        displayLoginError(
            "Enter a valid date of birth in DD-MM-YYYY format."
        );
        loginDOBInput.focus();
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "VERIFYING...";

    try {
        const candidates = getRegisteredCandidates();

        const candidate = candidates.find(function (item) {
            return item.registrationNumber === registrationNumber;
        });

        /*
         * Same error for an unknown registration number and
         * a mismatched date of birth.
         */
        if (!candidate || candidate.dob !== dob) {
            displayLoginError(
                "Invalid registration number or date of birth. " +
                "Please check your details and try again."
            );
            return;
        }

        /*
         * This is only a demo browser session marker.
         * It is NOT a secure authentication token.
         */
        sessionStorage.setItem(
            "TIT_DEMO_SESSION",
            candidate.registrationNumber
        );

        window.location.href = "verification.html";

    } catch (error) {
        displayLoginError(
            "Unable to verify your login. " +
            "Please check the registration data and try again."
        );
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "SIGN IN TO CBT →";
    }
});
